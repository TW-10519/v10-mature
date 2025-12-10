# Shift Scheduler Pro 🚀

An intelligent shift scheduling application using **React** frontend and **Python** backend with **Google OR-Tools** optimization engine.

## 🎯 Features

- **Smart Scheduling**: Uses Google OR-Tools CP-SAT solver for optimal shift assignments
- **Constraint-Based**: Respects employee hours, leave requests, daily limits, and role requirements
- **Priority-Based**: Distributes shifts based on configurable priority weights
- **Real-time Capacity**: Calculates available shift capacity automatically
- **Modern UI**: Beautiful, responsive interface with dark theme
- **JSON-Based Storage**: Simple file-based configuration for employees and roles

## 📋 Prerequisites

- **Python 3.8+**
- **Node.js 16+**
- **npm or yarn**

## 🚀 Quick Start

### 1. Backend Setup (Python)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the Flask server
python shift_scheduler_backend.py
```

The backend will start on `http://localhost:5000`

### 2. Frontend Setup (React)

```bash
# Install Node dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start on `http://localhost:3000`

### 3. Access the Application

Open your browser and navigate to `http://localhost:3000`

## 📁 Project Structure

```
shift-scheduler/
├── shift_scheduler_backend.py   # Flask API with OR-Tools
├── requirements.txt              # Python dependencies
├── employees.json                # Employee data
├── roles.json                    # Role and shift templates
├── ShiftSchedulerApp.jsx         # Main React component
├── main.jsx                      # React entry point
├── index.html                    # HTML template
├── index.css                     # Tailwind CSS
├── package.json                  # Node dependencies
├── vite.config.js                # Vite configuration
├── tailwind.config.js            # Tailwind configuration
└── postcss.config.js             # PostCSS configuration
```

## 📊 How It Works

### Algorithm Flow

1. **Calculate Total Shifts Needed**
   ```
   For each role:
     Total Shifts = Σ(employee.shiftsPerWeek) - Σ(leaves in week)
   ```

2. **Distribute by Priority**
   ```
   For each shift type:
     Weight = shift.priority / Σ(all shift priorities in role)
     Allocated = Total Shifts × Weight
   ```

3. **OR-Tools Optimization**
   - Creates decision variables for each employee-date-shift combination
   - Applies constraints:
     - Weekly shift limits per employee
     - Daily hour maximums
     - Leave requests
     - Role requirements
   - Maximizes coverage while maintaining fairness

4. **Generate Schedule**
   - Assigns employees to shifts optimally
   - Respects all constraints
   - Balances workload across employees

## 🔧 Configuration

### employees.json

```json
[
  {
    "id": "1",
    "name": "John Smith",
    "roleId": "role1",
    "weeklyHours": 40,
    "dailyMaxHours": 8,
    "shiftsPerWeek": 5,
    "skills": ["machining", "quality-control"]
  }
]
```

**Fields:**
- `id`: Unique employee identifier
- `name`: Employee name
- `roleId`: Reference to role in roles.json
- `weeklyHours`: Target hours per week
- `dailyMaxHours`: Maximum hours per day
- `shiftsPerWeek`: Number of shifts to assign per week
- `skills`: Array of skills

### roles.json

```json
[
  {
    "id": "role1",
    "name": "Machine Operator",
    "weekendRequired": true,
    "requiredSkills": ["machining"],
    "breakMinutes": 60,
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
]
```

**Fields:**
- `id`: Unique role identifier
- `name`: Role name
- `weekendRequired`: Whether role works weekends
- `requiredSkills`: Skills needed for this role
- `breakMinutes`: Break duration
- `shifts`: Array of shift templates
  - `priority`: Higher = more employees assigned (0-100)

## 🎨 User Interface

### Dashboard
- View statistics (employees, roles, shifts, leaves)
- Calculate shift capacity by role
- See optimization status

### Schedule View
- Weekly calendar grid
- Color-coded shift assignments
- Leave indicators
- Export functionality

### Employees View
- Complete employee listing
- Role assignments
- Weekly hours and shift counts
- Skills overview

### Leaves View
- Interactive leave management
- Toggle leave status by employee and date
- Visual calendar interface

## 🔌 API Endpoints

### POST `/api/generate-schedule`

Generate optimized schedule using OR-Tools.

**Request:**
```json
{
  "employees": [...],
  "roles": [...],
  "shifts": [...],
  "leaveRequests": {...},
  "currentWeek": ["2024-01-01", ...]
}
```

**Response:**
```json
{
  "success": true,
  "schedule": {
    "2024-01-01": {
      "emp1": [{ "id": "shift1", "name": "Morning Shift", ... }]
    }
  },
  "stats": {
    "total_employees": 8,
    "solver_status": "optimal"
  }
}
```

### POST `/api/calculate-capacity`

Calculate available shift capacity per role.

**Response:**
```json
{
  "success": true,
  "capacity": {
    "role1": 25,
    "role2": 15
  }
}
```

### GET `/api/health`

Health check endpoint.

## 🧪 Example Usage

1. **Load Data**: Application loads `employees.json` and `roles.json`
2. **Set Leaves**: Mark employees as unavailable for specific dates
3. **Calculate Capacity**: Click "Calculate Capacity" to see available shifts
4. **Generate Schedule**: Click "Generate Schedule" for optimal assignments
5. **Review & Export**: Review the schedule and export as JSON

## 🎯 Optimization Details

The OR-Tools CP-SAT solver optimizes for:

1. **Maximum Coverage**: Fill as many shifts as possible
2. **Fairness**: Balance shift assignments across employees
3. **Constraint Satisfaction**: 
   - Respect weekly hour limits
   - Honor daily maximums
   - Block unavailable dates
   - Match roles and skills

**Solver Parameters:**
- Max solving time: 30 seconds
- Strategy: CP-SAT (Constraint Programming - Boolean Satisfiability)
- Objective: Weighted sum optimization

## 🐛 Troubleshooting

### Backend not starting
```bash
# Make sure all dependencies are installed
pip install --upgrade -r requirements.txt
```

### Frontend not connecting
- Verify backend is running on port 5000
- Check browser console for CORS errors
- Ensure vite.config.js proxy is correct

### OR-Tools issues
```bash
# Reinstall OR-Tools
pip uninstall ortools
pip install ortools==9.8.3296
```

### No schedule generated
- Check that employees.json and roles.json are valid
- Verify employees have matching roleIds
- Ensure shifts have daysOfWeek specified
- Review constraints (might be too restrictive)

## 📈 Performance

- **Small datasets** (10-20 employees): < 1 second
- **Medium datasets** (50-100 employees): 2-5 seconds
- **Large datasets** (200+ employees): 10-30 seconds

## 🔄 Future Enhancements

- [ ] Multi-week scheduling
- [ ] Shift swapping interface
- [ ] Skill-based auto-assignment
- [ ] Email notifications
- [ ] Historical analytics
- [ ] Mobile app

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 📧 Support

For issues or questions, please open a GitHub issue.

---

**Built with ❤️ using React, Python, and Google OR-Tools**
