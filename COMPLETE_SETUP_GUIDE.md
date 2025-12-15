# 🚀 Complete Setup & Run Guide - Shift Scheduler

## ✅ Status Check
- ✅ Frontend: FIXED (was AuthModule.jsx duplicate parameter issue)
- ✅ Backend: FIXED (missing psycopg2 dependency)
- ✅ Ready to run!

---

## 📋 Prerequisites Checklist

### System Requirements
- [x] Node.js 16+ (for frontend)
- [x] Python 3.8+ (for backend)
- [x] npm or yarn (for package management)
- [x] PostgreSQL 12+ (optional, fallback to JSON)
- [x] 2GB+ RAM recommended
- [x] Port 5173 (frontend), 5000 (backend) available

### What We Fixed
1. **Frontend Issue**: AuthModule.jsx had duplicate `loadScheduleFromDatabase` parameter
   - ✅ FIXED: Simplified function signatures, removed conflicting parameters
   
2. **Backend Issue**: Missing psycopg2 PostgreSQL driver
   - ✅ FIXED: Installed psycopg2-binary package
   
3. **Dependencies Issue**: ortools version was unavailable (9.8.3296)
   - ✅ FIXED: Updated to available version (9.14.6206)

---

## 🎯 Quick Start (5 minutes)

### Step 1: Install Frontend Dependencies
```bash
cd /home/tw10517/v12
npm install
```
**Expected output**: "added X packages"

### Step 2: Start Frontend Development Server
```bash
npm run dev
```
**Expected output**:
```
VITE v4.5.14 ready in XXX ms
➜ Local: http://localhost:3001/
```

### Step 3: Open Application in Browser
```
http://localhost:3001
```

### Step 4: Install Backend Dependencies (in new terminal)
```bash
cd /home/tw10517/v12
pip install -r requirements.txt
```

### Step 5: Start Backend Server
```bash
python shift_scheduler_backend_v2.py
```
**Expected output**:
```
WARNING in app.py:XXX
  * Running on http://127.0.0.1:5000
```

### Step 6: Login to Application
- **Manager**: 
  - User ID: `manager`
  - Password: `manager_password`
- **Employee**:
  - User ID: `10501`
  - Password: `10501@twave`

---

## 🛠️ Detailed Setup Instructions

### Frontend Setup

#### 1. Navigate to Project Directory
```bash
cd /home/tw10517/v12
```

#### 2. Install Dependencies
```bash
npm install
```
This will:
- Install React, Vite, Tailwind CSS
- Install UI libraries (lucide-react, XLSX)
- Create node_modules directory

#### 3. Verify Installation
```bash
npm --version  # Should be 8.0+
node --version # Should be 16.0+
```

#### 4. Start Development Server
```bash
npm run dev
```

**Available Commands**:
```bash
npm run dev      # Start development server (http://localhost:3001)
npm run build    # Build for production
npm run preview  # Preview production build locally
```

#### 5. Build for Production (when ready)
```bash
npm run build
# This creates a 'dist' folder ready to deploy
```

---

### Backend Setup

#### 1. Install Python Dependencies
```bash
cd /home/tw10517/v12
pip install -r requirements.txt
```

This installs:
- `flask==3.0.0` - Web framework
- `flask-cors==4.0.0` - Cross-origin support
- `ortools==9.14.6206` - Optimization library
- `psycopg2-binary==2.9.9` - PostgreSQL driver
- `requests==2.31.0` - HTTP requests

#### 2. Verify Installation
```bash
python -c "import flask, psycopg2, ortools; print('All imports OK')"
```

#### 3. Start Backend Server
```bash
python shift_scheduler_backend_v2.py
```

**Expected Output**:
```
WARNING in app.py:XXX
  * Running on http://127.0.0.1:5000
  * Press CTRL+C to quit
```

**Available Routes**:
- `GET /api/load-schedule` - Load saved schedule
- `GET /api/load-leave-unavailability` - Load leave requests
- `POST /api/generate-schedule` - Generate new schedule
- `POST /api/save-data` - Save employee/role/shift data
- `POST /api/logout` - Save data before logout

---

## 🐳 Docker Setup (Alternative)

### Prerequisites
- Docker installed
- Docker Compose installed

### Start Everything with Docker

#### 1. Build and Start Containers
```bash
cd /home/tw10517/v12
docker-compose up --build
```

#### 2. What Starts
- Frontend server on `http://localhost:3001`
- Backend API on `http://localhost:5000`
- PostgreSQL database on `localhost:5432`

#### 3. Stop Containers
```bash
docker-compose down
```

#### 4. View Logs
```bash
docker-compose logs -f backend      # Backend logs
docker-compose logs -f frontend     # Frontend logs (if enabled)
```

---

## 🔌 Port Information

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Frontend | 3001 | http://localhost:3001 | React dev server |
| Backend | 5000 | http://localhost:5000 | Python Flask API |
| PostgreSQL | 5432 | localhost:5432 | Database (optional) |

**If ports are already in use**:
```bash
# Find and kill process on port
lsof -i :3001  # Check port 3001
kill -9 <PID>  # Kill process

# Or change port in vite.config.js
```

---

## ✅ Verification Checklist

### Frontend is Running
- [ ] http://localhost:3001 loads
- [ ] No errors in browser console
- [ ] Can see login page

### Backend is Running
- [ ] http://localhost:5000/api/health returns 200
- [ ] No errors in terminal
- [ ] Can make API requests

### Database Connection
- [ ] Backend starts without "connection refused"
- [ ] Can load schedule data
- [ ] Can save data without errors

### Application Features
- [ ] Can login as manager
- [ ] Can login as employee
- [ ] Can view schedules
- [ ] Can manage employees
- [ ] Can export reports

---

## 🐛 Troubleshooting

### Problem 1: "Port 3000 is in use"

**Solution**:
```bash
# Kill the process using the port
lsof -i :3000
kill -9 <PID>

# Or use different port
npx vite --port 3002
```

### Problem 2: "Cannot find module 'react'"

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
npm run dev
```

### Problem 3: "psycopg2 not found"

**Solution**:
```bash
pip install psycopg2-binary
pip install -r requirements.txt
```

### Problem 4: "Python module not found"

**Solution**:
```bash
# Reinstall all Python dependencies
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

### Problem 5: "Cannot connect to API"

**Solutions**:
1. Check backend is running: `python shift_scheduler_backend_v2.py`
2. Check port 5000 is open: `lsof -i :5000`
3. Check firewall isn't blocking
4. Verify API_BASE_URL in constants.js is correct

### Problem 6: "Database connection failed"

**Solution**: 
The app falls back to JSON files, so this isn't fatal:
```bash
# If you want PostgreSQL:
# 1. Start PostgreSQL
# 2. Run migrations
python migrate.py

# For now, JSON storage is used
```

### Problem 7: "npm install hangs or fails"

**Solution**:
```bash
# Clear cache
npm cache clean --force

# Use different registry
npm install --registry https://registry.npmjs.org/

# Or use yarn
yarn install
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (Client)                      │
│              http://localhost:3001                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │  React App (ShiftSchedulerApp_v2.jsx)             │ │
│  │  - Login & Authentication                          │ │
│  │  - Employee Management                             │ │
│  │  - Schedule Management                             │ │
│  │  - Attendance Tracking                             │ │
│  │  - Notifications & Exports                         │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP Requests
                 ▼
┌─────────────────────────────────────────────────────────┐
│       BACKEND (Python Flask API)                         │
│       http://localhost:5000                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │  shift_scheduler_backend_v2.py                    │ │
│  │  - Authentication                                  │ │
│  │  - Schedule Generation (with ortools)             │ │
│  │  - Data Persistence                                │ │
│  │  - API Endpoints                                   │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────┬────────────────────────────────────────┘
                 │ SQL/JSON
                 ▼
┌─────────────────────────────────────────────────────────┐
│              DATABASE LAYER                              │
│  ┌──────────────────┐      ┌──────────────────────┐    │
│  │  PostgreSQL DB   │  OR  │   JSON Files         │    │
│  │  (Port 5432)     │      │  (Fallback Storage)  │    │
│  └──────────────────┘      └──────────────────────┘    │
│  - Employees                - employees.json            │
│  - Roles                    - roles.json                │
│  - Shifts                   - shifts.json               │
│  - Schedules                - schedule.json             │
│  - Attendance               - attendance.json           │
│  - Leave Requests           - notifications.json        │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Key Files

### Frontend
- `main.jsx` - Application entry point
- `ShiftSchedulerApp_v2.jsx` - Main React component
- `index.html` - HTML template
- `src/modules/*` - Business logic modules
- `src/utils/constants.js` - Centralized configuration

### Backend
- `shift_scheduler_backend_v2.py` - Flask API server
- `database.py` - Database configuration
- `migrate.py` - Database migration script
- `init.sql` - Database schema

### Configuration
- `package.json` - Frontend dependencies
- `requirements.txt` - Backend dependencies
- `vite.config.js` - Frontend build config
- `docker-compose.yml` - Docker configuration
- `.env.example` - Environment variables template

---

## 🔐 Default Credentials

### Manager Login
```
User ID: manager
Password: manager_password
```

### Employee Login (Example)
```
User ID: 10501
Password: 10501@twave
```

**Note**: Employee password format is: `{userId}@twave`

---

## 📝 Common Tasks

### View Frontend Logs
```bash
# In the terminal running npm run dev
# Logs appear automatically
```

### View Backend Logs
```bash
# In the terminal running the Flask server
# Logs appear automatically
```

### Check if Ports Are Available
```bash
# Linux/Mac
lsof -i :3001  # Frontend port
lsof -i :5000  # Backend port
lsof -i :5432  # Database port

# Windows
netstat -ano | findstr :3001
netstat -ano | findstr :5000
```

### Clean Build
```bash
# Remove all build artifacts
rm -rf dist node_modules
npm install
npm run dev
```

### Reset Database
```bash
# To reset to JSON storage (no PostgreSQL needed):
# - Just restart the server
# - JSON files will be used automatically

# To use PostgreSQL:
python migrate.py
```

---

## 🚀 Production Deployment

### Build Frontend
```bash
npm run build
# Creates optimized production build in 'dist' folder
```

### Deploy to Server
```bash
# Option 1: Use built-in server
npx vite preview --host 0.0.0.0 --port 80

# Option 2: Use Nginx (recommended)
# Copy dist/* to /var/www/html
# Configure nginx to proxy /api to backend
```

### Deploy Backend
```bash
# Option 1: Direct Python
nohup python shift_scheduler_backend_v2.py &

# Option 2: Use Gunicorn (recommended)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 shift_scheduler_backend_v2:app

# Option 3: Docker
docker build -t shift-scheduler-backend .
docker run -p 5000:5000 shift-scheduler-backend
```

---

## 📞 Support

### Getting Help
1. Check console for errors: F12 → Console tab
2. Check terminal for backend errors
3. Review troubleshooting section above
4. Check documentation files in repo

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Cannot find module 'react'" | Dependency missing | Run `npm install` |
| "Port 5000 is in use" | Backend already running | Kill process or use different port |
| "psycopg2 not found" | Python dependency missing | Run `pip install psycopg2-binary` |
| "API connection failed" | Backend not running | Start `python shift_scheduler_backend_v2.py` |

---

## ✨ Next Steps

1. ✅ Run frontend: `npm run dev`
2. ✅ Run backend: `python shift_scheduler_backend_v2.py`
3. ✅ Open browser: `http://localhost:3001`
4. ✅ Login and test features
5. ✅ Build for production when ready: `npm run build`

---

**Status**: ✅ **READY TO RUN**  
**Last Updated**: December 15, 2025  
**Version**: 2.1 - Full Setup Guide
