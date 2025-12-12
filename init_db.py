"""
Database initialization script for Shift Scheduler
Creates all necessary tables and migrates data from JSON files to PostgreSQL
"""

import psycopg2
from psycopg2 import sql
import json
import os
from datetime import datetime

# Database connection parameters
DB_CONFIG = {
    'host': 'localhost',
    'port': '6000',
    'database': 'mydb',
    'user': 'postgres',
    'password': 'postgres'
}

def connect_db():
    """Create database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except psycopg2.Error as e:
        print(f"❌ Database connection failed: {e}")
        raise

def create_database_if_not_exists():
    """Create the database if it doesn't exist"""
    try:
        # Connect to default postgres database to create mydb
        default_config = DB_CONFIG.copy()
        default_config['database'] = 'postgres'
        conn = psycopg2.connect(**default_config)
        conn.autocommit = True
        cursor = conn.cursor()
        
        try:
            cursor.execute(f"CREATE DATABASE {DB_CONFIG['database']}")
            print(f"✅ Created database '{DB_CONFIG['database']}'")
        except psycopg2.Error as e:
            if 'already exists' in str(e):
                print(f"ℹ️ Database '{DB_CONFIG['database']}' already exists")
            else:
                raise
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"⚠️ Could not create database: {e}")
        raise

def create_tables(conn):
    """Create all database tables"""
    cursor = conn.cursor()
    
    try:
        # Roles table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS roles (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                weekend_required BOOLEAN DEFAULT FALSE,
                required_skills TEXT[] DEFAULT '{}',
                break_minutes INTEGER DEFAULT 60,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Employees table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS employees (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                role_id VARCHAR(255) NOT NULL REFERENCES roles(id) ON DELETE SET NULL,
                weekly_hours INTEGER DEFAULT 40,
                daily_max_hours INTEGER DEFAULT 8,
                shifts_per_week INTEGER DEFAULT 5,
                skills TEXT[] DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Shifts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS shifts (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                role_id VARCHAR(255) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                priority INTEGER DEFAULT 50,
                schedule JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Schedule table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS schedule (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                employee_id VARCHAR(255) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                shift_id VARCHAR(255) NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(date, employee_id)
            )
        ''')
        
        # Attendance table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                employee_id VARCHAR(255) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                shift_id VARCHAR(255) NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
                in_time VARCHAR(5),
                out_time VARCHAR(5),
                status VARCHAR(50) DEFAULT 'pending',
                out_status VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(employee_id, date, shift_id)
            )
        ''')
        
        # Leave requests table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS leave_requests (
                id SERIAL PRIMARY KEY,
                employee_id VARCHAR(255) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                reason TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Unavailability table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS unavailability (
                id SERIAL PRIMARY KEY,
                employee_id VARCHAR(255) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(employee_id, date)
            )
        ''')
        
        # Notifications table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(255) PRIMARY KEY,
                from_user VARCHAR(255),
                to_user VARCHAR(255) NOT NULL,
                message TEXT,
                type VARCHAR(50),
                read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Schedule history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS schedule_history (
                id SERIAL PRIMARY KEY,
                week_start_date DATE NOT NULL UNIQUE,
                total_employees_scheduled INTEGER,
                day_breakdown JSONB,
                role_breakdown JSONB,
                absence_rate FLOAT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Attendance history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS attendance_history (
                id SERIAL PRIMARY KEY,
                employee_id VARCHAR(255) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                shift_id VARCHAR(255),
                shift_name VARCHAR(255),
                in_time VARCHAR(5),
                out_time VARCHAR(5),
                status VARCHAR(50),
                out_status VARCHAR(50),
                period VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(employee_id, date, shift_id)
            )
        ''')
        
        # Overtime table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS overtime (
                id SERIAL PRIMARY KEY,
                employee_id VARCHAR(255) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                hours FLOAT NOT NULL,
                reason TEXT,
                approved BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        print("✅ All tables created successfully")
        
    except psycopg2.Error as e:
        conn.rollback()
        print(f"❌ Error creating tables: {e}")
        raise
    finally:
        cursor.close()

def migrate_roles(conn):
    """Migrate roles from JSON to database"""
    try:
        with open('roles.json', 'r', encoding='utf-8') as f:
            roles = json.load(f)
        
        cursor = conn.cursor()
        for role in roles:
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
        
        conn.commit()
        print(f"✅ Migrated {len(roles)} roles")
        cursor.close()
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error migrating roles: {e}")
        raise

def migrate_employees(conn):
    """Migrate employees from JSON to database"""
    try:
        with open('employees.json', 'r', encoding='utf-8') as f:
            employees = json.load(f)
        
        cursor = conn.cursor()
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
        
        conn.commit()
        print(f"✅ Migrated {len(employees)} employees")
        cursor.close()
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error migrating employees: {e}")
        raise

def migrate_shifts(conn):
    """Migrate shifts from JSON to database"""
    try:
        with open('shifts.json', 'r', encoding='utf-8') as f:
            shifts = json.load(f)
        
        cursor = conn.cursor()
        for shift in shifts:
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
                shift['roleId'],
                shift.get('priority', 50),
                json.dumps(shift.get('schedule', {}))
            ))
        
        conn.commit()
        print(f"✅ Migrated {len(shifts)} shifts")
        cursor.close()
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error migrating shifts: {e}")
        raise

def migrate_schedule(conn):
    """Migrate schedule from JSON to database"""
    try:
        with open('schedule.json', 'r', encoding='utf-8') as f:
            schedule_data = json.load(f)
        
        cursor = conn.cursor()
        count = 0
        
        for date_str, employees_dict in schedule_data.items():
            for emp_id, shifts_list in employees_dict.items():
                if shifts_list:  # Only if employee has shifts on this date
                    shift = shifts_list[0]  # Get first shift
                    cursor.execute('''
                        INSERT INTO schedule (date, employee_id, shift_id)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (date, employee_id) DO UPDATE SET
                            shift_id = EXCLUDED.shift_id,
                            updated_at = CURRENT_TIMESTAMP
                    ''', (date_str, emp_id, shift['id']))
                    count += 1
        
        conn.commit()
        print(f"✅ Migrated {count} schedule entries")
        cursor.close()
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error migrating schedule: {e}")
        raise

def migrate_attendance(conn):
    """Migrate attendance from JSON to database"""
    try:
        with open('attendance.json', 'r', encoding='utf-8') as f:
            attendance_data = json.load(f)
        
        cursor = conn.cursor()
        count = 0
        
        for record_key, record in attendance_data.items():
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
            count += 1
        
        conn.commit()
        print(f"✅ Migrated {count} attendance records")
        cursor.close()
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error migrating attendance: {e}")
        raise

def migrate_notifications(conn):
    """Migrate notifications from JSON to database"""
    try:
        with open('notifications.json', 'r', encoding='utf-8') as f:
            notif_data = json.load(f)
        
        cursor = conn.cursor()
        count = 0
        
        # Migrate messages
        for msg in notif_data.get('messages', []):
            # Skip if to_user is missing
            to_user = msg.get('to') or msg.get('toId') or 'unknown'
            cursor.execute('''
                INSERT INTO notifications (id, from_user, to_user, message, type, read)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    from_user = EXCLUDED.from_user,
                    to_user = EXCLUDED.to_user,
                    message = EXCLUDED.message,
                    type = EXCLUDED.type,
                    read = EXCLUDED.read
            ''', (
                msg['id'],
                msg.get('from') or 'manager',
                to_user,
                msg['message'],
                msg.get('type'),
                msg.get('read', False)
            ))
            count += 1
        
        # Migrate leave requests
        for leave in notif_data.get('leaveRequests', []):
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
            count += 1
        
        conn.commit()
        print(f"✅ Migrated {count} notification records")
        cursor.close()
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error migrating notifications: {e}")
        raise

def migrate_history(conn):
    """Migrate schedule and attendance history"""
    try:
        cursor = conn.cursor()
        count = 0
        
        # Migrate schedule history
        try:
            with open('schedule_history.json', 'r', encoding='utf-8') as f:
                schedule_history = json.load(f)
            
            for week_start, data in schedule_history.items():
                cursor.execute('''
                    INSERT INTO schedule_history (week_start_date, total_employees_scheduled, day_breakdown, role_breakdown, absence_rate)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (week_start_date) DO UPDATE SET
                        total_employees_scheduled = EXCLUDED.total_employees_scheduled,
                        day_breakdown = EXCLUDED.day_breakdown,
                        role_breakdown = EXCLUDED.role_breakdown,
                        absence_rate = EXCLUDED.absence_rate
                ''', (
                    week_start,
                    data.get('totalEmployeesScheduled'),
                    json.dumps(data.get('dayBreakdown', {})),
                    json.dumps(data.get('roleBreakdown', {})),
                    data.get('absenceRate', 0)
                ))
                count += 1
        except FileNotFoundError:
            pass
        
        # Migrate attendance history
        try:
            with open('attendance_history.json', 'r', encoding='utf-8') as f:
                attendance_history = json.load(f)
            
            for period, emp_data in attendance_history.items():
                for emp_id, dates_data in emp_data.items():
                    for date, record in dates_data.items():
                        cursor.execute('''
                            INSERT INTO attendance_history (employee_id, date, shift_id, shift_name, in_time, out_time, status, out_status, period)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (employee_id, date, shift_id) DO UPDATE SET
                                shift_name = EXCLUDED.shift_name,
                                in_time = EXCLUDED.in_time,
                                out_time = EXCLUDED.out_time,
                                status = EXCLUDED.status,
                                out_status = EXCLUDED.out_status,
                                period = EXCLUDED.period
                        ''', (
                            emp_id,
                            date,
                            record.get('shiftId'),
                            record.get('shiftName'),
                            record.get('inTime'),
                            record.get('outTime'),
                            record.get('status'),
                            record.get('outStatus'),
                            period
                        ))
                        count += 1
        except FileNotFoundError:
            pass
        
        conn.commit()
        print(f"✅ Migrated {count} history records")
        cursor.close()
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error migrating history: {e}")
        raise

def init_database():
    """Initialize database and migrate all data"""
    print("🚀 Starting database initialization and migration...")
    print(f"📊 Connecting to PostgreSQL at {DB_CONFIG['host']}:{DB_CONFIG['port']}")
    
    # Create database first
    create_database_if_not_exists()
    
    conn = connect_db()
    
    try:
        print("\n📋 Creating tables...")
        create_tables(conn)
        
        print("\n🔄 Migrating data from JSON files...\n")
        migrate_roles(conn)
        migrate_employees(conn)
        migrate_shifts(conn)
        migrate_schedule(conn)
        migrate_attendance(conn)
        migrate_notifications(conn)
        migrate_history(conn)
        
        print("\n✅ Database initialization and migration completed successfully!")
        
    finally:
        conn.close()

if __name__ == '__main__':
    init_database()
