#!/usr/bin/env python3
"""
Verification script to test PostgreSQL setup and data integrity
Run this after setup to ensure everything is working correctly
"""

import sys
import requests
import json
from database import Database

def print_header(text):
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60 + "\n")

def verify_database_connection():
    """Test PostgreSQL connection"""
    print_header("1. TESTING DATABASE CONNECTION")
    try:
        db = Database()
        db.connect()
        print("✅ Connected to PostgreSQL successfully")
        
        # Test basic query
        employees = db.get_all_employees()
        print(f"✅ Database readable - Found {len(employees)} employees")
        
        db.disconnect()
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        return False

def verify_backend_health():
    """Test backend health endpoint"""
    print_header("2. TESTING BACKEND HEALTH")
    try:
        response = requests.get('http://localhost:5000/api/health', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Backend is healthy")
            print(f"   Service: {data.get('service')}")
            print(f"   Status: {data.get('status')}")
            print(f"   Features: {len(data.get('features', []))} features")
            return True
        else:
            print(f"❌ Backend returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend not responding: {str(e)}")
        return False

def verify_data_integrity():
    """Verify data is correctly stored and retrievable"""
    print_header("3. TESTING DATA INTEGRITY")
    try:
        db = Database()
        db.connect()
        
        checks = []
        
        # Check 1: Employees
        employees = db.get_all_employees()
        if len(employees) > 0:
            print(f"✅ Employees: {len(employees)} records")
            checks.append(True)
        else:
            print(f"⚠️  Employees: No records (expected after empty start)")
            checks.append(False)
        
        # Check 2: Roles
        roles = db.get_all_roles()
        if len(roles) > 0:
            total_shifts = sum(len(r.get('shifts', [])) for r in roles)
            print(f"✅ Roles: {len(roles)} records, {total_shifts} shifts")
            checks.append(True)
        else:
            print(f"⚠️  Roles: No records (expected after empty start)")
            checks.append(False)
        
        # Check 3: Schedule
        schedule = db.get_schedule()
        if len(schedule) > 0:
            total_shifts = sum(
                sum(len(emps) for emps in day.values())
                for day in schedule.values()
            )
            print(f"✅ Schedule: {len(schedule)} dates, {total_shifts} shifts")
            checks.append(True)
        else:
            print(f"⚠️  Schedule: No records (expected after empty start)")
            checks.append(False)
        
        # Check 4: Attendance
        attendance = db.get_attendance()
        if len(attendance) > 0:
            total_records = sum(len(emps) for emps in attendance.values())
            print(f"✅ Attendance: {len(attendance)} dates, {total_records} records")
            checks.append(True)
        else:
            print(f"⚠️  Attendance: No records (expected after empty start)")
            checks.append(False)
        
        # Check 5: Database structure
        try:
            cursor = db.conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema='public'
            """)
            table_count = cursor.fetchone()[0]
            cursor.close()
            
            if table_count >= 13:  # We have 14 tables
                print(f"✅ Database schema: {table_count} tables")
                checks.append(True)
            else:
                print(f"❌ Database schema: Only {table_count} tables (expected 14+)")
                checks.append(False)
        except Exception as e:
            print(f"❌ Could not verify schema: {str(e)}")
            checks.append(False)
        
        db.disconnect()
        return all(checks)
        
    except Exception as e:
        print(f"❌ Data integrity check failed: {str(e)}")
        return False

def verify_api_endpoints():
    """Test key API endpoints"""
    print_header("4. TESTING API ENDPOINTS")
    try:
        base_url = 'http://localhost:5000'
        passed = 0
        failed = 0
        
        # Test 1: Health
        try:
            response = requests.get(f'{base_url}/api/health')
            if response.status_code == 200:
                print("✅ GET /api/health")
                passed += 1
            else:
                print(f"❌ GET /api/health (status {response.status_code})")
                failed += 1
        except Exception as e:
            print(f"❌ GET /api/health (error: {str(e)})")
            failed += 1
        
        # Test 2: Save data endpoint (validate it accepts POST)
        try:
            test_data = {
                'employees': [],
                'roles': []
            }
            response = requests.post(
                f'{base_url}/api/save-data',
                json=test_data,
                timeout=5
            )
            if response.status_code == 200:
                print("✅ POST /api/save-data")
                passed += 1
            else:
                print(f"❌ POST /api/save-data (status {response.status_code})")
                failed += 1
        except Exception as e:
            print(f"❌ POST /api/save-data (error: {str(e)})")
            failed += 1
        
        # Test 3: Validate schedule endpoint
        try:
            test_data = {
                'schedule': {},
                'employees': [],
                'roles': [],
                'shifts': [],
                'currentWeek': []
            }
            response = requests.post(
                f'{base_url}/api/validate-schedule',
                json=test_data,
                timeout=5
            )
            if response.status_code in [200, 400]:  # 400 OK for empty validation
                print("✅ POST /api/validate-schedule")
                passed += 1
            else:
                print(f"❌ POST /api/validate-schedule (status {response.status_code})")
                failed += 1
        except Exception as e:
            print(f"❌ POST /api/validate-schedule (error: {str(e)})")
            failed += 1
        
        print(f"\nEndpoint Results: {passed} passed, {failed} failed")
        return failed == 0
        
    except Exception as e:
        print(f"❌ Endpoint testing failed: {str(e)}")
        return False

def main():
    """Run all verification tests"""
    print("\n")
    print("╔══════════════════════════════════════════════════════════╗")
    print("║     Shift Scheduler - PostgreSQL Setup Verification      ║")
    print("╚══════════════════════════════════════════════════════════╝")
    
    results = {}
    
    # Run tests
    results['Database Connection'] = verify_database_connection()
    results['Backend Health'] = verify_backend_health()
    results['Data Integrity'] = verify_data_integrity()
    results['API Endpoints'] = verify_api_endpoints()
    
    # Summary
    print_header("VERIFICATION SUMMARY")
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(results.values())
    
    print("\n" + "="*60)
    if all_passed:
        print("✅ ALL VERIFICATIONS PASSED")
        print("="*60)
        print("\n🎉 PostgreSQL migration is working correctly!")
        print("   The backend is ready to use.\n")
        return 0
    else:
        print("⚠️  SOME VERIFICATIONS FAILED")
        print("="*60)
        print("\n❌ Please check the errors above.")
        print("   See POSTGRESQL_SETUP.md for troubleshooting.\n")
        return 1

if __name__ == '__main__':
    sys.exit(main())
