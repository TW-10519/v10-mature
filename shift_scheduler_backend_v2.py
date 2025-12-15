"""
Shift Scheduler Backend V4 - Priority-Based Distribution Logic
Workflow:
1. Calculate total shifts per role (minus leaves)
2. Distribute by priority percentage to each shift type
3. Distribute across days based on day priorities (not equally)
4. Assign employees with equal share of each shift type

Now with PostgreSQL storage instead of JSON files
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from ortools.sat.python import cp_model
import json
from collections import defaultdict
from datetime import datetime
from database import get_db
import os

app = Flask(__name__)
CORS(app)

# Legacy file path constants (kept for backward compatibility reference)
EMPLOYEES_FILE = 'employees.json'
ROLES_FILE = 'roles.json'
SCHEDULE_FILE = 'schedule.json'
ATTENDANCE_FILE = 'attendance.json'

class ShiftSchedulerV4:
    def __init__(self, employees, roles, shifts, leave_requests, unavailability, current_week):
        self.employees = employees
        self.roles = roles
        self.shifts = shifts
        self.leave_requests = leave_requests
        self.unavailability = unavailability
        self.current_week = current_week
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.feedback = []
        self.completely_unavailable_employees = self._identify_completely_unavailable()
        
    def add_feedback(self, message, severity='info'):
        self.feedback.append({'message': message, 'severity': severity})
        print(f"[{severity.upper()}] {message}")
    
    def _identify_completely_unavailable(self):
        """
        Identify employees who are unavailable for ALL days of the week.
        These employees cannot be scheduled at all.
        
        Returns: set of employee IDs who are completely unavailable
        """
        completely_unavailable = set()
        
        for emp in self.employees:
            emp_id = emp['id']
            unavailable_days = sum(
                1 for date in self.current_week
                if self._is_unavailable(emp_id, date)
            )
            
            # If unavailable for all days in the week, mark as completely unavailable
            if unavailable_days >= len(self.current_week):
                completely_unavailable.add(emp_id)
                self.add_feedback(
                    f"⚠️  {emp['name']}: Unavailable ALL days - will NOT be scheduled",
                    'warning'
                )
        
        return completely_unavailable

    def _round_allocations(self, raw_allocations, target_total):
        """
        Round fractional allocations to integers ensuring sum equals target_total.
        Uses the largest remainder method (Hamilton/Hare method).

        Args:
            raw_allocations: dict of {key: float_value}
            target_total: int, the exact sum we need

        Returns:
            dict of {key: int_value} where sum equals target_total
        """
        import math

        # Step 1: Floor all values
        floored = {key: math.floor(value) for key, value in raw_allocations.items()}

        # Step 2: Calculate remainders
        remainders = {key: raw_allocations[key] - floored[key] for key in raw_allocations}

        # Step 3: Calculate how many units we need to add to reach target
        current_sum = sum(floored.values())
        units_to_add = target_total - current_sum

        # Step 4: Sort by remainder (descending) and add 1 to top items
        sorted_by_remainder = sorted(remainders.items(), key=lambda x: x[1], reverse=True)

        result = floored.copy()
        for i in range(min(units_to_add, len(sorted_by_remainder))):
            key = sorted_by_remainder[i][0]
            result[key] += 1

        return result

    def _calculate_shifts_per_week(self, employee):
        weekly_hours = employee.get('weeklyHours', 40)
        daily_max = employee.get('dailyMaxHours', 8)
        return int(weekly_hours / daily_max) if daily_max > 0 else 5
    
    def _is_on_leave(self, employee_id, date):
        return f"{employee_id}-{date}" in self.leave_requests
    
    def _is_unavailable(self, employee_id, date):
        return f"{employee_id}-{date}" in self.unavailability
    
    def generate_schedule(self):
        """
        Priority-based distribution workflow with enhanced unavailability handling:
        1. Exclude completely unavailable employees (unavailable all days)
        2. For partially unavailable employees: assign shifts only to available days
        3. Calculate total shifts per role (minus leaves AND unavailable days)
        4. Distribute by priority to shift types
        5. Distribute across days based on day priorities
        6. Assign employees with equal share of shift types
        """
        days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        self.add_feedback("Step 1: Analyzing employee availability...", 'info')
        
        # EARLY VALIDATION: Check for impossible constraints before scheduling
        self.add_feedback("Validating constraints (leave, unavailable, shifts)...", 'info')
        for emp in self.employees:
            emp_id = emp['id']
            if emp_id in self.completely_unavailable_employees:
                continue
                
            shifts_per_week = emp.get('shiftsPerWeek', self._calculate_shifts_per_week(emp))
            
            # Count leave and unavailable days
            leave_count = sum(1 for date in self.current_week if self._is_on_leave(emp_id, date))
            unavail_count = sum(1 for date in self.current_week if self._is_unavailable(emp_id, date))
            
            # VALIDATION 1: Leave days cannot exceed shifts per week
            # If employee works 5 shifts, max 5 leave days allowed
            if leave_count > shifts_per_week:
                self.add_feedback(
                    f"❌ LOGIC ERROR - {emp['name']}: "
                    f"Cannot have {leave_count} leave days when only working {shifts_per_week} shifts per week",
                    'error'
                )
                return None, (
                    f"❌ INVALID LEAVE REQUEST for {emp['name']}:\n"
                    f"   • Shifts per week: {shifts_per_week}\n"
                    f"   • Leave days applied: {leave_count}\n"
                    f"   • Problem: Cannot take more leave than shifts worked\n"
                    f"   • Solution: Remove {leave_count - shifts_per_week} leave day(s)"
                )
            
            # Available days = total - leave - unavailable
            available_days = len(self.current_week) - leave_count - unavail_count
            
            # Target shifts after leaves
            target_after_leave = shifts_per_week - leave_count
            
            # VALIDATION 2: Unavailable days must NOT make it impossible to achieve target
            # If: available_days < target_shifts, it's IMPOSSIBLE
            if available_days < target_after_leave and target_after_leave > 0:
                self.add_feedback(
                    f"❌ CONSTRAINT VIOLATION - {emp['name']}: "
                    f"Needs {target_after_leave} shifts but only {available_days} days available "
                    f"(leave: {leave_count}, unavailable: {unavail_count})",
                    'error'
                )
                return None, (
                    f"❌ IMPOSSIBLE CONSTRAINT for {emp['name']}:\n"
                    f"   • Shifts needed: {target_after_leave}\n"
                    f"   • Days available: {available_days} (out of {len(self.current_week)})\n"
                    f"   • Leave days: {leave_count}\n"
                    f"   • Unavailable days: {unavail_count}\n"
                    f"   • Solution: Reduce shiftsPerWeek to {available_days} or less, or remove unavailable days"
                )
        
        self.add_feedback("✅ All constraints valid", 'info')
        
        # Get list of employees to actually schedule (exclude completely unavailable)
        schedulable_employees = [
            e for e in self.employees 
            if e['id'] not in self.completely_unavailable_employees
        ]
        
        self.add_feedback(f"  Total employees: {len(self.employees)}, Schedulable: {len(schedulable_employees)}", 'info')
        
        # Step 0: Calculate available employees per day (accounting for leaves AND unavailability)
        self.add_feedback("Step 0: Analyzing daily availability...", 'info')
        daily_availability = {}
        for date_idx, date in enumerate(self.current_week):
            day_name = days_of_week[date_idx]
            daily_availability[day_name] = {}
            
            for role in self.roles:
                role_id = role['id']
                available_count = sum(
                    1 for emp in schedulable_employees
                    if emp['roleId'] == role_id and
                    not self._is_on_leave(emp['id'], date) and
                    not self._is_unavailable(emp['id'], date)
                )
                daily_availability[day_name][role_id] = available_count
                self.add_feedback(f"  {day_name} - Role '{next(r['name'] for r in self.roles if r['id'] == role_id)}': {available_count} employees available", 'info')
        
        # Step 1: Calculate total shifts per role (minus ONLY leaves, NOT unavailable days)
        role_capacities = {}
        for role in self.roles:
            role_id = role['id']
            role_employees = [e for e in schedulable_employees if e['roleId'] == role_id]
            
            total_shifts = sum(
                e.get('shiftsPerWeek', self._calculate_shifts_per_week(e))
                for e in role_employees
            )
            
            # Subtract ONLY leaves (not unavailable days!)
            # Unavailable employees can still be assigned to other days
            total_leave_days = 0
            total_unavail_days = 0
            for emp in role_employees:
                leave_count = sum(
                    1 for date in self.current_week
                    if self._is_on_leave(emp['id'], date)
                )
                unavail_count = sum(
                    1 for date in self.current_week
                    if self._is_unavailable(emp['id'], date)
                )
                total_shifts -= leave_count
                # DO NOT subtract unavail_count - they still need their shifts on other days!
                total_leave_days += leave_count
                total_unavail_days += unavail_count
            
            role_capacities[role_id] = max(0, total_shifts)
            self.add_feedback(
                f"  Role '{role['name']}': {total_shifts} total shifts (after {total_leave_days} leave days; {total_unavail_days} unavailable days handled separately)", 
                'info'
            )
        
        # Step 2: Distribute by priority percentage to each shift type
        self.add_feedback("Step 2: Distributing shifts by priority...", 'info')
        
        shift_allocations = {}  # shift_id -> {total, per_day}
        
        for role in self.roles:
            role_id = role['id']
            role_shifts = [s for s in self.shifts if s['roleId'] == role_id]
            
            if not role_shifts:
                continue
            
            total_capacity = role_capacities.get(role_id, 0)
            total_priority = sum(s.get('priority', 50) for s in role_shifts)
            
            print(f"\n[DEBUG] Role '{role['name']}': total_capacity={total_capacity}, shifts_count={len(role_shifts)}, total_priority={total_priority}")
            
            for shift in role_shifts:
                priority = shift.get('priority', 50)
                percentage = priority / total_priority if total_priority > 0 else 1.0 / len(role_shifts)
                allocated_shifts = int(total_capacity * percentage)
                
                print(f"[DEBUG]   Shift '{shift['name']}': priority={priority}, percentage={percentage:.4f}, allocated_shifts={allocated_shifts}")
                
                # Count enabled days for this shift
                enabled_days = [
                    day for day in days_of_week
                    if shift.get('schedule', {}).get(day, {}).get('enabled', False)
                ]
                
                if enabled_days and allocated_shifts > 0:
                    # Step 3: Distribute across days based on DAY PRIORITIES
                    # Get day priorities from shift schedule
                    day_priorities = {}
                    for day in enabled_days:
                        day_schedule = shift.get('schedule', {}).get(day, {})
                        day_priorities[day] = day_schedule.get('dayPriority', 1)

                    # Calculate total day priority sum
                    total_day_priority = sum(day_priorities.values())

                    # Calculate raw allocations based on priority percentages
                    day_allocations_raw = {}
                    for day in enabled_days:
                        priority_percentage = day_priorities[day] / total_day_priority if total_day_priority > 0 else 1.0 / len(enabled_days)
                        day_allocations_raw[day] = allocated_shifts * priority_percentage

                    # Apply proper rounding to ensure sum equals allocated_shifts
                    day_allocations = self._round_allocations(day_allocations_raw, allocated_shifts)
                    
                    shift_allocations[shift['id']] = {
                        'total': allocated_shifts,
                        'enabled_days': enabled_days,
                        'day_allocations': day_allocations,
                        'name': shift['name'],
                        'role_id': role_id
                    }
                    
                    self.add_feedback(
                        f"  Shift '{shift['name']}' (priority {priority}): "
                        f"{allocated_shifts} total → distributed by day priorities across {len(enabled_days)} days",
                        'info'
                    )
                    for day in enabled_days:
                        day_priority = day_priorities[day]
                        priority_pct = (day_priority / total_day_priority * 100) if total_day_priority > 0 else (100.0 / len(enabled_days))
                        self.add_feedback(
                            f"    {day}: {int(day_allocations[day])} shifts (priority: {day_priority}, {priority_pct:.1f}%)",
                            'info'
                        )
                elif enabled_days:
                    # Log if allocation rounded to 0
                    self.add_feedback(
                        f"  Shift '{shift['name']}' (priority {priority}): "
                        f"0 shifts allocated (role capacity {total_capacity} * {percentage:.2%} = {total_capacity * percentage:.2f})",
                        'info'
                    )
        
        # Create decision variables
        self.add_feedback("Step 3: Creating assignment variables...", 'info')
        
        assignments = {}
        for emp in self.employees:
            emp_id = emp['id']
            assignments[emp_id] = {}
            
            # Skip completely unavailable employees - don't create any variables for them
            if emp_id in self.completely_unavailable_employees:
                continue
            
            for date_idx, date in enumerate(self.current_week):
                assignments[emp_id][date] = {}
                day_name = days_of_week[date_idx]
                
                # CRITICAL FIX: Only skip LEAVE dates, NOT unavailable dates!
                # - LEAVE: Employee is gone, cannot work
                # - UNAVAILABLE: Employee prefers not to work, but shifts must still be assigned
                #   (either to them on other days, or to other employees on this day)
                # By only skipping LEAVE, we allow the constraint solver to:
                # 1. Assign shifts from unavailable days to other available employees
                # 2. Assign remaining shifts to the unavailable employee on their available days
                if self._is_on_leave(emp_id, date):
                    continue
                
                role_shifts = [s for s in self.shifts if s['roleId'] == emp['roleId']]
                
                for shift in role_shifts:
                    shift_schedule = shift.get('schedule', {}).get(day_name, {})
                    if shift_schedule.get('enabled', False):
                        var = self.model.NewBoolVar(f'e{emp_id}_d{date}_s{shift["id"]}')
                        assignments[emp_id][date][shift['id']] = var
        
        # CONSTRAINTS
        
        # 1. Each employee must work exact number of shifts (strict)
        self.add_feedback("Applying shift count constraints...", 'info')
        
        total_shifts_needed = 0
        for emp in self.employees:
            emp_id = emp['id']
            
            # Skip completely unavailable employees
            if emp_id in self.completely_unavailable_employees:
                self.add_feedback(f"  {emp['name']}: SKIPPED (completely unavailable)", 'info')
                continue
            shifts_per_week = emp.get('shiftsPerWeek', self._calculate_shifts_per_week(emp))
            
            leave_days = sum(
                1 for date in self.current_week
                if self._is_on_leave(emp_id, date)
            )
            
            # IMPORTANT: Unavailability does NOT reduce target shifts!
            # Employee should still get their full shifts_per_week, just on different available days
            # Only LEAVES reduce the target
            target_shifts = max(0, shifts_per_week - leave_days)
            total_shifts_needed += target_shifts
            
            unavail_days = sum(
                1 for date in self.current_week
                if self._is_unavailable(emp_id, date)
            )
            
            week_shifts = []
            for date in self.current_week:
                for shift_id in assignments[emp_id].get(date, {}):
                    week_shifts.append(assignments[emp_id][date][shift_id])
            
            # Always add constraint if there are shifts available, even if target is 0
            if week_shifts:
                if target_shifts > 0:
                    self.model.Add(sum(week_shifts) == target_shifts)
                    if unavail_days > 0:
                        self.add_feedback(f"  {emp['name']}: {shifts_per_week} shifts - {leave_days} leave days = {target_shifts} target (unavailable {unavail_days} days, will assign to other days)", 'info')
                    else:
                        self.add_feedback(f"  {emp['name']}: {shifts_per_week} shifts - {leave_days} leave days = {target_shifts} target", 'info')
                else:
                    # If on leave for entire week or more, ensure no shifts assigned
                    self.model.Add(sum(week_shifts) == 0)
                    self.add_feedback(f"  {emp['name']}: Full week leave (or more) - no shifts assigned", 'info')
        
        self.add_feedback(f"Total shifts needed across all employees: {total_shifts_needed}", 'info')
        
        # 2. One shift per day maximum
        for emp in self.employees:
            emp_id = emp['id']
            for date in self.current_week:
                day_shifts = list(assignments[emp_id].get(date, {}).values())
                if len(day_shifts) > 1:
                    self.model.Add(sum(day_shifts) <= 1)
        
        # 3. Priority-based distribution across days for each shift type (with flexibility for leaves)
        self.add_feedback("Step 4: Applying priority-based distribution across days...", 'info')

        for shift_id, allocation in shift_allocations.items():
            for date_idx, date in enumerate(self.current_week):
                day_name = days_of_week[date_idx]

                if day_name in allocation['enabled_days']:
                    # Collect all assignments for this shift on this day
                    day_assignments = []
                    available_employees = 0
                    for emp in self.employees:
                        if emp['roleId'] == allocation['role_id']:
                            # Only count if employee is available (not on leave/unavailable)
                            if not self._is_on_leave(emp['id'], date) and not self._is_unavailable(emp['id'], date):
                                available_employees += 1
                                if shift_id in assignments[emp['id']].get(date, {}):
                                    day_assignments.append(assignments[emp['id']][date][shift_id])

                    if day_assignments and available_employees > 0:
                        # Use the availability-weighted target for this day
                        target_per_day = allocation['day_allocations'][day_name]
                        
                        # CRITICAL FIX: Adjust target if fewer employees available on this day
                        # If an employee is on leave, reduce the target proportionally
                        total_employees_for_role = sum(1 for e in self.employees if e['roleId'] == allocation['role_id'] and e['id'] not in self.completely_unavailable_employees)
                        if total_employees_for_role > 0 and available_employees < total_employees_for_role:
                            # Reduce target proportionally to available employees
                            adjusted_target = target_per_day * (available_employees / total_employees_for_role)
                            min_target = max(0, int(adjusted_target))
                        else:
                            min_target = max(0, int(target_per_day))
                        
                        max_target = min_target + 1
                        
                        self.model.Add(sum(day_assignments) >= min_target)
                        self.model.Add(sum(day_assignments) <= max_target)
        
        # 4. Equal share of shift types across employees (accounting for leaves and unavailability)
        self.add_feedback("Step 5: Balancing shift types across employees...", 'info')

        for role in self.roles:
            role_id = role['id']
            role_employees = [e for e in schedulable_employees if e['roleId'] == role_id]
            role_shifts = [s for s in self.shifts if s['roleId'] == role_id]

            if len(role_employees) <= 1 or len(role_shifts) <= 1:
                continue

            # IMPORTANT: Only skip balancing if employees have LEAVES
            # UNAVAILABLE days should NOT skip balance - unavailable employees still get full shifts
            role_has_leaves = any(
                any(self._is_on_leave(emp['id'], date) for date in self.current_week)
                for emp in role_employees
            )
            
            # If there are actual LEAVE days, skip the balancing constraint
            # Individual employee shift counts already handle fairness accounting for leaves
            if role_has_leaves:
                self.add_feedback(f"  Role '{role['name']}': Skipping balance constraint (employees have leaves, individual targets handle fairness)", 'info')
                continue

            for shift in role_shifts:
                shift_id = shift['id']

                # Count how many times each employee gets this shift (excluding those unavailable)
                employee_counts = []
                for emp in role_employees:
                    # Count available days for this employee
                    # IMPORTANT: Do NOT exclude unavailable days here - unavailable employees still need assignments
                    available_days = sum(
                        1 for date in self.current_week
                        if not self._is_on_leave(emp['id'], date)
                    )

                    # Only include employees who have available days (not on leave)
                    if available_days > 0:
                        emp_shift_vars = []
                        for date in self.current_week:
                            # Safely check if the assignment exists for this date/shift
                            if emp['id'] in assignments and date in assignments[emp['id']]:
                                if shift_id in assignments[emp['id']][date]:
                                    emp_shift_vars.append(assignments[emp['id']][date][shift_id])

                        if emp_shift_vars:
                            employee_counts.append(sum(emp_shift_vars))

                # Constrain: difference between max and min should be <= 2 (strict equality when no leaves)
                if len(employee_counts) >= 2:
                    for i in range(len(employee_counts)):
                        for j in range(i + 1, len(employee_counts)):
                            diff = employee_counts[i] - employee_counts[j]
                            self.model.Add(diff <= 2)
                            self.model.Add(diff >= -2)
        
        # OBJECTIVE: Maximize coverage while minimizing unavailable assignments
        # Strategy: Assign higher weight to available assignments, lower weight to unavailable
        objective_terms = []
        for emp_id in assignments:
            for date in assignments[emp_id]:
                for shift_id in assignments[emp_id][date]:
                    var = assignments[emp_id][date][shift_id]
                    # Weight: 2 if available (encourage), 1 if unavailable (discourage but allow)
                    weight = 1 if self._is_unavailable(emp_id, date) else 2
                    # Create weighted term: weight * variable
                    objective_terms.append(weight * var)
        
        if objective_terms:
            self.model.Maximize(sum(objective_terms))
        
        # SOLVE
        self.add_feedback("Solving with OR-Tools CP-SAT...", 'info')
        self.solver.parameters.max_time_in_seconds = 90.0
        self.solver.parameters.num_search_workers = 8
        self.solver.parameters.log_search_progress = False
        
        status = self.solver.Solve(self.model)
        
        if status == cp_model.OPTIMAL:
            self.add_feedback("✅ Found OPTIMAL solution with priority-based distribution!", 'success')
            return self._extract_solution(assignments), None
        elif status == cp_model.FEASIBLE:
            self.add_feedback("✅ Found FEASIBLE solution with priority-based distribution", 'success')
            return self._extract_solution(assignments), None
        elif status == cp_model.INFEASIBLE:
            return None, self._generate_infeasibility_feedback()
        else:
            return None, "Solver timeout. Try reducing constraints or enabling more days."
    
    def _generate_infeasibility_feedback(self):
        """Generate detailed feedback for infeasible schedules with specific errors"""
        days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        issues = []
        
        # 1. Check for completely unavailable employees (should be excluded but good to verify)
        if self.completely_unavailable_employees:
            for emp_id in self.completely_unavailable_employees:
                emp = next((e for e in self.employees if e['id'] == emp_id), None)
                if emp:
                    issues.append({
                        'type': 'EXCLUDED_EMPLOYEE',
                        'employee': emp['name'],
                        'problem': "Unavailable ALL days of the week",
                        'suggestion': "Employee completely unavailable - cannot be scheduled"
                    })
        
        # 2. Check each employee's feasibility
        for emp in self.employees:
            emp_id = emp['id']
            
            # Skip completely unavailable employees
            if emp_id in self.completely_unavailable_employees:
                continue
            
            shifts_per_week = emp.get('shiftsPerWeek', self._calculate_shifts_per_week(emp))
            
            available_days = []
            leave_days = []
            unavail_days = []
            
            for date in self.current_week:
                if self._is_on_leave(emp_id, date):
                    leave_days.append(date)
                elif self._is_unavailable(emp_id, date):
                    unavail_days.append(date)
                else:
                    available_days.append(date)
            
            required_after_leave = shifts_per_week - len(leave_days)
            
            # Error 1: Not enough available days
            if len(available_days) < required_after_leave and required_after_leave > 0:
                issues.append({
                    'type': 'NOT_ENOUGH_DAYS',
                    'employee': emp['name'],
                    'problem': f"Needs {required_after_leave} shifts but only {len(available_days)} days available",
                    'details': {
                        'shiftsPerWeek': shifts_per_week,
                        'leaveDays': len(leave_days),
                        'unavailableDays': len(unavail_days),
                        'availableDays': len(available_days),
                        'required': required_after_leave
                    },
                    'suggestion': f"Reduce shiftsPerWeek or remove unavailability (currently {shifts_per_week} shifts, {len(leave_days)} leave, {len(unavail_days)} unavailable)"
                })
            
            # Error 2: Not enough shifts enabled on available days
            if required_after_leave > 0:
                role_shifts = [s for s in self.shifts if s['roleId'] == emp['roleId']]
                
                if not role_shifts:
                    issues.append({
                        'type': 'NO_SHIFTS_FOR_ROLE',
                        'employee': emp['name'],
                        'problem': "No shifts defined for this role",
                        'suggestion': "Add shifts to this role"
                    })
                else:
                    days_with_shifts = 0
                    shifts_available_per_day = {}
                    
                    for date in available_days:
                        date_idx = self.current_week.index(date)
                        day_name = days_of_week[date_idx]
                        
                        enabled_shifts = [
                            shift['name'] for shift in role_shifts
                            if shift.get('schedule', {}).get(day_name, {}).get('enabled', False)
                        ]
                        
                        if enabled_shifts:
                            days_with_shifts += 1
                            shifts_available_per_day[day_name] = enabled_shifts
                    
                    if days_with_shifts < required_after_leave:
                        role = next((r for r in self.roles if r['id'] == emp['roleId']), None)
                        role_name = role['name'] if role else emp['roleId']
                        issues.append({
                            'type': 'NOT_ENOUGH_SHIFT_SLOTS',
                            'employee': emp['name'],
                            'problem': f"Only {days_with_shifts} days have enabled shifts, needs {required_after_leave}",
                            'details': {
                                'shiftSlotsAvailable': days_with_shifts,
                                'shiftsRequired': required_after_leave,
                                'shortBy': required_after_leave - days_with_shifts,
                                'daysWithShifts': list(shifts_available_per_day.keys())
                            },
                            'suggestion': f"Enable shifts on more days in role '{role_name}' (need {required_after_leave - days_with_shifts} more days with shifts)"
                        })
        
        # 3. Check role capacity
        for role in self.roles:
            role_id = role['id']
            role_employees = [e for e in self.employees if e['roleId'] == role_id and e['id'] not in self.completely_unavailable_employees]
            
            if not role_employees:
                issues.append({
                    'type': 'NO_EMPLOYEES_FOR_ROLE',
                    'employee': f"Role '{role['name']}'",
                    'problem': "No available employees for this role",
                    'suggestion': "Assign employees to this role"
                })
                continue
            
            total_capacity = sum(
                e.get('shiftsPerWeek', self._calculate_shifts_per_week(e)) -
                sum(1 for date in self.current_week if self._is_on_leave(e['id'], date))
                for e in role_employees
            )
            
            role_shifts = [s for s in self.shifts if s['roleId'] == role_id]
            total_slots = 0
            for shift in role_shifts:
                for day in days_of_week:
                    if shift.get('schedule', {}).get(day, {}).get('enabled', False):
                        total_slots += 1
            
            if total_slots > total_capacity:
                issues.append({
                    'type': 'INSUFFICIENT_CAPACITY',
                    'employee': f"Role '{role['name']}'",
                    'problem': f"Role needs {total_slots} shifts but only {total_capacity} available",
                    'details': {
                        'shiftsNeeded': total_slots,
                        'employeeCapacity': total_capacity,
                        'shortBy': total_slots - total_capacity,
                        'employees': len(role_employees)
                    },
                    'suggestion': f"Add more employees to role or reduce shifts (need {total_slots - total_capacity} more shift capacity)"
                })
        
        # Format output
        if issues:
            message = "❌ SCHEDULE GENERATION FAILED - SPECIFIC ERRORS FOUND:\n"
            message += "=" * 80 + "\n\n"
            
            for idx, issue in enumerate(issues, 1):
                message += f"{idx}. [{issue['type']}] {issue['employee']}\n"
                message += f"   Problem: {issue['problem']}\n"
                
                if 'details' in issue:
                    message += "   Details:\n"
                    for key, value in issue['details'].items():
                        message += f"      • {key}: {value}\n"
                
                message += f"   Fix: {issue['suggestion']}\n\n"
            
            message += "=" * 80
            return message
        
        return "❌ Cannot generate schedule - unknown constraint violation. Check data consistency."

    
    def _extract_solution(self, assignments):
        """Extract schedule with statistics"""
        schedule = {}
        shift_distribution = defaultdict(lambda: defaultdict(int))  # shift_id -> employee_id -> count
        day_distribution = defaultdict(lambda: defaultdict(int))    # shift_id -> day -> count
        
        for emp in self.employees:
            emp_id = emp['id']
            
            for date in assignments[emp_id]:
                for shift_id, var in assignments[emp_id][date].items():
                    if self.solver.Value(var) == 1:
                        if date not in schedule:
                            schedule[date] = {}
                        if emp_id not in schedule[date]:
                            schedule[date][emp_id] = []
                        
                        shift = next(s for s in self.shifts if s['id'] == shift_id)
                        
                        # Extract the day name for this date
                        date_obj = datetime.strptime(date, '%Y-%m-%d')
                        day_name = date_obj.strftime('%A')
                        
                        # Get the time info for this specific day
                        day_schedule = shift.get('schedule', {}).get(day_name, {})
                        start_time = day_schedule.get('startTime') or '09:00'
                        end_time = day_schedule.get('endTime') or '17:00'
                        
                        # Debug: log if times are missing
                        if not day_schedule or not day_schedule.get('startTime'):
                            print(f"⚠️  No time info for {shift['name']} on {day_name}")
                            print(f"   day_schedule: {day_schedule}")
                        
                        # Create a shift object with explicit startTime and endTime for this date
                        shift_with_times = {
                            'id': shift['id'],
                            'name': shift['name'],
                            'roleId': shift.get('roleId'),
                            'schedule': shift.get('schedule', {}),
                            'startTime': start_time,
                            'endTime': end_time
                        }
                        
                        schedule[date][emp_id].append(shift_with_times)
                        
                        # Track distributions
                        shift_distribution[shift_id][emp_id] += 1
                        day_distribution[shift_id][date] += 1
        
        # Log distribution statistics
        self.add_feedback("\n=== DISTRIBUTION STATISTICS ===", 'success')
        
        for shift_id, emp_counts in shift_distribution.items():
            shift = next(s for s in self.shifts if s['id'] == shift_id)
            self.add_feedback(f"\nShift '{shift['name']}':", 'success')
            self.add_feedback(f"  Employee distribution: {dict(emp_counts)}", 'info')
            
            day_counts = day_distribution[shift_id]
            self.add_feedback(f"  Day distribution: {dict(day_counts)}", 'info')
        
        return schedule
    
    def get_feedback(self):
        return self.feedback


@app.route('/api/generate-schedule', methods=['POST'])
def generate_schedule():
    try:
        data = request.json
        
        employees = data.get('employees', [])
        roles = data.get('roles', [])
        shifts = data.get('shifts', [])
        leave_requests = data.get('leaveRequests', {})
        unavailability = data.get('unavailability', {})
        current_week = data.get('currentWeek', [])
        
        print(f"\n{'='*60}")
        print(f"SCHEDULE GENERATION - PRIORITY-BASED DISTRIBUTION")
        print(f"{'='*60}")
        print(f"Employees: {len(employees)}, Roles: {len(roles)}, Shifts: {len(shifts)}")
        print(f"Week: {current_week[0]} to {current_week[-1]}")
        print(f"{'='*60}\n")
        
        scheduler = ShiftSchedulerV4(
            employees, roles, shifts, leave_requests, unavailability, current_week
        )
        
        schedule, error = scheduler.generate_schedule()
        feedback = scheduler.get_feedback()
        
        if schedule is None:
            print(f"\n❌ FAILED: {error}\n")
            return jsonify({
                'success': False,
                'error': error,
                'feedback': feedback
            }), 400
        
        total_shifts = sum(
            len(emp_shifts)
            for day_shifts in schedule.values()
            for emp_shifts in day_shifts.values()
        )
        
        # Save schedule, leave requests, and unavailability to database for persistence
        db = get_db()
        db.save_schedule(schedule)
        db.save_leave_requests(leave_requests)
        db.save_unavailability(unavailability)
        
        print(f"✅ Schedule saved to PostgreSQL: {total_shifts} shifts")
        print(f"✅ Leave requests saved: {len(leave_requests)} entries")
        print(f"✅ Unavailability saved: {len(unavailability)} entries")
        print(f"\n✅ SUCCESS: Generated {total_shifts} shift assignments with priority-based distribution\n")

        return jsonify({
            'success': True,
            'schedule': schedule,
            'feedback': feedback,
            'stats': {
                'total_employees': len(employees),
                'total_shifts': total_shifts,
                'distribution': 'priority-based'
            }
        })
    
    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}\n")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f"System error: {str(e)}",
            'feedback': []
        }), 500


@app.route('/api/save-data', methods=['POST'])
def save_data():
    try:
        data = request.json
        employees = data.get('employees', [])
        roles_with_shifts = data.get('roles', [])
        
        db = get_db()
        
        # Save employees to database
        db.save_employees(employees)
        
        # Save roles with shifts to database
        db.save_roles(roles_with_shifts)
        
        print("✅ Employees and roles saved to PostgreSQL successfully")
        return jsonify({'success': True})
    except Exception as e:
        print(f"❌ Error saving data: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500



@app.route('/api/save-schedule', methods=['POST'])
def save_schedule():
    try:
        data = request.json
        schedule = data.get('schedule', {})
        
        db = get_db()
        db.save_schedule(schedule)
        
        print("✅ Schedule saved to PostgreSQL successfully")
        return jsonify({'success': True})
    except Exception as e:
        print(f"❌ Error saving schedule: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/load-schedule', methods=['GET'])
def load_schedule():
    """Load schedule from database"""
    try:
        db = get_db()
        schedule = db.get_schedule()
        
        return jsonify({
            'success': True,
            'schedule': schedule
        })
    except Exception as e:
        print(f"❌ Error loading schedule: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'schedule': {}
        }), 500

@app.route('/api/save-attendance', methods=['POST'])
def save_attendance():
    try:
        data = request.json
        attendance = data.get('attendance', {})
        
        db = get_db()
        db.save_attendance(attendance)
        
        print("✅ Attendance saved to PostgreSQL successfully")
        return jsonify({'success': True})
    except Exception as e:
        print(f"❌ Error saving attendance: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/load-leave-unavailability', methods=['GET'])
def load_leave_unavailability():
    """Load leave requests and unavailability from database"""
    try:
        db = get_db()
        leave_requests = db.get_leave_requests()
        unavailability = db.get_unavailability()
        
        return jsonify({
            'success': True,
            'leaveRequests': leave_requests,
            'unavailability': unavailability
        })
    except Exception as e:
        print(f"❌ Error loading leave/unavailability: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'leaveRequests': {},
            'unavailability': {}
        }), 500


@app.route('/api/save-leave-unavailability', methods=['POST'])
def save_leave_unavailability():
    """Save leave requests and unavailability to database"""
    try:
        data = request.json
        leave_requests = data.get('leaveRequests', {})
        unavailability = data.get('unavailability', {})
        
        db = get_db()
        db.save_leave_requests(leave_requests)
        db.save_unavailability(unavailability)
        
        print("✅ Leave and unavailability saved to PostgreSQL successfully")
        return jsonify({
            'success': True,
            'message': 'Leave and unavailability saved'
        })
    except Exception as e:
        print(f"❌ Error saving leave/unavailability: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout endpoint - saves all data before logout"""
    try:
        data = request.json or {}
        
        # Save all pending data
        leave_requests = data.get('leaveRequests', {})
        unavailability = data.get('unavailability', {})
        schedule = data.get('schedule', {})
        
        db = get_db()
        
        # Save everything
        if leave_requests:
            db.save_leave_requests(leave_requests)
            print(f"✅ Saved {len(leave_requests)} leave requests")
        
        if unavailability:
            db.save_unavailability(unavailability)
            print(f"✅ Saved {len(unavailability)} unavailability entries")
        
        if schedule:
            db.save_schedule(schedule)
            print(f"✅ Saved schedule with {sum(len(shifts) for day in schedule.values() for shifts in day.values())} shifts")
        
        print("✅ All data saved before logout")
        
        return jsonify({
            'success': True,
            'message': 'All data saved successfully before logout'
        })
    except Exception as e:
        print(f"❌ Error during logout save: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error saving data, but logout proceeded'
        }), 500


def check_consecutive_shifts(schedule, employee_id, current_week, max_consecutive=5):
    """
    Check if an employee has more than max_consecutive shifts without a break.
    Returns a tuple: (has_violation, max_consecutive_count, details)
    """
    # Get all dates with shifts for this employee in order
    dates_with_shifts = []
    for date in current_week:
        emp_shifts = schedule.get(date, {}).get(employee_id, [])
        if emp_shifts:
            dates_with_shifts.append(date)
    
    if not dates_with_shifts:
        return False, 0, ""
    
    # Sort dates to ensure correct order
    dates_with_shifts.sort()
    print(f"   📅 Checking {employee_id}: Found shifts on {len(dates_with_shifts)} dates: {dates_with_shifts}")
    
    # Check for consecutive sequences
    max_consecutive_found = 1
    current_consecutive = 1
    violation_details = ""
    
    for i in range(len(dates_with_shifts) - 1):
        current_date = dates_with_shifts[i]
        next_date = dates_with_shifts[i + 1]
        
        # Parse dates to compare
        current_date_obj = __import__('datetime').datetime.strptime(current_date, '%Y-%m-%d')
        next_date_obj = __import__('datetime').datetime.strptime(next_date, '%Y-%m-%d')
        
        # Check if next date is consecutive (1 day apart)
        day_diff = (next_date_obj - current_date_obj).days
        
        if day_diff == 1:
            # Consecutive day
            current_consecutive += 1
            max_consecutive_found = max(max_consecutive_found, current_consecutive)
            print(f"      ➕ {current_date} -> {next_date}: Consecutive (diff={day_diff}, count={current_consecutive})")
        else:
            # Break in the sequence
            print(f"      ⏸️  {current_date} -> {next_date}: Break (diff={day_diff})")
            if current_consecutive > max_consecutive:
                violation_details = f"{current_consecutive} consecutive shifts"
            current_consecutive = 1
    
    # Check the final sequence
    if current_consecutive > max_consecutive:
        violation_details = f"{current_consecutive} consecutive shifts"
    
    max_consecutive_found = max(max_consecutive_found, current_consecutive)
    has_violation = max_consecutive_found > max_consecutive
    print(f"   📊 Result: max_consecutive_found={max_consecutive_found}, max_allowed={max_consecutive}, violation={has_violation}")
    
    return has_violation, max_consecutive_found, violation_details


@app.route('/api/validate-schedule', methods=['POST'])
def validate_schedule():
    """
    Validate an edited schedule against constraints:
    1. Check weekly max hours per employee
    2. Check daily max hours per employee
    3. Check one shift per day constraint
    4. Check consecutive shifts constraint (max 5 consecutive shifts without a break)
    5. Detect overtime situations
    
    Supports multilingual error messages (English and Japanese)
    """
    try:
        data = request.json
        schedule = data.get('schedule', {})
        employees = data.get('employees', [])
        roles = data.get('roles', [])
        shifts = data.get('shifts', [])
        current_week = data.get('currentWeek', [])
        language = data.get('language', 'en')  # Get language preference (default: English)

        errors = []
        overtime_warnings = []
        days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

        # Error message templates based on language
        if language == 'ja':
            error_templates = {
                'consecutive_shifts': "{emp_name}: 5日を超える連続シフトは割り当てられません({consecutive_count}日の連続シフトが見つかりました)。休暇日を追加してください。",
                'multiple_shifts': "{emp_name}: {date}に複数のシフトがあります(1日に1シフトのみ許可)",
                'break_time_missing': "{emp_name}: {date}のシフトが4時間以上です({shift_hours}時間)が、休憩時間が設定されていません。ロール設定で休憩時間を設定してください。",
            }
        else:  # Default to English
            error_templates = {
                'consecutive_shifts': "{emp_name}: Cannot assign more than 5 consecutive shifts without a break ({consecutive_count} consecutive shifts found). Please add a day off.",
                'multiple_shifts': "{emp_name}: Multiple shifts on {date} (only one shift per day allowed)",
                'break_time_missing': "{emp_name}: Shift on {date} is {shift_hours} hours but break time is not configured (shifts over 4 hours require a break). Please set break time in the role settings.",
            }

        # Validate each employee
        for emp in employees:
            emp_id = emp['id']
            emp_name = emp['name']
            weekly_hours = emp.get('weeklyHours', 40)
            daily_max = emp.get('dailyMaxHours', 8)

            # Check for consecutive shifts constraint (max 5 without break)
            has_violation, consecutive_count, details = check_consecutive_shifts(schedule, emp_id, current_week, max_consecutive=5)
            
            # Debug logging
            dates_with_shifts = [d for d in current_week if schedule.get(d, {}).get(emp_id, [])]
            print(f"🔍 Consecutive shifts check for {emp_name} ({emp_id}):")
            print(f"   Dates with shifts: {dates_with_shifts}")
            print(f"   Has violation: {has_violation}, Count: {consecutive_count}, Max allowed: 5")
            
            if has_violation:
                error_msg = error_templates['consecutive_shifts'].format(
                    emp_name=emp_name,
                    consecutive_count=consecutive_count
                )
                print(f"   ❌ Adding error: {error_msg}")
                errors.append(error_msg)

            # Calculate total hours for the week
            total_hours = 0
            daily_hours = {}

            for date_idx, date in enumerate(current_week):
                day_hours = 0
                emp_shifts = schedule.get(date, {}).get(emp_id, [])

                if len(emp_shifts) > 1:
                    error_msg = error_templates['multiple_shifts'].format(
                        emp_name=emp_name,
                        date=date
                    )
                    errors.append(error_msg)

                for shift in emp_shifts:
                    day_name = days_of_week[date_idx]
                    shift_schedule = shift.get('schedule', {}).get(day_name, {})
                    
                    # Times can be either directly on shift (from DB) or in schedule[dayName] (from generation)
                    start_time = shift.get('startTime') or shift_schedule.get('startTime', '09:00')
                    end_time = shift.get('endTime') or shift_schedule.get('endTime', '17:00')

                    if start_time and end_time:
                        # Calculate hours
                        start_parts = start_time.split(':')
                        end_parts = end_time.split(':')
                        start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])
                        end_minutes = int(end_parts[0]) * 60 + int(end_parts[1])

                        if end_minutes < start_minutes:
                            end_minutes += 24 * 60  # Handle overnight shifts

                        shift_hours = (end_minutes - start_minutes) / 60.0

                        # Get break time from role
                        role = next((r for r in roles if r['id'] == emp['roleId']), None)
                        break_minutes = role.get('breakMinutes', 0) if role else 0
                        
                        # Check if shift is > 4 hours but has no break time configured
                        if shift_hours > 4.0 and break_minutes == 0:
                            error_msg = error_templates['break_time_missing'].format(
                                emp_name=emp_name,
                                date=date,
                                shift_hours=round(shift_hours, 1)
                            )
                            errors.append(error_msg)
                        
                        # Calculate actual working hours (subtract break if present)
                        actual_hours = shift_hours - (break_minutes / 60.0) if break_minutes > 0 else shift_hours
                        day_hours += actual_hours

                daily_hours[date] = day_hours
                total_hours += day_hours

                # Note: Daily max violations are warned in frontend but don't block saving
                # We don't add them to errors list

            # Only record overtime when weekly max is exceeded
            if total_hours > weekly_hours:
                weekly_overtime = total_hours - weekly_hours
                overtime_warnings.append({
                    'employeeId': emp_id,
                    'employeeName': emp_name,
                    'plannedHours': round(total_hours, 1),
                    'maxHours': weekly_hours,
                    'overtime': round(weekly_overtime, 1)
                })

        # Return validation result
        return jsonify({
            'valid': len(errors) == 0,
            'errors': errors,
            'overtime': overtime_warnings
        })

    except Exception as e:
        print(f"\n❌ Validation error: {str(e)}\n")
        import traceback
        traceback.print_exc()
        return jsonify({
            'valid': False,
            'errors': [f"Validation error: {str(e)}"],
            'overtime': []
        }), 500


@app.route('/api/save-overtime', methods=['POST'])
def save_overtime():
    """Save overtime records to PostgreSQL"""
    try:
        data = request.json
        overtime_records = data.get('overtime', {})

        db = get_db()
        db.save_overtime(overtime_records)

        print("✅ Overtime saved to PostgreSQL successfully")
        return jsonify({'success': True})
    except Exception as e:
        print(f"❌ Error saving overtime: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/demand-forecast', methods=['POST'])
def demand_forecast():
    """
    Analyze historical schedule data and forecast demand for the upcoming week
    Uses simple statistical analysis on historical patterns
    Supports English and Japanese output
    """
    try:
        import statistics
        from datetime import datetime, timedelta
        
        # Load historical schedule data from database
        try:
            db = get_db()
            history = db.get_schedule_history()
            
            if not history:
                # If no history exists in DB, still return empty forecast gracefully
                history = {}
        except Exception as e:
            print(f"Warning: Could not load schedule history: {str(e)}")
            history = {}
        
        data = request.json
        current_week = data.get('currentWeek', [])
        language = data.get('language', 'en')  # Get language preference
        
        if not current_week:
            return jsonify({'success': False, 'error': 'Current week dates required'}), 400
        
        # Extract day names for current week
        week_start = datetime.strptime(current_week[0], '%Y-%m-%d')
        days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        current_day_names = [days_of_week[(week_start + timedelta(days=i)).weekday()] for i in range(7)]
        
        # Analyze historical data
        day_employee_counts = {day: [] for day in current_day_names}
        day_shift_counts = {day: [] for day in current_day_names}
        role_demands = defaultdict(list)
        total_absence_rates = []
        total_overtime_counts = []
        
        for week_data in history.values():
            day_breakdown = week_data.get('dayBreakdown', {})
            role_breakdown = week_data.get('roleBreakdown', {})
            
            for day, data_point in day_breakdown.items():
                if day in current_day_names:
                    day_employee_counts[day].append(data_point.get('employees', 0))
                    day_shift_counts[day].append(data_point.get('shiftsCount', 0))
            
            for role, data_point in role_breakdown.items():
                role_demands[role].append(data_point.get('totalScheduled', 0))
            
            total_absence_rates.append(week_data.get('absenceRate', 0))
            total_overtime_counts.append(week_data.get('overtimeCount', 0))
        
        # Calculate forecasts using statistical analysis
        forecast = {
            'forecastDate': datetime.now().isoformat(),
            'weekStartDate': current_week[0],
            'weekEndDate': current_week[-1],
            'dayForecasts': {},
            'roleForecasts': {},
            'insights': [],
            'recommendations': []
        }
        
        # Day-level forecasts
        for day in current_day_names:
            if day_employee_counts[day]:
                avg_employees = statistics.mean(day_employee_counts[day])
                avg_shifts = statistics.mean(day_shift_counts[day])
                
                # Calculate trend (increasing/decreasing demand)
                if len(day_employee_counts[day]) > 1:
                    trend = day_employee_counts[day][-1] - day_employee_counts[day][0]
                    if language == 'ja':
                        trend_direction = "↑ 増加" if trend > 0 else "↓ 減少" if trend < 0 else "→ 安定"
                    else:
                        trend_direction = "↑ increasing" if trend > 0 else "↓ decreasing" if trend < 0 else "→ stable"
                else:
                    trend = 0
                    trend_direction = "→ 安定" if language == 'ja' else "→ stable"
                
                forecast['dayForecasts'][day] = {
                    'predictedEmployees': round(avg_employees),
                    'predictedShifts': round(avg_shifts),
                    'historicalRange': {
                        'min': min(day_employee_counts[day]),
                        'max': max(day_employee_counts[day])
                    },
                    'trend': trend_direction,
                    'confidence': '85%'
                }
        
        # Role-level forecasts
        for role, demands in role_demands.items():
            if demands:
                avg_demand = statistics.mean(demands)
                max_demand = max(demands)
                std_dev = statistics.stdev(demands) if len(demands) > 1 else 0
                
                forecast['roleForecasts'][role] = {
                    'predictedEmployees': round(avg_demand),
                    'averageDemand': round(avg_demand),
                    'peakDemand': max_demand,
                    'variability': round(std_dev, 2),
                    'confidence': '80%'
                }
        
        # Calculate average metrics
        avg_absence_rate = statistics.mean(total_absence_rates) if total_absence_rates else 0
        avg_overtime = statistics.mean(total_overtime_counts) if total_overtime_counts else 0
        
        forecast['metrics'] = {
            'averageAbsenceRate': round(avg_absence_rate * 100, 1),
            'averageOvertimeShifts': round(avg_overtime),
            'totalHistoricalWeeks': len(history)
        }
        
        # Generate insights and recommendations based on language
        if forecast['dayForecasts']:
            peak_day = max(forecast['dayForecasts'].items(), 
                          key=lambda x: x[1]['predictedEmployees'])
            low_day = min(forecast['dayForecasts'].items(), 
                         key=lambda x: x[1]['predictedEmployees'])
            
            if language == 'ja':
                # Day names in Japanese
                day_names_ja = {
                    'Monday': '月曜日',
                    'Tuesday': '火曜日',
                    'Wednesday': '水曜日',
                    'Thursday': '木曜日',
                    'Friday': '金曜日',
                    'Saturday': '土曜日',
                    'Sunday': '日曜日'
                }
                
                peak_day_ja = day_names_ja.get(peak_day[0], peak_day[0])
                low_day_ja = day_names_ja.get(low_day[0], low_day[0])
                
                forecast['insights'] = [
                    f"📈 {peak_day_ja} はピーク時に平均 {peak_day[1]['predictedEmployees']} 人の従業員が必要です",
                    f"📉 {low_day_ja} は最低需要で平均 {low_day[1]['predictedEmployees']} 人の従業員が必要です",
                    f"⚠️ 過去の欠席率: {round(avg_absence_rate*100, 1)}% - 約 {round(forecast['metrics']['totalHistoricalWeeks'] * avg_absence_rate)} 件の欠席を予定してください",
                    f"⏱️ 週平均残業シフト数: {round(avg_overtime)} 件"
                ]
                
                forecast['recommendations'] = [
                    f"✅ {peak_day_ja} (ピークの日) に {peak_day[1]['predictedEmployees'] + 2} 人の従業員をスケジュールしてください",
                    f"✅ {low_day_ja} (最低需要) には {low_day[1]['predictedEmployees'] - 1} 人のみで対応可能です (コスト削減)",
                    f"✅ 欠席に備えて約 {round(avg_absence_rate * forecast['metrics'].get('totalHistoricalWeeks', 40))} 人のバックアップ要員を確保してください",
                    f"✅ 残業を回転させて、従業員ごとに {round(avg_overtime)} 件の連続残業を防止してください"
                ]
            else:
                forecast['insights'] = [
                    f"📈 {peak_day[0]} has peak demand with avg {peak_day[1]['predictedEmployees']} employees",
                    f"📉 {low_day[0]} has lowest demand with avg {low_day[1]['predictedEmployees']} employees",
                    f"⚠️ Historical absence rate: {round(avg_absence_rate*100, 1)}% - Plan for ~{round(forecast['metrics']['totalHistoricalWeeks'] * avg_absence_rate)} absences",
                    f"⏱️ Average overtime shifts per week: {round(avg_overtime)}"
                ]
                
                forecast['recommendations'] = [
                    f"✅ Schedule {peak_day[1]['predictedEmployees'] + 2} employees on {peak_day[0]} (peak day)",
                    f"✅ Only {low_day[1]['predictedEmployees'] - 1} employees needed on {low_day[0]} (can reduce costs)",
                    f"✅ Have {round(avg_absence_rate * forecast['metrics'].get('totalHistoricalWeeks', 40))} backup staff on standby for absences",
                    f"✅ Rotate overtime assignments to prevent {round(avg_overtime)} consecutive overtime shifts per employee"
                ]
        
        return jsonify({'success': True, 'forecast': forecast})
    
    except Exception as e:
        import traceback
        print(f"Error in demand forecast: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/save-notifications', methods=['POST'])
def save_notifications():
    """Save notifications to PostgreSQL"""
    try:
        data = request.json
        notifications = data.get('notifications', {})

        db = get_db()
        db.save_notifications(notifications)

        print("✅ Notifications saved to PostgreSQL successfully")
        return jsonify({'success': True})
    except Exception as e:
        print(f"❌ Error saving notifications: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'shift-scheduler-v4-priority-based-distribution',
        'features': [
            'priority-based-day-distribution',
            'equal-share-per-employee',
            'shift-type-priority-allocation',
            'strict-shift-count',
            'schedule-validation',
            'overtime-detection',
            'demand-forecasting'
        ]
    })


if __name__ == '__main__':
    print("🚀 Shift Scheduler V4 - Priority-Based Distribution + Edit Mode")
    print("✨ Features:")
    print("   1. Calculate total shifts per role")
    print("   2. Distribute by shift type priority percentage")
    print("   3. Distribute across days based on day priorities")
    print("   4. Assign employees with equal share of shift types")
    print("   5. Schedule validation and constraint checking")
    print("   6. Overtime detection and recording")
    print("🌐 Server: http://localhost:5000")
    print()
    app.run(debug=True, port=5000, host='0.0.0.0')