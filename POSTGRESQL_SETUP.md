# PostgreSQL Migration Setup Guide

## Overview
This document explains how to set up and run the Shift Scheduler with PostgreSQL instead of JSON file storage. All functionality and logic remain exactly the same - only the storage mechanism has changed.

## Prerequisites
- Docker and Docker Compose installed
- Python 3.11+ (if running locally without Docker)

## Quick Start with Docker

### 1. Start PostgreSQL and Backend with Docker Compose

```bash
# Navigate to the project directory
cd /home/tw10548/v10-mature

# Build and start all services
docker-compose up -d

# Check if services are running
docker-compose ps
```

This will:
- Start a PostgreSQL 15 database container
- Create all required tables and indexes
- Start the Flask backend server
- Both services will be on the same Docker network

### 2. Migrate Data from JSON Files to PostgreSQL

Once both services are running:

```bash
# Run the migration script
docker-compose exec backend python migrate.py
```

The migration script will:
- Read all existing JSON files (employees.json, roles.json, schedule.json, etc.)
- Convert them to the PostgreSQL schema
- Preserve all data exactly as-is
- Complete in seconds

Output example:
```
============================================================
JSON TO POSTGRESQL MIGRATION
============================================================

📋 Migrating employees...
   ✅ 12 employees migrated
📋 Migrating roles and shifts...
   ✅ 2 roles and 8 shifts migrated
📋 Migrating schedule...
   ✅ 1250 schedule entries migrated (5 dates)
📋 Migrating attendance...
   ✅ 45 attendance records migrated (5 dates)
...

============================================================
✅ MIGRATION COMPLETED SUCCESSFULLY
============================================================
```

### 3. Verify the Backend is Running

```bash
# Check health endpoint
curl http://localhost:5000/api/health

# Output:
# {
#   "status": "healthy",
#   "service": "shift-scheduler-v4-priority-based-distribution",
#   "features": [...]
# }
```

## Architecture

### Database Schema
PostgreSQL tables created automatically:
- `employees` - Employee information with skills
- `roles` - Department/role definitions
- `shifts` - Shift definitions with schedules
- `schedule` - Current schedule assignments
- `attendance` - Current attendance records
- `attendance_history` - Historical attendance
- `schedule_history` - Historical schedules
- `leave_requests` - Employee leave requests
- `unavailability` - Unavailable dates
- `notifications` - System notifications
- `overtime` - Overtime records
- `demand_forecast` - Forecast data
- `login` - Login configuration

All tables have appropriate indexes for fast queries.

### Data Flow

```
Frontend (React)
      ↓
Backend (Flask) 
      ↓
Database Module (database.py)
      ↓
PostgreSQL (Docker Container)
```

The backend maintains the exact same API endpoints and responses as before. The `database.py` module handles all conversion between the API format and PostgreSQL storage.

## File Structure

```
.
├── docker-compose.yml      # Docker services configuration
├── Dockerfile              # Backend container definition
├── init.sql               # PostgreSQL schema (runs on startup)
├── database.py            # Database abstraction layer
├── migrate.py             # JSON to PostgreSQL migration script
├── shift_scheduler_backend_v2.py  # Updated backend (uses database.py)
├── requirements.txt       # Python dependencies (added psycopg2)
└── [JSON files]          # Keep these as backup (optional)
```

## API Endpoints (Unchanged)

All API endpoints work exactly the same as before:

```
POST /api/generate-schedule      - Generate shifts
POST /api/save-data              - Save employees and roles
POST /api/save-schedule          - Save schedule
POST /api/save-attendance        - Save attendance
POST /api/validate-schedule      - Validate schedule
POST /api/save-overtime          - Save overtime records
POST /api/demand-forecast        - Generate forecast
POST /api/save-notifications     - Save notifications
GET  /api/health                 - Health check
```

## Local Development (Without Docker)

If you want to run locally without Docker:

### 1. Install PostgreSQL
```bash
# On Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# On macOS
brew install postgresql

# On Windows
# Download from https://www.postgresql.org/download/windows/
```

### 2. Create Database and User
```bash
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE USER scheduler_user WITH PASSWORD 'scheduler_password';
CREATE DATABASE shift_scheduler_db OWNER scheduler_user;
GRANT ALL PRIVILEGES ON DATABASE shift_scheduler_db TO scheduler_user;
\q
```

### 3. Import Schema
```bash
psql -U scheduler_user -d shift_scheduler_db -f init.sql
```

### 4. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 5. Run Backend
```bash
python shift_scheduler_backend_v2.py
```

### 6. Migrate Data
```bash
python migrate.py
```

## Environment Variables

The database connection uses these environment variables (defaults shown):

```bash
POSTGRES_HOST=localhost      # or 'postgres' in Docker
POSTGRES_PORT=5432
POSTGRES_USER=scheduler_user
POSTGRES_PASSWORD=scheduler_password
POSTGRES_DB=shift_scheduler_db
```

These can be overridden in:
- `docker-compose.yml` (for Docker)
- `.env` file (for local development)
- Command line exports

## Backup and Recovery

### Backup PostgreSQL Database
```bash
# Using Docker
docker-compose exec postgres pg_dump \
  -U scheduler_user \
  shift_scheduler_db > backup.sql

# Without Docker
pg_dump -U scheduler_user shift_scheduler_db > backup.sql
```

### Restore PostgreSQL Database
```bash
# Using Docker
docker-compose exec -T postgres psql \
  -U scheduler_user \
  shift_scheduler_db < backup.sql

# Without Docker
psql -U scheduler_user shift_scheduler_db < backup.sql
```

### Keep JSON Files as Backup
The JSON files are not deleted by the migration script. You can:
- Keep them as a backup
- Delete them if you have PostgreSQL backups
- Re-import them anytime with `migrate.py`

## Troubleshooting

### PostgreSQL Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Backend Connection Errors
```bash
# Check backend logs
docker-compose logs backend

# Verify database is ready (wait 10-15 seconds after starting)
docker-compose logs postgres | grep "ready to accept"
```

### Data Not Found After Migration
```bash
# Verify migration ran successfully
docker-compose logs backend | grep "MIGRATION"

# Check tables and data
docker-compose exec postgres psql \
  -U scheduler_user \
  -d shift_scheduler_db \
  -c "SELECT COUNT(*) FROM employees;"
```

### Need to Re-run Migration
```bash
# Clear all data and re-migrate
docker-compose down    # Stops containers, keeps volume
docker-compose up -d   # Restart
docker-compose exec backend python migrate.py
```

## Performance Considerations

### Indexes
PostgreSQL automatically uses indexes for:
- Schedule lookups by date and employee
- Attendance lookups by date
- Employee lookups by role
- Fast date range queries

### Query Optimization
The `database.py` module uses:
- Connection pooling via psycopg2
- RealDictCursor for efficient dict conversion
- Parameterized queries to prevent SQL injection
- Proper indexes on all foreign keys

### Data Volume
For typical usage (8 employees, 1 year of data):
- Database size: ~5-10 MB
- Query response time: <100ms
- No performance degradation vs. JSON files

## Security Notes

⚠️ **Important**: The current credentials are for development only.

For production:
1. Change `scheduler_password` in `docker-compose.yml`
2. Use strong passwords (20+ characters)
3. Restrict PostgreSQL network access
4. Use environment variables or secrets management
5. Enable SSL/TLS for remote connections
6. Regular backups to secure storage

## Rollback to JSON (If Needed)

If you need to go back to JSON files:

```bash
# Export all data from PostgreSQL as JSON
python -c "
from database import get_db
import json

db = get_db()

# Export employees
with open('employees_backup.json', 'w') as f:
    json.dump(db.get_all_employees(), f, indent=2, ensure_ascii=False)

# Export roles
with open('roles_backup.json', 'w') as f:
    json.dump(db.get_all_roles(), f, indent=2, ensure_ascii=False)

# ... repeat for other tables
"

# Then update the backend to use JSON again
# (Revert the changes in shift_scheduler_backend_v2.py)
```

## FAQ

**Q: Will the logic/functionality change?**
A: No. Only the storage layer changed. All scheduling, validation, and forecasting logic remains identical.

**Q: Can I use existing JSON files?**
A: Yes! The migration script reads them automatically.

**Q: How do I backup my data?**
A: Use `pg_dump` to create SQL backups, or keep the JSON files as snapshots.

**Q: What if I have more complex requirements?**
A: The schema is normalized and flexible. Contact support for custom modifications.

**Q: Is PostgreSQL slower than JSON?**
A: No, it's typically faster with proper indexing and better for concurrent access.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the logs: `docker-compose logs`
3. Verify the health endpoint: `curl http://localhost:5000/api/health`
4. Check PostgreSQL directly: `docker-compose exec postgres psql -U scheduler_user -d shift_scheduler_db -c "\\dt"`

## License

This migration guide and code follows the same license as the main project.
