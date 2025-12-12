"""
Database utility module for PostgreSQL operations
Handles all database connections and operations while maintaining
the same interface as the original JSON-based system.
"""

import psycopg2
from psycopg2.extras import RealDictCursor, Json
import json
from datetime import datetime
import os

class Database:
    def __init__(self, host=None, port=None, user=None, password=None, dbname=None):
        """Initialize database connection parameters from environment or arguments"""
        self.host = host or os.getenv('POSTGRES_HOST', 'localhost')
        self.port = port or os.getenv('POSTGRES_PORT', '5432')
        self.user = user or os.getenv('POSTGRES_USER', 'scheduler_user')
        self.password = password or os.getenv('POSTGRES_PASSWORD', 'scheduler_password')
        self.dbname = dbname or os.getenv('POSTGRES_DB', 'shift_scheduler_db')
        self.conn = None

    def connect(self):
        """Establish database connection"""
        try:
            self.conn = psycopg2.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.dbname
            )
            print(f"✅ Connected to PostgreSQL: {self.dbname} at {self.host}:{self.port}")
            return self.conn
        except Exception as e:
            print(f"❌ Database connection failed: {str(e)}")
            raise

    def disconnect(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            print("✅ Disconnected from PostgreSQL")

    def execute_query(self, query, params=None, fetch=False):
        """Execute a query and optionally fetch results"""
        try:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(query, params)
            
            if fetch:
                result = cursor.fetchall()
            else:
                self.conn.commit()
                result = cursor.rowcount
            
            cursor.close()
            return result
        except Exception as e:
            self.conn.rollback()
            raise Exception(f"Query execution failed: {str(e)}")

    # ========================================================================
    # EMPLOYEES
    # ========================================================================

    def get_all_employees(self):
        """Fetch all employees"""
        query = """
        SELECT id, name, role_id, weekly_hours, daily_max_hours, 
               shifts_per_week, skills
        FROM employees
        ORDER BY name
        """
        rows = self.execute_query(query, fetch=True)
        return [{
            'id': row['id'],
            'name': row['name'],
            'roleId': row['role_id'],
            'weeklyHours': row['weekly_hours'],
            'dailyMaxHours': row['daily_max_hours'],
            'shiftsPerWeek': row['shifts_per_week'],
            'skills': row['skills'] or []
        } for row in rows]

    def save_employees(self, employees):
        """Save employees to database"""
        # Don't delete - will cause FK violations. Instead, use INSERT ... ON CONFLICT
        for emp in employees:
            query = """
            INSERT INTO employees 
            (id, name, role_id, weekly_hours, daily_max_hours, shifts_per_week, skills)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) 
            DO UPDATE SET name = %s, role_id = %s, weekly_hours = %s, 
                         daily_max_hours = %s, shifts_per_week = %s, skills = %s
            """
            params = (
                emp.get('id'),
                emp.get('name'),
                emp.get('roleId'),
                emp.get('weeklyHours', 40),
                emp.get('dailyMaxHours', 8),
                emp.get('shiftsPerWeek', 5),
                Json(emp.get('skills', [])),
                emp.get('name'),
                emp.get('roleId'),
                emp.get('weeklyHours', 40),
                emp.get('dailyMaxHours', 8),
                emp.get('shiftsPerWeek', 5),
                Json(emp.get('skills', []))
            )
            self.execute_query(query, params)

    # ========================================================================
    # ROLES
    # ========================================================================

    def get_all_roles(self):
        """Fetch all roles with shifts"""
        query = """
        SELECT id, name, weekend_required, required_skills, break_minutes
        FROM roles
        ORDER BY name
        """
        roles_rows = self.execute_query(query, fetch=True)
        
        roles = []
        for role_row in roles_rows:
            role = {
                'id': role_row['id'],
                'name': role_row['name'],
                'weekendRequired': role_row['weekend_required'],
                'requiredSkills': role_row['required_skills'] or [],
                'breakMinutes': role_row['break_minutes'],
                'shifts': self._get_shifts_for_role(role_row['id'])
            }
            roles.append(role)
        
        return roles

    def _get_shifts_for_role(self, role_id):
        """Get all shifts for a specific role"""
        query = """
        SELECT id, name, priority, days_of_week, schedule
        FROM shifts
        WHERE role_id = %s
        ORDER BY name
        """
        rows = self.execute_query(query, (role_id,), fetch=True)
        return [{
            'id': row['id'],
            'name': row['name'],
            'priority': row['priority'],
            'daysOfWeek': row['days_of_week'] or [],
            'schedule': row['schedule'] or {}
        } for row in rows]

    def save_roles(self, roles):
        """Save roles and their shifts to database"""
        # Don't delete - could cause FK violations. Use ON CONFLICT instead
        for role in roles:
            # Upsert role
            role_query = """
            INSERT INTO roles (id, name, weekend_required, required_skills, break_minutes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) 
            DO UPDATE SET name = %s, weekend_required = %s, required_skills = %s, break_minutes = %s
            """
            role_params = (
                role.get('id'),
                role.get('name'),
                role.get('weekendRequired', False),
                Json(role.get('requiredSkills', [])),
                role.get('breakMinutes', 60),
                role.get('name'),
                role.get('weekendRequired', False),
                Json(role.get('requiredSkills', [])),
                role.get('breakMinutes', 60)
            )
            self.execute_query(role_query, role_params)
            
            # Upsert shifts for this role
            for shift in role.get('shifts', []):
                shift_query = """
                INSERT INTO shifts (id, role_id, name, priority, days_of_week, schedule)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) 
                DO UPDATE SET role_id = %s, name = %s, priority = %s, days_of_week = %s, schedule = %s
                """
                shift_params = (
                    shift.get('id'),
                    role.get('id'),
                    shift.get('name'),
                    shift.get('priority', 50),
                    Json(shift.get('daysOfWeek', [])),
                    Json(shift.get('schedule', {})),
                    role.get('id'),
                    shift.get('name'),
                    shift.get('priority', 50),
                    Json(shift.get('daysOfWeek', [])),
                    Json(shift.get('schedule', {}))
                )
                self.execute_query(shift_query, shift_params)

    # ========================================================================
    # SCHEDULE
    # ========================================================================

    def get_schedule(self, start_date=None, end_date=None):
        """Fetch schedule, optionally filtered by date range"""
        if start_date and end_date:
            query = """
            SELECT schedule_date, employee_id, shift_id, role_id, shift_name, start_time, end_time
            FROM schedule
            WHERE schedule_date >= %s AND schedule_date <= %s
            ORDER BY schedule_date, employee_id
            """
            rows = self.execute_query(query, (start_date, end_date), fetch=True)
        else:
            query = """
            SELECT schedule_date, employee_id, shift_id, role_id, shift_name, start_time, end_time
            FROM schedule
            ORDER BY schedule_date, employee_id
            """
            rows = self.execute_query(query, fetch=True)
        
        # Convert to hierarchical format matching original JSON structure
        schedule_dict = {}
        for row in rows:
            date_key = row['schedule_date'].isoformat()
            if date_key not in schedule_dict:
                schedule_dict[date_key] = {}
            
            emp_id = row['employee_id']
            if emp_id not in schedule_dict[date_key]:
                schedule_dict[date_key][emp_id] = []
            
            schedule_dict[date_key][emp_id].append({
                'id': row['shift_id'],
                'name': row['shift_name'],
                'roleId': row['role_id'],
                'startTime': row['start_time'],
                'endTime': row['end_time']
            })
        
        return schedule_dict

    def save_schedule(self, schedule_dict):
        """Save schedule to database - clears old schedule and replaces with new"""
        # Clear old schedule to avoid stale data
        try:
            clear_query = "DELETE FROM schedule"
            self.execute_query(clear_query)
            print("🗑️  Cleared old schedule from database")
        except Exception as e:
            print(f"⚠️  Warning clearing old schedule: {e}")
        
        # Save new schedule
        total_saved = 0
        for date_str, employees in schedule_dict.items():
            schedule_date = date_str  # Already in YYYY-MM-DD format
            
            for employee_id, shifts in employees.items():
                for shift in shifts:
                    shift_id = shift.get('id')
                    role_id = shift.get('roleId')
                    start_time = shift.get('startTime')
                    end_time = shift.get('endTime')
                    
                    # Debug logging
                    if not start_time or not end_time:
                        print(f"⚠️  WARNING: Missing times for shift {shift_id} on {date_str}")
                        print(f"   startTime: {start_time}, endTime: {end_time}")
                        print(f"   Full shift object: {shift}")
                    
                    # Ensure shift exists in shifts table (might be missing if not in roles.json)
                    try:
                        cursor = self.conn.cursor()
                        cursor.execute("SELECT id FROM shifts WHERE id = %s", (shift_id,))
                        shift_exists = cursor.fetchone() is not None
                        cursor.close()
                        
                        if not shift_exists:
                            # Create the shift if it doesn't exist
                            shift_insert_query = """
                            INSERT INTO shifts (id, role_id, name, priority, days_of_week, schedule)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            ON CONFLICT (id) DO NOTHING
                            """
                            shift_params = (
                                shift_id,
                                role_id,
                                shift.get('name'),
                                shift.get('priority', 50),
                                Json(shift.get('daysOfWeek', [])),
                                Json(shift.get('schedule', {}))
                            )
                            try:
                                self.execute_query(shift_insert_query, shift_params)
                            except:
                                # Shift might already exist, continue
                                pass
                    except:
                        # Continue even if we can't check
                        pass
                    
                    query = """
                    INSERT INTO schedule 
                    (schedule_date, employee_id, shift_id, role_id, shift_name, start_time, end_time)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (schedule_date, employee_id, shift_id) 
                    DO UPDATE SET shift_name = %s, start_time = %s, end_time = %s, role_id = %s
                    """
                    params = (
                        schedule_date,
                        employee_id,
                        shift_id,
                        role_id,
                        shift.get('name'),
                        start_time,
                        end_time,
                        shift.get('name'),
                        start_time,
                        end_time,
                        role_id
                    )
                    self.execute_query(query, params)
                    total_saved += 1
        
        print(f"✅ Schedule saved: {total_saved} shifts to database")

    # ========================================================================
    # ATTENDANCE
    # ========================================================================

    def get_attendance(self, start_date=None, end_date=None):
        """Fetch attendance records"""
        if start_date and end_date:
            query = """
            SELECT attendance_date, employee_id, status, check_in_time, check_out_time, notes
            FROM attendance
            WHERE attendance_date >= %s AND attendance_date <= %s
            ORDER BY attendance_date
            """
            rows = self.execute_query(query, (start_date, end_date), fetch=True)
        else:
            query = """
            SELECT attendance_date, employee_id, status, check_in_time, check_out_time, notes
            FROM attendance
            ORDER BY attendance_date
            """
            rows = self.execute_query(query, fetch=True)
        
        # Convert to hierarchical format
        attendance_dict = {}
        for row in rows:
            date_key = row['attendance_date'].isoformat()
            if date_key not in attendance_dict:
                attendance_dict[date_key] = {}
            
            attendance_dict[date_key][row['employee_id']] = {
                'status': row['status'],
                'checkInTime': row['check_in_time'],
                'checkOutTime': row['check_out_time'],
                'notes': row['notes']
            }
        
        return attendance_dict

    def save_attendance(self, attendance_dict):
        """Save attendance to database"""
        # Use ON CONFLICT for upsert instead of DELETE to avoid FK violations
        for date_str, employees in attendance_dict.items():
            attendance_date = date_str
            
            # Handle two formats: dict of dicts or dict of strings
            if isinstance(employees, dict):
                for employee_id, record in employees.items():
                    # Ensure record is a dict, not a string
                    if isinstance(record, str):
                        continue  # Skip malformed entries
                    
                    query = """
                    INSERT INTO attendance 
                    (attendance_date, employee_id, status, check_in_time, check_out_time, notes)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (attendance_date, employee_id) 
                    DO UPDATE SET status = %s, check_in_time = %s, check_out_time = %s, notes = %s
                    """
                    params = (
                        attendance_date,
                        employee_id,
                        record.get('status'),
                        record.get('checkInTime'),
                        record.get('checkOutTime'),
                        record.get('notes'),
                        record.get('status'),
                        record.get('checkInTime'),
                        record.get('checkOutTime'),
                        record.get('notes')
                    )
                    self.execute_query(query, params)
            else:
                # If employees is not a dict (e.g., it's a string), skip this entry
                pass

    # ========================================================================
    # LEAVE REQUESTS
    # ========================================================================

    def get_leave_requests(self):
        """Fetch leave requests as dict with format {employee_id-date: True}"""
        query = """
        SELECT employee_id, leave_date
        FROM leave_requests
        """
        rows = self.execute_query(query, fetch=True)
        leave_dict = {}
        if rows:
            for row in rows:
                key = f"{row['employee_id']}-{row['leave_date']}"
                leave_dict[key] = True
        return leave_dict

    def save_leave_requests(self, leave_dict):
        """Save leave requests to database"""
        # Clear existing leave requests
        delete_query = "DELETE FROM leave_requests"
        self.execute_query(delete_query)
        
        # Insert new leave requests
        for key, value in leave_dict.items():
            if value:  # Only save if True
                parts = key.split('-')
                if len(parts) >= 2:
                    employee_id = parts[0]
                    leave_date = '-'.join(parts[1:])  # Handle dates with dashes
                    
                    query = """
                    INSERT INTO leave_requests (employee_id, leave_date)
                    VALUES (%s, %s)
                    ON CONFLICT (employee_id, leave_date) DO NOTHING
                    """
                    self.execute_query(query, (employee_id, leave_date))

    # ========================================================================
    # UNAVAILABILITY
    # ========================================================================

    def get_unavailability(self):
        """Fetch unavailability as dict with format {employee_id-date: True}"""
        query = """
        SELECT employee_id, unavailable_date
        FROM unavailability
        """
        rows = self.execute_query(query, fetch=True)
        unavail_dict = {}
        if rows:
            for row in rows:
                key = f"{row['employee_id']}-{row['unavailable_date']}"
                unavail_dict[key] = True
        return unavail_dict

    def save_unavailability(self, unavail_dict):
        """Save unavailability to database"""
        # Clear existing unavailability
        delete_query = "DELETE FROM unavailability"
        self.execute_query(delete_query)
        
        # Insert new unavailability
        for key, value in unavail_dict.items():
            if value:  # Only save if True
                parts = key.split('-')
                if len(parts) >= 2:
                    employee_id = parts[0]
                    unavail_date = '-'.join(parts[1:])  # Handle dates with dashes
                    
                    query = """
                    INSERT INTO unavailability (employee_id, unavailable_date)
                    VALUES (%s, %s)
                    ON CONFLICT (employee_id, unavailable_date) DO NOTHING
                    """
                    self.execute_query(query, (employee_id, unavail_date))

    # ========================================================================
    # ATTENDANCE HISTORY
    # ========================================================================

    def get_attendance_history(self):
        """Fetch attendance history"""
        query = """
        SELECT history_date, employee_id, status, check_in_time, check_out_time, notes, recorded_at
        FROM attendance_history
        ORDER BY history_date
        """
        rows = self.execute_query(query, fetch=True)
        
        history_dict = {}
        for row in rows:
            date_key = row['history_date'].isoformat()
            if date_key not in history_dict:
                history_dict[date_key] = {}
            
            history_dict[date_key][row['employee_id']] = {
                'status': row['status'],
                'checkInTime': row['check_in_time'],
                'checkOutTime': row['check_out_time'],
                'notes': row['notes']
            }
        
        return history_dict

    def add_to_attendance_history(self, attendance_date, employee_id, status, 
                                  check_in_time=None, check_out_time=None, notes=None):
        """Add an attendance record to history"""
        query = """
        INSERT INTO attendance_history 
        (history_date, employee_id, status, check_in_time, check_out_time, notes)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        params = (attendance_date, employee_id, status, check_in_time, check_out_time, notes)
        self.execute_query(query, params)

    # ========================================================================
    # SCHEDULE HISTORY
    # ========================================================================

    def get_schedule_history(self):
        """Fetch schedule history"""
        query = """
        SELECT history_date, employee_id, shift_id, shift_name, role_id, start_time, end_time, recorded_at
        FROM schedule_history
        ORDER BY history_date
        """
        rows = self.execute_query(query, fetch=True)
        
        history_dict = {}
        for row in rows:
            date_key = row['history_date'].isoformat()
            if date_key not in history_dict:
                history_dict[date_key] = {}
            
            if row['employee_id'] not in history_dict[date_key]:
                history_dict[date_key][row['employee_id']] = []
            
            history_dict[date_key][row['employee_id']].append({
                'id': row['shift_id'],
                'name': row['shift_name'],
                'roleId': row['role_id'],
                'startTime': row['start_time'],
                'endTime': row['end_time']
            })
        
        return history_dict

    def add_to_schedule_history(self, schedule_date, employee_id, shift_id, 
                               shift_name, role_id, start_time, end_time):
        """Add a schedule record to history"""
        query = """
        INSERT INTO schedule_history 
        (history_date, employee_id, shift_id, shift_name, role_id, start_time, end_time)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        params = (schedule_date, employee_id, shift_id, shift_name, role_id, start_time, end_time)
        self.execute_query(query, params)

    # ========================================================================
    # LEAVE REQUESTS
    # ========================================================================

    def get_leave_requests(self):
        """Fetch all leave requests as a dict (key: employee_id-date)"""
        query = """
        SELECT employee_id, leave_date, reason, status
        FROM leave_requests
        WHERE status = 'approved'
        """
        rows = self.execute_query(query, fetch=True)
        
        leave_dict = {}
        for row in rows:
            key = f"{row['employee_id']}-{row['leave_date'].isoformat()}"
            leave_dict[key] = {
                'reason': row['reason'],
                'status': row['status']
            }
        
        return leave_dict

    def save_leave_request(self, employee_id, leave_date, reason='', status='approved'):
        """Save a leave request"""
        query = """
        INSERT INTO leave_requests (employee_id, leave_date, reason, status)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (employee_id, leave_date) 
        DO UPDATE SET reason = %s, status = %s
        """
        params = (employee_id, leave_date, reason, status, reason, status)
        self.execute_query(query, params)

    # ========================================================================
    # UNAVAILABILITY
    # ========================================================================

    def get_unavailability(self):
        """Fetch unavailability as a dict (key: employee_id-date)"""
        query = """
        SELECT employee_id, unavailable_date, reason
        FROM unavailability
        """
        rows = self.execute_query(query, fetch=True)
        
        unavail_dict = {}
        for row in rows:
            key = f"{row['employee_id']}-{row['unavailable_date'].isoformat()}"
            unavail_dict[key] = {'reason': row['reason']}
        
        return unavail_dict

    # ========================================================================
    # NOTIFICATIONS
    # ========================================================================

    def get_notifications(self):
        """Fetch all notifications as a dict"""
        query = "SELECT notification_key, notification_data FROM notifications"
        rows = self.execute_query(query, fetch=True)
        
        notif_dict = {}
        for row in rows:
            notif_dict[row['notification_key']] = row['notification_data']
        
        return notif_dict

    def save_notifications(self, notifications_dict):
        """Save notifications"""
        # Use ON CONFLICT for upsert instead of DELETE
        for key, data in notifications_dict.items():
            query = """
            INSERT INTO notifications (notification_key, notification_data)
            VALUES (%s, %s)
            ON CONFLICT (notification_key) 
            DO UPDATE SET notification_data = %s
            """
            params = (key, Json(data), Json(data))
            self.execute_query(query, params)

    # ========================================================================
    # OVERTIME
    # ========================================================================

    def get_overtime(self):
        """Fetch all overtime records"""
        query = """
        SELECT employee_id, overtime_date, hours, notes
        FROM overtime
        ORDER BY overtime_date
        """
        rows = self.execute_query(query, fetch=True)
        
        overtime_dict = {}
        for row in rows:
            date_key = row['overtime_date'].isoformat()
            if date_key not in overtime_dict:
                overtime_dict[date_key] = {}
            
            overtime_dict[date_key][row['employee_id']] = {
                'hours': float(row['hours']) if row['hours'] else 0,
                'notes': row['notes']
            }
        
        return overtime_dict

    def save_overtime(self, overtime_dict):
        """Save overtime records"""
        for date_str, employees in overtime_dict.items():
            for employee_id, record in employees.items():
                query = """
                INSERT INTO overtime (employee_id, overtime_date, hours, notes)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (employee_id, overtime_date) 
                DO UPDATE SET hours = %s, notes = %s
                """
                params = (
                    employee_id,
                    date_str,
                    record.get('hours'),
                    record.get('notes'),
                    record.get('hours'),
                    record.get('notes')
                )
                self.execute_query(query, params)

    # ========================================================================
    # DEMAND FORECAST
    # ========================================================================

    def save_forecast(self, forecast_data):
        """Save demand forecast"""
        forecast_date = forecast_data.get('forecastDate', datetime.now().isoformat()).split('T')[0]
        
        query = """
        INSERT INTO demand_forecast (forecast_date, week_start_date, week_end_date, forecast_data)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (forecast_date) 
        DO UPDATE SET forecast_data = %s
        """
        params = (
            forecast_date,
            forecast_data.get('weekStartDate'),
            forecast_data.get('weekEndDate'),
            Json(forecast_data),
            Json(forecast_data)
        )
        self.execute_query(query, params)

    # ========================================================================
    # LOGIN
    # ========================================================================

    def get_login_data(self):
        """Fetch login configuration"""
        query = "SELECT login_data FROM login LIMIT 1"
        rows = self.execute_query(query, fetch=True)
        
        if rows:
            return rows[0]['login_data']
        return {}

    def save_login_data(self, login_data):
        """Save login configuration"""
        # Clear existing data and insert new
        self.execute_query("DELETE FROM login")
        
        query = """
        INSERT INTO login (login_key, login_data)
        VALUES (%s, %s)
        """
        params = ('default', Json(login_data))
        self.execute_query(query, params)


# Global database instance
_db_instance = None

def get_db():
    """Get or create global database instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = Database()
        _db_instance.connect()
    return _db_instance
