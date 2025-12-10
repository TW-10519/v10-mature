# Quick Start Guide ⚡

Get your shift scheduler running in 5 minutes!

## 🚀 Super Quick Start

### 1. One-Command Setup (Linux/Mac)
```bash
chmod +x start.sh && ./start.sh
```

### 1. One-Command Setup (Windows)
```cmd
start.bat
```

That's it! The app will:
- Install all dependencies
- Start the backend (Python)
- Start the frontend (React)
- Open at http://localhost:3000

---

## 📦 Manual Setup

If the script doesn't work, follow these steps:

### Step 1: Install Dependencies
```bash
# Install Python packages
pip install -r requirements.txt

# Install Node packages
npm install
```

### Step 2: Start Backend
```bash
python shift_scheduler_backend.py
```
✅ Backend running on http://localhost:5000

### Step 3: Start Frontend (in new terminal)
```bash
npm run dev
```
✅ Frontend running on http://localhost:3000

---

## 🎯 First Time Usage

### 1. Open the App
Go to http://localhost:3000 in your browser

### 2. Check Dashboard
- See 8 employees loaded
- 3 roles configured
- 7 shift types available

### 3. Generate Schedule
1. Click **"Calculate Capacity"** (optional, see available shifts)
2. Click **"Generate Schedule"** (creates optimal schedule)
3. Wait 2-5 seconds ⏳
4. Success! ✅

### 4. View Schedule
1. Click **"Schedule"** tab
2. See weekly calendar with shift assignments
3. Click **"Export Schedule"** to download

---

## 🎨 Try These Features

### Manage Leaves
1. Go to **"Leaves"** tab
2. Click any day for any employee
3. Toggle between Working (green) and Leave (red)
4. Generate schedule again to see changes

### View Capacity
1. Click **"Calculate Capacity"**
2. See how many shifts each role can fill
3. This accounts for leaves!

### Export Data
1. Go to **"Schedule"** tab
2. Click **"Export Schedule"**
3. Get JSON file with complete schedule

---

## 📝 Customize Your Data

### Edit Employees
1. Open `employees.json`
2. Add/edit employees:
```json
{
  "id": "9",
  "name": "New Employee",
  "roleId": "role1",
  "weeklyHours": 40,
  "dailyMaxHours": 8,
  "shiftsPerWeek": 5,
  "skills": ["machining"]
}
```
3. Refresh the page

### Edit Roles & Shifts
1. Open `roles.json`
2. Add new shifts to any role:
```json
{
  "id": "shift8",
  "name": "Night Shift",
  "startTime": "22:00",
  "endTime": "06:00",
  "hours": 7,
  "daysOfWeek": ["Monday", "Tuesday", "Wednesday"],
  "priority": 40
}
```
3. Refresh the page

---

## ⚡ Pro Tips

1. **Higher Priority = More Coverage**
   - Set priority to 80 for critical shifts
   - Set priority to 30 for optional shifts

2. **Balance Your Employees**
   - Keep shiftsPerWeek between 4-6 for best results
   - Match weeklyHours / dailyMaxHours

3. **Use Leaves Strategically**
   - Mark holidays and vacations
   - System automatically adjusts capacity

4. **Export Regularly**
   - Save schedules for record-keeping
   - Compare different scheduling scenarios

---

## 🐛 Common Issues

### "Could not generate schedule"
- **Too many leaves**: Reduce leave requests
- **Insufficient employees**: Add more employees
- **Overlapping constraints**: Increase dailyMaxHours

### "Backend not connecting"
- Check Python server is running (Terminal 1)
- Should see "Running on http://localhost:5000"
- Restart: `python shift_scheduler_backend.py`

### "Page won't load"
- Check Node server is running (Terminal 2)
- Should see "Local: http://localhost:3000"
- Restart: `npm run dev`

---

## 📚 Next Steps

- Read [README.md](README.md) for detailed documentation
- Read [SETUP_GUIDE.md](SETUP_GUIDE.md) for advanced configuration
- Customize employees.json and roles.json for your needs
- Experiment with different priority values

---

## 🎉 You're Ready!

The shift scheduler is now running and ready to optimize your workforce scheduling.

**Happy Scheduling! 🚀**
