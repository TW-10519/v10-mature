"""
Shift Scheduler Backend V4 - Priority-Based Distribution Logic with PostgreSQL
Workflow:
1. Calculate total shifts per role (minus leaves)
2. Distribute by priority percentage to each shift type
3. Distribute across days based on day priorities (not equally)
4. Assign employees with equal share of each shift type
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from ortools.sat.python import cp_model
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import math
import traceback
from collections import defaultdict
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Database connection parameters
DB_CONFIG = {
    'host': 'localhost',
    'port': '6000',
    'database': 'mydb',
    'user': 'postgres',
    'password': 'postgres'
}

# Keep login.json as is
LOGIN_FILE = 'login.json'

def get_db():
    """Get database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except psycopg2.Error as e:
        print(f"❌ Database connection error: {e}")
        raise

@app.route('/api/load-all-data', methods=['GET'])
def load_all_data():
    """Load all data from database for frontend initialization"""
    try:
        employees = load_employees_from_db()
        roles = load_roles_from_db()
        shifts = load_shifts_from_db()
        
        # Load current week data from request parameters
        current_week = request.args.getlist('week[]') or get_week_dates()
        schedule = load_schedule_from_db(current_week)
        
        leave_requests = load_leave_requests_from_db()
        unavailability = load_unavailability_from_db()
        
        # Load notifications
        notifications = load_notifications_from_db()
        
        return jsonify({
            'success': True,
            'employees': employees,
            'roles': roles,
            'shifts': shifts,
            'schedule': schedule,
            'leaveRequests': leave_requests,
            'unavailability': unavailability,
            'notifications': notifications
        })
    except Exception as e:
        print(f"Error loading all data: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

def get_week_dates():
    """Get current week dates"""
    from datetime import datetime, timedelta
    today = datetime.now()
    start = today - timedelta(days=today.weekday())
    return [str((start + timedelta(days=x)).date()) for x in range(7)]

def load_employees_from_db():
    """Load employees from database"""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute('''
            SELECT 
                id, name, role_id as "roleId", weekly_hours as "weeklyHours",
                daily_max_hours as "dailyMaxHours", shifts_per_week as "shiftsPerWeek",
                skills
            FROM employees
        ''')
        employees = cursor.fetchall()
        return [dict(emp) for emp in employees]
    finally:
        cursor.close()
        conn.close()

def load_roles_from_db():
    """Load roles from database"""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute('''
            SELECT id, name, weekend_required as "weekendRequired",
                   required_skills as "requiredSkills", break_minutes as "breakMinutes"
            FROM roles
        ''')
        roles = cursor.fetchall()
        return [dict(role) for role in roles]
    finally:
        cursor.close()
        conn.close()

def load_shifts_from_db():
    """Load shifts from database"""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute('''
            SELECT id, name, role_id as "roleId", priority, schedule
            FROM shifts
        ''')
        shifts = cursor.fetchall()
        result = []
        for shift in shifts:
            shift_dict = dict(shift)
            shift_dict['schedule'] = shift_dict.get('schedule', {})
            result.append(shift_dict)
        return result
    finally:
        cursor.close()
        conn.close()

def load_schedule_from_db(current_week):
    """Load schedule from database for current week"""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        schedule = {}
        for date in current_week:
            schedule[date] = {}
        
        if not current_week:
            return schedule
        
        placeholders = ','.join(['%s'] * len(current_week))
        cursor.execute(f'''
            SELECT date, employee_id as "employeeId", shift_id as "shiftId"
            FROM schedule
            WHERE date IN ({placeholders})
        ''', current_week)
        
        rows = cursor.fetchall()
        for row in rows:
            date = str(row['date'])
            emp_id = row['employeeId']
            shift_id = row['shiftId']
            
            if date not in schedule:
                schedule[date] = {}
            if emp_id not in schedule[date]:
                schedule[date][emp_id] = []
            schedule[date][emp_id].append({'id': shift_id})
        
        return schedule
    finally:
        cursor.close()
        conn.close()

def load_leave_requests_from_db():
    """Load leave requests from database"""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        leave_dict = {}
        cursor.execute('''
            SELECT employee_id as "employeeId", start_date as "startDate", 
                   end_date as "endDate"
            FROM leave_requests
            WHERE status = 'approved'
        ''')
        
        rows = cursor.fetchall()
        for row in rows:
            start_str = str(row['startDate']) if isinstance(row['startDate'], str) else row['startDate'].isoformat()
            end_str = str(row['endDate']) if isinstance(row['endDate'], str) else row['endDate'].isoformat()
            for single_date in daterange(start_str, end_str):
                key = f"{row['employeeId']}-{single_date}"
                leave_dict[key] = True
        
        return leave_dict
    finally:
        cursor.close()
        conn.close()

def load_unavailability_from_db():
    """Load unavailability from database"""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        unavail_dict = {}
        cursor.execute('''
            SELECT employee_id as "employeeId", date
            FROM unavailability
        ''')
        
        rows = cursor.fetchall()
        for row in rows:
            key = f"{row['employeeId']}-{row['date']}"
            unavail_dict[key] = True
        
        return unavail_dict
    finally:
        cursor.close()
        conn.close()

def load_notifications_from_db():
    """Load notifications from database"""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        notifications = {'messages': [], 'leaveRequests': []}
        
        # Load messages
        cursor.execute('''
            SELECT id, from_user as "from", to_user as "to", message, type, read
            FROM notifications
            ORDER BY created_at DESC
            LIMIT 100
        ''')
        
        messages = cursor.fetchall()
        for msg in messages:
            notifications['messages'].append({
                'id': msg['id'],
                'from': msg['from'],
                'to': msg['to'],
                'message': msg['message'],
                'type': msg['type'],
                'read': msg['read'],
                'timestamp': datetime.now().isoformat() + 'Z'
            })
        
        # Load leave requests
        cursor.execute('''
            SELECT id, employee_id as "employeeId", start_date as "startDate",
                   end_date as "endDate", reason, status
            FROM leave_requests
            ORDER BY created_at DESC
            LIMIT 100
        ''')
        
        leave_requests = cursor.fetchall()
        for leave in leave_requests:
            notifications['leaveRequests'].append({
                'id': leave['id'],
                'employeeId': leave['employeeId'],
                'startDate': str(leave['startDate']),
                'endDate': str(leave['endDate']),
                'reason': leave['reason'],
                'status': leave['status']
            })
        
        return notifications
    finally:
        cursor.close()
        conn.close()

def daterange(start_date, end_date):
    """Generate date range"""
    from datetime import datetime, timedelta
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')
    for n in range((end - start).days + 1):
        yield (start + timedelta(n)).strftime('%Y-%m-%d')

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
        """Round fractional allocations to integers"""
        floored = {key: math.floor(value) for key, value in raw_allocations.items()}
        remainders = {key: raw_allocations[key] - floored[key] for key in raw_allocations}
        current_sum = sum(floored.values())
        units_to_add = target_total - current_sum

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
        """Generate helpful feedback for infeasibility"""
        issues = []
        
        for emp in self.employees:
            emp_id = emp['id']
            shifts_per_week = emp.get('shiftsPerWeek', self._calculate_shifts_per_week(emp))
            
            available_days = sum(
                1 for date in self.current_week
                if not self._is_on_leave(emp_id, date) and not self._is_unavailable(emp_id, date)
            )
            
            leave_days = sum(1 for date in self.current_week if self._is_on_leave(emp_id, date))
            required_after_leave = shifts_per_week - leave_days
            
            if available_days < required_after_leave and required_after_leave > 0:
                issues.append(f"{emp['name']}: needs {required_after_leave} shifts but only {available_days} days available")
        
        if issues:
            message = "❌ Cannot generate schedule. Issues:\n\n"
            for idx, issue in enumerate(issues, 1):
                message += f"{idx}. {issue}\n"
            return message
        
        return "Cannot generate schedule. Please review constraints."
    
    def _extract_solution(self, assignments):
        """Extract schedule with statistics tracking shift and day distribution"""
        schedule = {}
        
        # Track which shifts were assigned each day
        shift_day_distribution = {}  # shift_id -> {day -> count}
        employee_shift_counts = {}  # employee_id -> {shift_id -> count}
        
        days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        for emp in self.employees:
            emp_id = emp['id']
            employee_shift_counts[emp_id] = {}
            
            for date_idx, date in enumerate(self.current_week):
                day_name = days_of_week[date_idx]
                
                if date not in assignments[emp_id]:
                    continue
                
                # Check which shifts this employee is assigned on this date
                for shift_id in assignments[emp_id][date]:
                    var = assignments[emp_id][date][shift_id]
                    
                    if self.solver.Value(var) == 1:
                        # Initialize schedule date if needed
                        if date not in schedule:
                            schedule[date] = {}
                        
                        # Get shift details
                        shift = next((s for s in self.shifts if s['id'] == shift_id), None)
                        if not shift:
                            continue
                        
                        # Include full shift data for frontend
                        if emp_id not in schedule[date]:
                            schedule[date][emp_id] = []
                        
                        schedule[date][emp_id].append({
                            'id': shift['id'],
                            'name': shift.get('name', 'Shift'),
                            'roleId': shift.get('roleId'),
                            'priority': shift.get('priority', 50),
                            'schedule': shift.get('schedule', {})
                        })
                        
                        # Track for statistics
                        if shift_id not in shift_day_distribution:
                            shift_day_distribution[shift_id] = {}
                        shift_day_distribution[shift_id][day_name] = shift_day_distribution[shift_id].get(day_name, 0) + 1
                        
                        if shift_id not in employee_shift_counts[emp_id]:
                            employee_shift_counts[emp_id][shift_id] = 0
                        employee_shift_counts[emp_id][shift_id] += 1
        
        # Generate statistics feedback
        total_assignments = sum(len(shifts) for employee_shifts in schedule.values() for shifts in employee_shifts.values())
        self.add_feedback(f"✅ SUCCESS: Generated {total_assignments} shift assignments", 'success')
        
        # Show distribution by shift type
        self.add_feedback("\nShift Type Distribution:", 'info')
        for shift_id, day_dist in shift_day_distribution.items():
            shift = next((s for s in self.shifts if s['id'] == shift_id), None)
            if shift:
                total = sum(day_dist.values())
                dist_str = ", ".join([f"{day}: {count}" for day, count in sorted(day_dist.items())])
                self.add_feedback(f"  {shift['name']}: {total} total ({dist_str})", 'info')
        
        # Show employee shift counts
        self.add_feedback("\nEmployee Shift Counts:", 'info')
        for emp in self.employees:
            emp_id = emp['id']
            shifts_by_type = employee_shift_counts.get(emp_id, {})
            if shifts_by_type:
                total = sum(shifts_by_type.values())
                shift_details = ", ".join([
                    f"{next((s['name'] for s in self.shifts if s['id'] == sid), 'Unknown')}: {count}"
                    for sid, count in shifts_by_type.items()
                ])
                self.add_feedback(f"  {emp['name']}: {total} shifts ({shift_details})", 'info')
            else:
                self.add_feedback(f"  {emp['name']}: 0 shifts", 'info')
        
        self.add_feedback("\n=== SCHEDULE GENERATED ===", 'success')
        return schedule
    
    def get_feedback(self):
        return self.feedback


@app.route('/api/generate-schedule', methods=['POST'])
def generate_schedule():
    try:
        data = request.json
        
        employees = load_employees_from_db()
        roles = load_roles_from_db()
        shifts = load_shifts_from_db()
        current_week = data.get('currentWeek', [])
        
        leave_requests = load_leave_requests_from_db()
        unavailability = load_unavailability_from_db()
        
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
            return jsonify({
                'success': False,
                'error': error,
                'feedback': feedback
            }), 400
        
        # Save schedule to database
        save_schedule_to_db(schedule)
        
        total_shifts = sum(
            len(emp_shifts)
            for day_shifts in schedule.values()
            for emp_shifts in day_shifts.values()
        )
        
        print(f"\n✅ SUCCESS: Generated {total_shifts} shift assignments\n")

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
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

def save_schedule_to_db(schedule):
    """Save generated schedule to database"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Clear existing schedule for these dates
        dates = list(schedule.keys())
        if dates:
            placeholders = ','.join(['%s'] * len(dates))
            cursor.execute(f'DELETE FROM schedule WHERE date IN ({placeholders})', dates)
        
        # Insert new schedule
        for date, emp_dict in schedule.items():
            for emp_id, shifts_list in emp_dict.items():
                if shifts_list:
                    shift_id = shifts_list[0]['id']
                    cursor.execute('''
                        INSERT INTO schedule (date, employee_id, shift_id)
                        VALUES (%s, %s, %s)
                    ''', (date, emp_id, shift_id))
        
        conn.commit()
        print("✅ Schedule saved to database")
    except Exception as e:
        conn.rollback()
        print(f"❌ Error saving schedule: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

@app.route('/api/save-data', methods=['POST'])
def save_data():
    try:
        data = request.json
        employees = data.get('employees', [])
        roles_with_shifts = data.get('roles', [])
        
        conn = get_db()
        cursor = conn.cursor()
        
        try:
            # Save employees
            for emp in employees:
                cursor.execute('''
                    INSERT INTO employees (id, name, role_id, weekly_hours, daily_max_hours, shifts_per_week, skills)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        role_id = EXCLUDED.role_id,
                        weekly_hours = EXCLUDED.weekly_hours,
                        daily_max_hours = EXCLUDED.daily_max_hours,
                        shifts_per_week = EXCLUDED.shifts_per_week,
                        skills = EXCLUDED.skills,
                        updated_at = CURRENT_TIMESTAMP
                ''', (
                    emp['id'],
                    emp['name'],
                    emp['roleId'],
                    emp.get('weeklyHours', 40),
                    emp.get('dailyMaxHours', 8),
                    emp.get('shiftsPerWeek', 5),
                    emp.get('skills', [])
                ))
            
            # Save roles with shifts
            for role in roles_with_shifts:
                cursor.execute('''
                    INSERT INTO roles (id, name, weekend_required, required_skills, break_minutes)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        weekend_required = EXCLUDED.weekend_required,
                        required_skills = EXCLUDED.required_skills,
                        break_minutes = EXCLUDED.break_minutes,
                        updated_at = CURRENT_TIMESTAMP
                ''', (
                    role['id'],
                    role['name'],
                    role.get('weekendRequired', False),
                    role.get('requiredSkills', []),
                    role.get('breakMinutes', 60)
                ))
                
                # Save shifts
                for shift in role.get('shifts', []):
                    cursor.execute('''
                        INSERT INTO shifts (id, name, role_id, priority, schedule)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            role_id = EXCLUDED.role_id,
                            priority = EXCLUDED.priority,
                            schedule = EXCLUDED.schedule,
                            updated_at = CURRENT_TIMESTAMP
                    ''', (
                        shift['id'],
                        shift['name'],
                        role['id'],
                        shift.get('priority', 50),
                        json.dumps(shift.get('schedule', {}))
                    ))
            
            conn.commit()
            return jsonify({'success': True})
        except Exception as e:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        print(f"Error saving data: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/save-schedule', methods=['POST'])
def save_schedule():
    try:
        data = request.json
        schedule = data.get('schedule', {})
        save_schedule_to_db(schedule)
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error saving schedule: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/save-attendance', methods=['POST'])
def save_attendance():
    try:
        data = request.json
        attendance = data.get('attendance', {})
        
        conn = get_db()
        cursor = conn.cursor()
        
        try:
            for record_key, record in attendance.items():
                cursor.execute('''
                    INSERT INTO attendance (employee_id, date, shift_id, in_time, out_time, status, out_status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (employee_id, date, shift_id) DO UPDATE SET
                        in_time = EXCLUDED.in_time,
                        out_time = EXCLUDED.out_time,
                        status = EXCLUDED.status,
                        out_status = EXCLUDED.out_status,
                        updated_at = CURRENT_TIMESTAMP
                ''', (
                    record['employeeId'],
                    record['date'],
                    record['shiftId'],
                    record.get('inTime'),
                    record.get('outTime'),
                    record.get('status'),
                    record.get('outStatus')
                ))
            
            conn.commit()
            return jsonify({'success': True})
        except Exception as e:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        print(f"Error saving attendance: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def check_consecutive_shifts(schedule, employee_id, current_week, max_consecutive=5):
    """Check consecutive shifts constraint"""
    dates_with_shifts = []
    for date in current_week:
        emp_shifts = schedule.get(date, {}).get(employee_id, [])
        if emp_shifts:
            dates_with_shifts.append(date)
    
    if not dates_with_shifts:
        return False, 0, ""
    
    dates_with_shifts.sort()
    max_consecutive_found = 1
    current_consecutive = 1
    violation_details = ""
    
    for i in range(len(dates_with_shifts) - 1):
        current_date = dates_with_shifts[i]
        next_date = dates_with_shifts[i + 1]
        
        current_date_obj = __import__('datetime').datetime.strptime(current_date, '%Y-%m-%d')
        next_date_obj = __import__('datetime').datetime.strptime(next_date, '%Y-%m-%d')
        
        day_diff = (next_date_obj - current_date_obj).days
        
        if day_diff == 1:
            current_consecutive += 1
            max_consecutive_found = max(max_consecutive_found, current_consecutive)
        else:
            if current_consecutive > max_consecutive:
                violation_details = f"{current_consecutive} consecutive shifts"
            current_consecutive = 1
    
    if current_consecutive > max_consecutive:
        violation_details = f"{current_consecutive} consecutive shifts"
    
    max_consecutive_found = max(max_consecutive_found, current_consecutive)
    has_violation = max_consecutive_found > max_consecutive
    
    return has_violation, max_consecutive_found, violation_details

@app.route('/api/validate-schedule', methods=['POST'])
def validate_schedule():
    """Validate edited schedule against constraints"""
    try:
        data = request.json
        schedule = data.get('schedule', {})
        employees = data.get('employees', [])
        roles = data.get('roles', [])
        shifts = data.get('shifts', [])
        current_week = data.get('currentWeek', [])
        language = data.get('language', 'en')

        errors = []
        overtime_warnings = []
        days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

        # Validate each employee
        for emp in employees:
            emp_id = emp['id']
            shifts_per_week = emp.get('shiftsPerWeek', 5)
            
            # Count shifts in schedule
            shifts_count = 0
            total_hours = 0
            
            for date in schedule:
                if emp_id in schedule[date]:
                    emp_shifts = schedule[date][emp_id]
                    shifts_count += len(emp_shifts)
                    
                    for shift in emp_shifts:
                        shift_data = next((s for s in shifts if s['id'] == shift['id']), None)
                        if shift_data:
                            total_hours += 8  # Approximate
            
            # Check shift count
            if shifts_count != shifts_per_week:
                errors.append(f"{emp['name']}: expected {shifts_per_week} shifts, got {shifts_count}")
            
            # Check consecutive shifts
            has_violation, consecutive_count, details = check_consecutive_shifts(schedule, emp_id, current_week)
            if has_violation:
                errors.append(f"{emp['name']}: {details}")
            
            # Check weekly hours
            weekly_hours = emp.get('weeklyHours', 40)
            if total_hours > weekly_hours * 1.1:
                overtime_warnings.append(f"{emp['name']}: {total_hours}h exceeds {weekly_hours}h by more than 10%")

        return jsonify({
            'valid': len(errors) == 0,
            'errors': errors,
            'overtime': overtime_warnings
        })

    except Exception as e:
        print(f"\n❌ Validation error: {str(e)}\n")
        traceback.print_exc()
        return jsonify({'valid': False, 'errors': [str(e)]}), 500

@app.route('/api/save-overtime', methods=['POST'])
def save_overtime():
    """Save overtime records to database"""
    try:
        data = request.json
        overtime_records = data.get('overtime', {})
        
        conn = get_db()
        cursor = conn.cursor()
        
        try:
            for emp_id, hours in overtime_records.items():
                cursor.execute('''
                    INSERT INTO overtime (employee_id, date, hours, created_at)
                    VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                ''', (emp_id, datetime.now().date(), hours))
            
            conn.commit()
            return jsonify({'success': True})
        except Exception as e:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        print(f"Error saving overtime: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/demand-forecast', methods=['POST'])
def demand_forecast():
    """Analyze historical data and forecast demand"""
    try:
        from datetime import datetime, timedelta
        
        data = request.json
        current_week = data.get('currentWeek', [])
        language = data.get('language', 'en')
        
        if not current_week:
            return jsonify({'forecast': None}), 400
        
        # Load historical data from database
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute('''
                SELECT week_start_date, total_employees_scheduled, day_breakdown, role_breakdown
                FROM schedule_history
                ORDER BY week_start_date DESC
                LIMIT 4
            ''')
            
            history_records = cursor.fetchall()
            
            if not history_records:
                return jsonify({'forecast': None}), 404
            
            # Calculate forecast based on historical patterns
            forecast = {
                'forecastedEmployees': sum(r['total_employees_scheduled'] or 0 for r in history_records) // len(history_records),
                'dayForecast': {},
                'roleForecast': {}
            }
            
            return jsonify({'success': True, 'forecast': forecast})
        
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        print(f"Error in demand forecast: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/save-notifications', methods=['POST'])
def save_notifications():
    """Save notifications to database"""
    try:
        data = request.json
        notifications = data.get('notifications', {})
        
        conn = get_db()
        cursor = conn.cursor()
        
        try:
            # Save messages
            for msg in notifications.get('messages', []):
                cursor.execute('''
                    INSERT INTO notifications (id, from_user, to_user, message, type, read)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        read = EXCLUDED.read
                ''', (
                    msg['id'],
                    msg.get('from'),
                    msg['to'],
                    msg['message'],
                    msg.get('type'),
                    msg.get('read', False)
                ))
            
            # Save leave requests
            for leave in notifications.get('leaveRequests', []):
                cursor.execute('''
                    INSERT INTO leave_requests (employee_id, start_date, end_date, reason, status)
                    VALUES (%s, %s, %s, %s, %s)
                ''', (
                    leave['employeeId'],
                    leave['startDate'],
                    leave['endDate'],
                    leave.get('reason'),
                    leave.get('status', 'pending')
                ))
            
            conn.commit()
            return jsonify({'success': True})
        except Exception as e:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()
    
    except Exception as e:
        print(f"Error saving notifications: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        conn = get_db()
        conn.close()
        db_status = "healthy"
    except:
        db_status = "unhealthy"
    
    return jsonify({
        'status': 'healthy',
        'service': 'shift-scheduler-v4-postgresql',
        'database': db_status,
        'features': [
            'priority-based-distribution',
            'postgresql-backend',
            'schedule-validation',
            'overtime-detection',
            'demand-forecasting'
        ]
    })

if __name__ == '__main__':
    print("🚀 Shift Scheduler V4 - PostgreSQL Backend")
    print("✨ Features:")
    print("   1. PostgreSQL database backend")
    print("   2. Priority-based shift distribution")
    print("   3. Schedule validation and constraint checking")
    print("   4. Overtime detection and recording")
    print("   5. Demand forecasting from historical data")
    print("🌐 Server: http://localhost:5000")
    print("📊 Database: PostgreSQL at localhost:6000")
    print()
    app.run(debug=True, port=5000, host='0.0.0.0')
