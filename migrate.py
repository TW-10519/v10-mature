#!/usr/bin/env python3
"""
Migration script: Convert JSON files to PostgreSQL
This script reads from existing JSON files and populates the PostgreSQL database.
Run this once to migrate your data.
"""

import json
import os
from database import Database

def migrate_json_to_postgresql():
    """Migrate all data from JSON files to PostgreSQL"""
    
    # Initialize database connection
    db = Database()
    db.connect()
    
    print("\n" + "="*60)
    print("JSON TO POSTGRESQL MIGRATION")
    print("="*60 + "\n")
    
    try:
        # 1. Migrate Employees
        print("📋 Migrating employees...")
        if os.path.exists('employees.json'):
            with open('employees.json', 'r', encoding='utf-8') as f:
                employees = json.load(f)
            db.save_employees(employees)
            print(f"   ✅ {len(employees)} employees migrated")
        else:
            print("   ⚠️  employees.json not found, skipping")
        
        # 2. Migrate Roles and Shifts
        print("📋 Migrating roles and shifts...")
        if os.path.exists('roles.json'):
            with open('roles.json', 'r', encoding='utf-8') as f:
                roles = json.load(f)
            db.save_roles(roles)
            total_shifts = sum(len(role.get('shifts', [])) for role in roles)
            print(f"   ✅ {len(roles)} roles and {total_shifts} shifts migrated")
            
            # Also collect shift IDs from roles for foreign key tracking
            shifts_from_roles = set()
            for role in roles:
                for shift in role.get('shifts', []):
                    shifts_from_roles.add(shift.get('id'))
        else:
            print("   ⚠️  roles.json not found, skipping")
            shifts_from_roles = set()
        
        # Also extract any shifts from schedule.json that might not be in roles
        print("📋 Extracting additional shifts from schedule...")
        if os.path.exists('schedule.json'):
            with open('schedule.json', 'r', encoding='utf-8') as f:
                schedule_data = json.load(f)
            
            additional_shifts = set()
            for date_entry in schedule_data.values():
                for emp_id, shifts_list in date_entry.items():
                    for shift in shifts_list:
                        shift_id = shift.get('id')
                        if shift_id and shift_id not in shifts_from_roles:
                            additional_shifts.add(shift_id)
            
            if additional_shifts:
                print(f"   ⚠️  Found {len(additional_shifts)} shifts in schedule not in roles")
                print(f"   ℹ️  These will be added during schedule migration")
        
        # 3. Migrate Schedule
        print("📋 Migrating schedule...")
        if os.path.exists('schedule.json'):
            with open('schedule.json', 'r', encoding='utf-8') as f:
                schedule = json.load(f)
            db.save_schedule(schedule)
            total_entries = sum(
                sum(len(emp_shifts) for emp_shifts in day_emps.values())
                for day_emps in schedule.values()
            )
            print(f"   ✅ {total_entries} schedule entries migrated ({len(schedule)} dates)")
        else:
            print("   ⚠️  schedule.json not found, skipping")
        
        # 4. Migrate Attendance
        print("📋 Migrating attendance...")
        if os.path.exists('attendance.json'):
            with open('attendance.json', 'r', encoding='utf-8') as f:
                attendance = json.load(f)
            
            # Convert flat format to date-keyed format for consistency
            attendance_dict = {}
            for key, record in attendance.items():
                date = record.get('date')
                emp_id = record.get('employeeId')
                
                if date and emp_id:
                    if date not in attendance_dict:
                        attendance_dict[date] = {}
                    
                    attendance_dict[date][emp_id] = {
                        'status': record.get('status', 'present'),
                        'checkInTime': record.get('inTime'),
                        'checkOutTime': record.get('outTime'),
                        'notes': record.get('notes', '')
                    }
            
            if attendance_dict:
                db.save_attendance(attendance_dict)
                total_records = sum(len(emps) for emps in attendance_dict.values())
                print(f"   ✅ {total_records} attendance records migrated ({len(attendance_dict)} dates)")
            else:
                print(f"   ⚠️  No valid attendance records found")
        else:
            print("   ⚠️  attendance.json not found, skipping")
        
        # 5. Migrate Notifications
        print("📋 Migrating notifications...")
        if os.path.exists('notifications.json'):
            with open('notifications.json', 'r', encoding='utf-8') as f:
                notifications = json.load(f)
            db.save_notifications(notifications)
            print(f"   ✅ {len(notifications)} notifications migrated")
        else:
            print("   ⚠️  notifications.json not found, skipping")
        
        # 6. Migrate Overtime (if exists)
        print("📋 Migrating overtime...")
        if os.path.exists('overtime.json'):
            with open('overtime.json', 'r', encoding='utf-8') as f:
                overtime = json.load(f)
            db.save_overtime(overtime)
            total_overtime = sum(len(emps) for emps in overtime.values())
            print(f"   ✅ {total_overtime} overtime records migrated")
        else:
            print("   ⚠️  overtime.json not found, skipping")
        
        # 7. Migrate Login data (if exists)
        print("📋 Migrating login configuration...")
        if os.path.exists('login.json'):
            with open('login.json', 'r', encoding='utf-8') as f:
                login = json.load(f)
            db.save_login_data(login)
            print(f"   ✅ Login configuration migrated")
        else:
            print("   ⚠️  login.json not found, skipping")
        
        print("\n" + "="*60)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("="*60)
        print("\nℹ️  JSON files have been read and data stored in PostgreSQL.")
        print("   You can keep the JSON files as backup or delete them.")
        print("   The backend will now use PostgreSQL for all operations.\n")
        
    except Exception as e:
        print(f"\n❌ MIGRATION FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        db.disconnect()
        exit(1)
    
    db.disconnect()


if __name__ == '__main__':
    migrate_json_to_postgresql()
