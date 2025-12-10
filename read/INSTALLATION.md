# 🚀 Installation Instructions

## What You've Received

A complete **Shift Scheduler Pro** application with:
- ✅ React frontend (modern, responsive UI)
- ✅ Python backend (Google OR-Tools optimization)
- ✅ Sample data (8 employees, 3 roles, 7 shifts)
- ✅ Complete documentation
- ✅ Startup scripts for easy launch

## 📦 Package Contents

```
shift-scheduler/
├── Backend (Python + OR-Tools)
│   ├── shift_scheduler_backend.py   (Flask API server)
│   └── requirements.txt              (Python dependencies)
│
├── Frontend (React + Vite + Tailwind)
│   ├── ShiftSchedulerApp.jsx        (Main app component)
│   ├── main.jsx                     (React entry point)
│   ├── index.html                   (HTML template)
│   ├── index.css                    (Tailwind styles)
│   ├── package.json                 (Node dependencies)
│   ├── vite.config.js               (Build config)
│   ├── tailwind.config.js           (Style config)
│   └── postcss.config.js            (CSS processing)
│
├── Data Files
│   ├── employees.json               (Employee data)
│   └── roles.json                   (Roles & shift templates)
│
├── Documentation
│   ├── README.md                    (Complete documentation)
│   ├── QUICKSTART.md                (5-minute guide)
│   ├── SETUP_GUIDE.md               (Detailed setup guide)
│   └── PROJECT_OVERVIEW.md          (Project overview)
│
└── Utilities
    ├── start.sh                     (Linux/Mac launcher)
    └── start.bat                    (Windows launcher)
```

## ⚡ Quick Start (Recommended)

### Option A: Automatic Setup (Easiest)

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
```cmd
start.bat
```

The script will:
1. ✅ Install all Python dependencies
2. ✅ Install all Node.js dependencies
3. ✅ Start the backend server (port 5000)
4. ✅ Start the frontend server (port 3000)
5. ✅ Open the app in your browser

### Option B: Manual Setup

**Step 1: Install Python Dependencies**
```bash
pip install -r requirements.txt
```

**Step 2: Install Node Dependencies**
```bash
npm install
```

**Step 3: Start Backend (Terminal 1)**
```bash
python shift_scheduler_backend.py
```
Backend runs at: http://localhost:5000

**Step 4: Start Frontend (Terminal 2)**
```bash
npm run dev
```
Frontend runs at: http://localhost:3000

**Step 5: Open Browser**
```
http://localhost:3000
```

## 📋 System Requirements

### Minimum Requirements
- **Python**: 3.8 or higher
- **Node.js**: 16.0 or higher
- **npm**: 7.0 or higher
- **RAM**: 4GB (8GB recommended)
- **Disk**: 500MB free space

### Check Your System

**Check Python:**
```bash
python --version
# or
python3 --version
```
Should show: `Python 3.8.0` or higher

**Check Node.js:**
```bash
node --version
```
Should show: `v16.0.0` or higher

**Check npm:**
```bash
npm --version
```
Should show: `7.0.0` or higher

### Installing Prerequisites

**Python (if not installed):**
- Download from: https://www.python.org/downloads/
- Choose version 3.8 or higher
- During installation, check "Add Python to PATH"

**Node.js (if not installed):**
- Download from: https://nodejs.org/
- Choose LTS version (recommended)
- npm is included with Node.js

## 🔧 Detailed Installation Steps

### Step 1: Extract Files

Extract all files to a folder, for example:
- Windows: `C:\shift-scheduler\`
- Mac/Linux: `~/shift-scheduler/`

### Step 2: Open Terminal/Command Prompt

**Windows:**
1. Press `Win + R`
2. Type `cmd` and press Enter
3. Navigate to folder: `cd C:\shift-scheduler`

**Mac:**
1. Press `Cmd + Space`
2. Type "Terminal" and press Enter
3. Navigate to folder: `cd ~/shift-scheduler`

**Linux:**
1. Open Terminal (usually `Ctrl + Alt + T`)
2. Navigate to folder: `cd ~/shift-scheduler`

### Step 3: Install Backend Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `flask==3.0.0` - Web framework
- `flask-cors==4.0.0` - Cross-origin support
- `ortools==9.8.3296` - Google optimization tools

**If you get permission errors (Linux/Mac):**
```bash
pip install --user -r requirements.txt
```

**If pip is not found:**
```bash
python -m pip install -r requirements.txt
```

### Step 4: Install Frontend Dependencies

```bash
npm install
```

This installs:
- React 18
- Vite (build tool)
- Tailwind CSS (styling)
- Lucide React (icons)
- And other dependencies

**If npm is slow:**
```bash
npm install --registry https://registry.npmjs.org
```

### Step 5: Verify Installation

**Check backend:**
```bash
python shift_scheduler_backend.py
```
You should see:
```
🚀 Shift Scheduler Backend Starting...
📊 Using Google OR-Tools for optimization
🌐 Server running on http://localhost:5000
 * Running on http://127.0.0.1:5000
```
Press `Ctrl+C` to stop

**Check frontend (in new terminal):**
```bash
npm run dev
```
You should see:
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```
Press `Ctrl+C` to stop

### Step 6: Run Both Servers

**Terminal 1 (Backend):**
```bash
python shift_scheduler_backend.py
```
Keep this running ✅

**Terminal 2 (Frontend):**
```bash
npm run dev
```
Keep this running ✅

### Step 7: Access the Application

Open your browser and go to:
```
http://localhost:3000
```

You should see the Shift Scheduler Pro dashboard! 🎉

## 🎯 First Time Usage

### 1. Explore the Dashboard
- See statistics (8 employees, 3 roles, 7 shifts)
- View the modern dark-themed interface

### 2. Generate Your First Schedule
1. Click **"Generate Schedule"** button (top right)
2. Wait 2-5 seconds for OR-Tools to optimize
3. See success message ✅

### 3. View the Schedule
1. Click **"Schedule"** tab
2. See weekly calendar with shift assignments
3. Each employee has color-coded shifts

### 4. Manage Leaves
1. Click **"Leaves"** tab
2. Click any day for any employee to toggle leave
3. Red = On Leave, Green = Available
4. Generate schedule again to see adjustments

### 5. Export Schedule
1. In Schedule view, click **"Export Schedule"**
2. JSON file downloads with complete schedule
3. Use for records or further processing

## 🔍 Understanding Your Data

### employees.json

Sample employee included:
```json
{
  "id": "1",
  "name": "John Smith",
  "roleId": "role1",
  "weeklyHours": 40,
  "dailyMaxHours": 8,
  "shiftsPerWeek": 5,
  "skills": ["machining", "quality-control"]
}
```

**To add more employees:**
1. Open `employees.json` in text editor
2. Copy an existing employee block
3. Change the `id`, `name`, and other details
4. Save and refresh the app

### roles.json

Sample role with shifts:
```json
{
  "id": "role1",
  "name": "Machine Operator",
  "shifts": [
    {
      "id": "shift1",
      "name": "Morning Shift",
      "startTime": "06:00",
      "endTime": "14:00",
      "hours": 7,
      "daysOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "priority": 70
    }
  ]
}
```

**Priority Explanation:**
- `70` = High priority (more employees assigned)
- `50` = Normal priority (balanced coverage)
- `30` = Low priority (minimal coverage)

## 🐛 Troubleshooting

### "pip: command not found"
```bash
# Try python -m pip instead
python -m pip install -r requirements.txt
```

### "npm: command not found"
- Install Node.js from https://nodejs.org/
- Restart your terminal

### "Port 5000 already in use"
```bash
# Find what's using port 5000
# Linux/Mac:
lsof -ti:5000 | xargs kill

# Windows:
netstat -ano | findstr :5000
# Then kill that process in Task Manager
```

### "CORS errors in browser"
1. Make sure backend is running
2. Make sure you're accessing http://localhost:3000 (not 127.0.0.1)
3. Restart both servers

### "ModuleNotFoundError: No module named 'ortools'"
```bash
# Upgrade pip first
python -m pip install --upgrade pip

# Then install ortools
pip install ortools==9.8.3296
```

### "No schedule generated"
1. Check if you have too many leave requests
2. Verify employees have valid roleIds
3. Increase dailyMaxHours if needed
4. See SETUP_GUIDE.md for detailed troubleshooting

## 📚 Next Steps

### Learn More
1. **QUICKSTART.md** - 5-minute getting started guide
2. **README.md** - Complete feature documentation
3. **SETUP_GUIDE.md** - Advanced configuration
4. **PROJECT_OVERVIEW.md** - Technical deep dive

### Customize
1. Edit `employees.json` - Add your employees
2. Edit `roles.json` - Configure your roles and shifts
3. Use the Leaves UI - Mark vacation days
4. Generate schedules - Get optimized assignments

### Experiment
1. Try different priority values (0-100)
2. Add more employees
3. Create new shift types
4. Test various leave scenarios

## 💡 Pro Tips

1. **Start Simple**: Use the sample data first to understand the system
2. **Test Priorities**: Try priority values like 80, 50, 20 to see distribution
3. **Balance Hours**: Keep weeklyHours / dailyMaxHours between 4-6
4. **Export Often**: Save schedules for comparison and records
5. **Read Docs**: The SETUP_GUIDE has advanced tips and tricks

## ✅ Success Checklist

- [ ] Python 3.8+ installed
- [ ] Node.js 16+ installed
- [ ] All files extracted
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] App accessible at http://localhost:3000
- [ ] First schedule generated successfully

## 🎉 You're All Set!

Your Shift Scheduler Pro is now installed and ready to use!

If you run into any issues:
1. Check the troubleshooting section above
2. Read SETUP_GUIDE.md for detailed help
3. Make sure both servers are running

**Happy Scheduling! 🚀**

---

**Need Help?**
- Check documentation in the package
- Review troubleshooting guides
- Verify system requirements

**Version**: 1.0.0  
**Last Updated**: December 2024
