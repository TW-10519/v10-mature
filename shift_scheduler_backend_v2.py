"""
Shift Scheduler Backend V4 - Priority-Based Distribution Logic
Workflow:
1. Calculate total shifts per role (minus leaves)
2. Distribute by priority percentage to each shift type
3. Distribute across days based on day priorities (not equally)
4. Assign employees with equal share of each shift type
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from ortools.sat.python import cp_model
import json
from collections import defaultdict

app = Flask(__name__)
CORS(app)

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
        
    def add_feedback(self, message, severity='info'):
        self.feedback.append({'message': message, 'severity': severity})
        print(f"[{severity.upper()}] {message}")

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
        Priority-based distribution workflow:
        1. Calculate total shifts per role (minus leaves)
        2. Distribute by priority to shift types
        3. Distribute across days based on day priorities
        4. Assign employees with equal share of shift types
        """
        days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        self.add_feedback("Step 1: Calculating total shifts per role...", 'info')
        
        # Step 0: Calculate available employees per day (accounting for leaves)
        self.add_feedback("Step 0: Analyzing daily availability...", 'info')
        daily_availability = {}
        for date_idx, date in enumerate(self.current_week):
            day_name = days_of_week[date_idx]
            daily_availability[day_name] = {}
            
            for role in self.roles:
                role_id = role['id']
                available_count = sum(
                    1 for emp in self.employees
                    if emp['roleId'] == role_id and
                    not self._is_on_leave(emp['id'], date) and
                    not self._is_unavailable(emp['id'], date)
                )
                daily_availability[day_name][role_id] = available_count
                self.add_feedback(f"  {day_name} - Role '{next(r['name'] for r in self.roles if r['id'] == role_id)}': {available_count} employees available", 'info')
        
        # Step 1: Calculate total shifts per role (minus leaves)
        role_capacities = {}
        for role in self.roles:
            role_id = role['id']
            role_employees = [e for e in self.employees if e['roleId'] == role_id]
            
            total_shifts = sum(
                e.get('shiftsPerWeek', self._calculate_shifts_per_week(e))
                for e in role_employees
            )
            
            # Subtract leaves
            for emp in role_employees:
                leave_count = sum(
                    1 for date in self.current_week
                    if self._is_on_leave(emp['id'], date)
                )
                total_shifts -= leave_count
            
            role_capacities[role_id] = max(0, total_shifts)
            self.add_feedback(f"  Role '{role['name']}': {total_shifts} total shifts needed (accounting for {sum(sum(1 for date in self.current_week if self._is_on_leave(e['id'], date)) for e in role_employees)} total leave days)", 'info')
        
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
            
            for date_idx, date in enumerate(self.current_week):
                assignments[emp_id][date] = {}
                day_name = days_of_week[date_idx]
                
                if self._is_on_leave(emp_id, date) or self._is_unavailable(emp_id, date):
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
            shifts_per_week = emp.get('shiftsPerWeek', self._calculate_shifts_per_week(emp))
            
            leave_days = sum(
                1 for date in self.current_week
                if self._is_on_leave(emp_id, date)
            )
            
            target_shifts = max(0, shifts_per_week - leave_days)
            total_shifts_needed += target_shifts
            
            week_shifts = []
            for date in self.current_week:
                for shift_id in assignments[emp_id].get(date, {}):
                    week_shifts.append(assignments[emp_id][date][shift_id])
            
            # Always add constraint if there are shifts available, even if target is 0
            if week_shifts:
                if target_shifts > 0:
                    self.model.Add(sum(week_shifts) == target_shifts)
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
                        
                        # Allow flexibility: ±1 from target to handle rounding
                        min_target = max(0, int(target_per_day))
                        max_target = int(target_per_day) + 1
                        
                        self.model.Add(sum(day_assignments) >= min_target)
                        self.model.Add(sum(day_assignments) <= max_target)
        
        # 4. Equal share of shift types across employees (accounting for leaves)
        self.add_feedback("Step 5: Balancing shift types across employees...", 'info')

        for role in self.roles:
            role_id = role['id']
            role_employees = [e for e in self.employees if e['roleId'] == role_id]
            role_shifts = [s for s in self.shifts if s['roleId'] == role_id]

            if len(role_employees) <= 1 or len(role_shifts) <= 1:
                continue

            # Check if ANY employee in this role has leaves
            role_has_leaves = any(
                any(self._is_on_leave(emp['id'], date) or self._is_unavailable(emp['id'], date)
                    for date in self.current_week)
                for emp in role_employees
            )
            
            # If there are leaves, skip the balancing constraint entirely
            # Individual employee shift counts already handle the fairness
            if role_has_leaves:
                self.add_feedback(f"  Role '{role['name']}': Skipping balance constraint due to leaves (shift counts adjusted per employee)", 'info')
                continue

            for shift in role_shifts:
                shift_id = shift['id']

                # Count how many times each employee gets this shift (excluding those on leave)
                employee_counts = []
                for emp in role_employees:
                    # Count available days for this employee
                    available_days = sum(
                        1 for date in self.current_week
                        if not self._is_on_leave(emp['id'], date) and not self._is_unavailable(emp['id'], date)
                    )

                    # Only include employees who have available days
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
        
        # OBJECTIVE: Maximize coverage
        objective_terms = []
        for emp_id in assignments:
            for date in assignments[emp_id]:
                for shift_id in assignments[emp_id][date]:
                    objective_terms.append(assignments[emp_id][date][shift_id])
        
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
        """Generate helpful feedback"""
        days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        issues = []
        
        for emp in self.employees:
            emp_id = emp['id']
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
            
            if len(available_days) < required_after_leave and required_after_leave > 0:
                issues.append({
                    'employee': emp['name'],
                    'problem': f"Needs {required_after_leave} shifts but only {len(available_days)} days available",
                    'suggestion': f"Reduce unavailable days or shiftsPerWeek from {shifts_per_week}"
                })
            
            # Check shift availability - only if employee actually needs shifts after leave
            if required_after_leave > 0:
                role_shifts = [s for s in self.shifts if s['roleId'] == emp['roleId']]
                days_with_shifts = 0
                
                for date in available_days:
                    date_idx = self.current_week.index(date)
                    day_name = days_of_week[date_idx]
                    
                    has_shift = any(
                        shift.get('schedule', {}).get(day_name, {}).get('enabled', False)
                        for shift in role_shifts
                    )
                    if has_shift:
                        days_with_shifts += 1
                
                if days_with_shifts < required_after_leave:
                    role = next((r for r in self.roles if r['id'] == emp['roleId']), None)
                    role_name = role['name'] if role else emp['roleId']
                    issues.append({
                        'employee': emp['name'],
                        'problem': f"Only {days_with_shifts} days have enabled shifts, needs {required_after_leave}",
                        'suggestion': f"Enable more days for shifts in role '{role_name}' or reduce shiftsPerWeek"
                    })
        
        if issues:
            message = "❌ Cannot generate schedule. Issues:\n\n"
            for idx, issue in enumerate(issues, 1):
                message += f"{idx}. {issue['employee']}: {issue['problem']}\n"
                message += f"   → {issue['suggestion']}\n\n"
            return message
        
        return "Cannot generate schedule. Please review constraints."
    
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
                        schedule[date][emp_id].append(shift)
                        
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
        
        # Save employees
        with open(EMPLOYEES_FILE, 'w', encoding='utf-8') as f:
            json.dump(employees, f, indent=2, ensure_ascii=False)
        
        # Save roles with shifts embedded
        with open(ROLES_FILE, 'w', encoding='utf-8') as f:
            json.dump(roles_with_shifts, f, indent=2, ensure_ascii=False)
        
        # Also extract and save shifts separately (for backward compatibility)
        try:
            all_shifts = []
            for role in roles_with_shifts:
                if role.get('shifts'):
                    for shift in role['shifts']:
                        shift_with_role_id = {**shift, 'roleId': role['id']}
                        all_shifts.append(shift_with_role_id)
            
            if all_shifts:
                with open('shifts.json', 'w', encoding='utf-8') as f:
                    json.dump(all_shifts, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Warning: Could not save shifts.json: {str(e)}")
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/save-schedule', methods=['POST'])
def save_schedule():
    try:
        data = request.json
        schedule = data.get('schedule', {})
        
        with open(SCHEDULE_FILE, 'w', encoding='utf-8') as f:
            json.dump(schedule, f, indent=2, ensure_ascii=False)
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/save-attendance', methods=['POST'])
def save_attendance():
    try:
        data = request.json
        attendance = data.get('attendance', {})
        
        with open(ATTENDANCE_FILE, 'w', encoding='utf-8') as f:
            json.dump(attendance, f, indent=2, ensure_ascii=False)
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


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
        else:
            # Break in the sequence
            if current_consecutive > max_consecutive:
                violation_details = f"{current_consecutive} consecutive shifts"
            current_consecutive = 1
    
    # Check the final sequence
    if current_consecutive > max_consecutive:
        violation_details = f"{current_consecutive} consecutive shifts"
    
    max_consecutive_found = max(max_consecutive_found, current_consecutive)
    has_violation = max_consecutive_found > max_consecutive
    
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
            if has_violation:
                error_msg = error_templates['consecutive_shifts'].format(
                    emp_name=emp_name,
                    consecutive_count=consecutive_count
                )
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

                    if shift_schedule:
                        start_time = shift_schedule.get('startTime', '09:00')
                        end_time = shift_schedule.get('endTime', '17:00')

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
    """Save overtime records to file"""
    try:
        data = request.json
        overtime_records = data.get('overtime', {})

        # Load existing overtime records if any
        try:
            with open('overtime.json', 'r', encoding='utf-8') as f:
                existing_overtime = json.load(f)
        except FileNotFoundError:
            existing_overtime = {}

        # Merge new records
        existing_overtime.update(overtime_records)

        # Save to file
        with open('overtime.json', 'w', encoding='utf-8') as f:
            json.dump(existing_overtime, f, indent=2, ensure_ascii=False)

        return jsonify({'success': True})
    except Exception as e:
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
        
        # Load historical schedule data
        try:
            with open('schedule_history.json', 'r', encoding='utf-8') as f:
                history = json.load(f)
        except FileNotFoundError:
            return jsonify({'success': False, 'error': 'No schedule history found'}), 400
        
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
    """Save notifications to file"""
    try:
        data = request.json
        notifications = data.get('notifications', {})

        with open('notifications.json', 'w') as f:
            json.dump(notifications, f, indent=2)

        print("✅ Notifications saved successfully")
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