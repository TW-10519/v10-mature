# Shift Scheduler Pro - Complete Setup Guide

## 📋 Table of Contents
1. [System Requirements](#system-requirements)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running the Application](#running-the-application)
5. [Using the Application](#using-the-application)
6. [Understanding the Algorithm](#understanding-the-algorithm)
7. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements
- **Python**: 3.8 or higher
- **Node.js**: 16.0 or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 500MB free space

### Supported Operating Systems
- Windows 10/11
- macOS 10.15+
- Linux (Ubuntu 20.04+, Debian 10+, etc.)

---

## Installation

### Step 1: Clone or Download the Project

Download all project files to a directory, for example: `shift-scheduler/`

### Step 2: Install Python Dependencies

Open a terminal/command prompt in the project directory and run:

```bash
pip install -r requirements.txt
```

This will install:
- Flask (web framework)
- Flask-CORS (cross-origin requests)
- OR-Tools (optimization engine)

### Step 3: Install Node.js Dependencies

In the same directory, run:

```bash
npm install
```

This will install:
- React and React DOM
- Vite (build tool)
- Tailwind CSS (styling)
- Lucide React (icons)

---

## Configuration

### employees.json

This file contains employee data. Each employee must have:

```json
{
  "id": "unique_id",
  "name": "Employee Name",
  "roleId": "role_id_from_roles.json",
  "weeklyHours": 40,
  "dailyMaxHours": 8,
  "shiftsPerWeek": 5,
  "skills": ["skill1", "skill2"]
}
```

**Key Fields:**
- `weeklyHours`: Total hours they should work per week
- `dailyMaxHours`: Maximum hours in a single day
- `shiftsPerWeek`: How many shifts to assign per week (auto-calculated as weeklyHours / dailyMaxHours)

### roles.json

This file contains role definitions and shift templates:

```json
{
  "id": "role_id",
  "name": "Role Name",
  "weekendRequired": true/false,
  "requiredSkills": ["skill1"],
  "breakMinutes": 60,
  "shifts": [
    {
      "id": "shift_id",
      "name": "Shift Name",
      "startTime": "06:00",
      "endTime": "14:00",
      "hours": 7,
      "daysOfWeek": ["Monday", "Tuesday"],
      "priority": 70
    }
  ]
}
```

**Key Fields:**
- `priority`: Range 0-100. Higher priority shifts get more employees assigned
- `daysOfWeek`: Array of days this shift operates
- `hours`: Work hours (after break deduction)

**Priority Examples:**
- `priority: 80` = High priority (more coverage)
- `priority: 50` = Normal priority (equal coverage)
- `priority: 20` = Low priority (minimal coverage)

---

## Running the Application

### Option 1: Use Startup Scripts (Easiest)

**Linux/Mac:**
```bash
./start.sh
```

**Windows:**
```
start.bat
```

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
python shift_scheduler_backend.py
```
Server starts on http://localhost:5000

**Terminal 2 - Frontend:**
```bash
npm run dev
```
Server starts on http://localhost:3000

### Access the Application

Open your browser and go to: **http://localhost:3000**

---

## Using the Application

### 1. Dashboard View

**Purpose**: Overview of system status and quick actions

**Features:**
- View statistics (employees, roles, shifts, leaves)
- Calculate shift capacity
- Generate schedules
- See optimization status

**Actions:**
1. Click **"Calculate Capacity"** to see how many shifts are available per role
2. Click **"Generate Schedule"** to create an optimized weekly schedule

### 2. Schedule View

**Purpose**: View and export the generated schedule

**Features:**
- Weekly calendar grid showing all assignments
- Color-coded shifts
- Leave indicators
- Export to JSON

**How to Read:**
- Each row = One employee
- Each column = One day of the week
- Colored boxes = Assigned shifts with times
- Red cells = Employee on leave

**Export:**
Click **"Export Schedule"** to download the schedule as JSON

### 3. Employees View

**Purpose**: View all employee information

**Features:**
- Complete employee roster
- Role assignments
- Weekly hours configuration
- Skills listing

**Information Displayed:**
- Name and role
- Weekly hours target
- Daily maximum hours
- Shifts per week (in green badge)
- Skills

### 4. Leaves View

**Purpose**: Manage employee leave requests

**Features:**
- Interactive calendar per employee
- Toggle leave status
- Visual indicators (red = leave, green = working)

**How to Use:**
1. Find the employee
2. Click on any day in their calendar
3. Red = Leave marked
4. Green = Available to work

---

## Understanding the Algorithm

### How Scheduling Works

#### Phase 1: Calculate Capacity
```
For each role:
  Total Available Shifts = 
    Sum of (employee.shiftsPerWeek) 
    - Count of (leaves in the week)
```

**Example:**
- Role has 5 employees
- Each works 5 shifts/week = 25 total shifts
- 2 employees have 1 day leave each = -2 shifts
- **Capacity = 23 shifts**

#### Phase 2: Distribute by Priority

Shifts are allocated based on their priority weight:

```
For each shift type:
  Weight = shift.priority / sum(all priorities)
  Allocated Shifts = Total Capacity × Weight
```

**Example:**
- Morning Shift (priority 70)
- Evening Shift (priority 30)
- Total = 100
- If capacity = 20 shifts:
  - Morning gets: 20 × (70/100) = 14 shifts
  - Evening gets: 20 × (30/100) = 6 shifts

#### Phase 3: OR-Tools Optimization

The CP-SAT solver creates an optimal assignment by:

1. **Creating Variables**: One boolean variable for each possible assignment
   - employee × date × shift = decision variable

2. **Applying Constraints**:
   - ✅ Employee's weekly shift limit
   - ✅ Daily maximum hours
   - ✅ Leave requests (hard constraint)
   - ✅ One shift instance per day per employee
   - ✅ Weekend availability requirements

3. **Optimizing Objective**:
   - Maximize total shift coverage
   - Maximize fairness (balanced workload)
   - Meet target assignments per shift type

4. **Solving**:
   - Uses constraint propagation
   - Explores solution space
   - Finds optimal or near-optimal solution
   - Time limit: 30 seconds

### Algorithm Strengths

✅ **Constraint Satisfaction**: Guarantees all rules are followed
✅ **Optimality**: Finds best possible solution
✅ **Fairness**: Balances workload automatically
✅ **Scalability**: Handles 100+ employees efficiently
✅ **Flexibility**: Easy to add new constraints

---

## Troubleshooting

### Issue: Backend won't start

**Error**: `ModuleNotFoundError: No module named 'flask'`

**Solution**:
```bash
pip install --upgrade -r requirements.txt
```

### Issue: Frontend won't start

**Error**: `Cannot find module 'react'`

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: CORS errors in browser

**Error**: `Access to fetch... has been blocked by CORS policy`

**Solution**:
1. Verify backend is running on port 5000
2. Check vite.config.js has correct proxy configuration
3. Restart both servers

### Issue: No schedule generated

**Error**: "Could not generate a valid schedule"

**Possible Causes & Solutions**:

1. **Too many constraints**
   - Reduce employee leave requests
   - Increase daily maximum hours
   - Add more employees to understaffed roles

2. **Invalid data**
   - Check all employees have valid roleIds
   - Verify shifts have daysOfWeek specified
   - Ensure shift hours fit within dailyMaxHours

3. **Insufficient capacity**
   - Run "Calculate Capacity" first
   - Check if capacity is too low
   - Add more employees or reduce shifts needed

### Issue: Slow performance

**Problem**: Schedule takes 30+ seconds to generate

**Solutions**:
1. Reduce number of employees per role
2. Simplify shift templates (fewer shift types)
3. Reduce the week range (currently 7 days)
4. Use more powerful hardware

### Issue: JSON files not loading

**Error**: 404 errors for employees.json or roles.json

**Solution**:
1. Ensure JSON files are in the project root directory
2. Check JSON files are valid (use JSONLint.com)
3. Verify Vite dev server is serving static files
4. Place JSON files in the public folder if needed

### Issue: Port already in use

**Error**: `Port 5000 is already in use` or `Port 3000 is already in use`

**Solution**:
```bash
# Find and kill process on port
# Linux/Mac:
lsof -ti:5000 | xargs kill
lsof -ti:3000 | xargs kill

# Windows:
netstat -ano | findstr :5000
taskkill /PID [PID_NUMBER] /F
```

Or change ports in:
- Backend: `shift_scheduler_backend.py` (line: `app.run(port=5000)`)
- Frontend: `vite.config.js` (line: `port: 3000`)

---

## Advanced Configuration

### Adjusting Solver Parameters

In `shift_scheduler_backend.py`, modify:

```python
# Increase solving time
self.solver.parameters.max_time_in_seconds = 60.0

# Add worker threads
self.solver.parameters.num_search_workers = 4
```

### Custom Constraints

Add custom logic in the `generate_schedule()` method:

```python
# Example: Limit consecutive days
for emp in employees:
    for i in range(len(currentWeek) - 2):
        # Constraint: No more than 3 consecutive days
        three_days = []
        for d in range(i, i + 3):
            for shift_id in assignments[emp['id']][dates[d]]:
                three_days.append(assignments[emp['id']][dates[d]][shift_id])
        self.model.Add(sum(three_days) <= 2)
```

---

## Performance Tips

1. **Keep shifts simple**: 3-5 shift types per role is optimal
2. **Reasonable hours**: weeklyHours / dailyMaxHours should be 4-6
3. **Balanced priorities**: Don't use extreme priority values (0 or 100)
4. **Minimize leaves**: Excessive leave requests slow solving
5. **Regular patterns**: Shifts with regular weekly patterns solve faster

---

## FAQ

**Q: Can I schedule multiple weeks?**
A: Currently supports one week. Modify `currentWeek` for longer ranges.

**Q: Can employees work multiple roles?**
A: Not currently. Each employee has one roleId.

**Q: How do I handle part-time employees?**
A: Set lower `weeklyHours` and `shiftsPerWeek` values.

**Q: Can I add more constraints?**
A: Yes! Modify the `generate_schedule()` method in the backend.

**Q: Is this production-ready?**
A: It's a prototype. Add authentication, database, and error handling for production.

---

## Support & Contributing

For issues, questions, or contributions:
- Open a GitHub issue
- Submit a pull request
- Contact the development team

---

**Happy Scheduling! 🎉**
