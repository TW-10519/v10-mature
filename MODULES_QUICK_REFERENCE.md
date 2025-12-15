# Quick Reference: Using the Modules

This guide shows how to use the newly created modules in your application.

## Available Modules

### 1. AuthModule - Authentication & Login
**File**: `src/modules/AuthModule.jsx`

**Export**: `useAuthLogic(employees, setIsLoggedIn, setCurrentUser, setActiveView, loadScheduleFromDatabase)`

**Functions**:
```javascript
const authLogic = useAuthLogic(employees, setIsLoggedIn, setCurrentUser, setActiveView, async () => {
  // callback for loading schedule
});

// Login function
await authLogic.handleLogin(
  { userId: '10501', password: '10501@twave' },
  setLoginError
);

// Logout function  
await authLogic.handleLogout(leaveRequests, unavailability, schedule, setActiveView);

// Load schedule from database
await authLogic.loadScheduleFromDatabase();
```

---

### 2. EmployeeModule - Employee Management
**File**: `src/modules/EmployeeModule.jsx`

**Export**: `useEmployeeLogic()`

**Functions**:
```javascript
const employeeLogic = useEmployeeLogic();

// Save or update employee
employeeLogic.saveEmployee(
  employeeForm,           // { name, roleId, weeklyHours, dailyMaxHours, shiftsPerWeek, skills }
  editingEmployee,        // null or employee id
  employees,              // current employees array
  setEmployees,           // state setter
  roles,                  // current roles array
  setEmployeeForm,        // form state setter
  setShowEmployeeForm     // modal visibility setter
);

// Delete employee
employeeLogic.deleteEmployee(employeeId, employees, setEmployees);

// Load all data from files
await employeeLogic.loadDataFromFiles(
  setEmployees,
  setRoles,
  setShifts,
  setSchedule,
  setAttendance,
  setOvertimeHours
);

// Save all data to files
await employeeLogic.saveDataToFiles(roles, employees, shifts, setRoles);
```

---

### 3. RoleModule - Role Configuration
**File**: `src/modules/RoleModule.jsx`

**Export**: `useRoleLogic()`

**Functions**:
```javascript
const roleLogic = useRoleLogic();

// Save or update role
roleLogic.saveRole(
  roleForm,               // { name, weekendRequired, requiredSkills, breakMinutes }
  editingRole,            // null or role id
  roles,                  // current roles array
  setRoles,               // state setter
  setRoleForm,            // form state setter
  setShowRoleForm         // modal visibility setter
);

// Delete role (cascades to shifts)
roleLogic.deleteRole(roleId, roles, shifts, setRoles, setShifts);
```

---

### 4. ShiftModule - Shift Management
**File**: `src/modules/ShiftModule.jsx`

**Export**: `useShiftLogic()`

**Functions**:
```javascript
const shiftLogic = useShiftLogic();

// Save or update shift
shiftLogic.saveShift(
  shiftForm,              // { name, roleId, priority, schedule: { Monday: {}, ... } }
  editingShift,           // null or shift id
  shifts,                 // current shifts array
  setShifts,              // state setter
  roles,                  // roles for validation
  setShiftForm,           // form state setter
  setShowShiftForm,       // modal visibility setter
  daysOfWeek              // array of day names
);

// Delete shift
shiftLogic.deleteShift(shiftId, shifts, setShifts);
```

---

### 5. ScheduleModule - Schedule Generation & Validation
**File**: `src/modules/ScheduleModule.jsx`

**Export**: `useScheduleLogic()`

**Functions**:
```javascript
const scheduleLogic = useScheduleLogic();

// Generate schedule via backend API
await scheduleLogic.generateSchedule(
  employees,
  roles,
  shifts,
  leaveRequests,
  unavailability,
  currentWeek,
  setLoading,
  setSchedule,
  setOvertimeHours,
  setOvertimeWarnings,
  setActiveView,
  t                       // translation function
);

// Validate schedule against constraints
const validation = await scheduleLogic.validateSchedule(
  schedule,
  employees,
  roles,
  shifts,
  currentWeek,
  language
);

// Calculate overtime from schedule
const overtime = await scheduleLogic.calculateOvertimeFromSchedule(
  schedule,
  employees,
  roles,
  shifts,
  currentWeek
);

// Save schedule to database
await scheduleLogic.saveScheduleToFile();
```

---

### 6. AttendanceModule - Check-in/Check-out
**File**: `src/modules/AttendanceModule.jsx`

**Export**: `useAttendanceLogic()`

**Functions**:
```javascript
const attendanceLogic = useAttendanceLogic();

// Get attendance status (on-time, slightly late, late)
const status = attendanceLogic.getAttendanceStatus(
  actualTime,             // "HH:MM" format
  shift,                  // shift object
  date,                   // "YYYY-MM-DD"
  type                    // 'in' or 'out'
);

// Mark attendance (check-in/check-out)
await attendanceLogic.markAttendance(
  employeeId,
  date,
  shiftId,
  inTime,                 // "HH:MM" format
  shifts,
  employees,
  roles,
  currentWeek,
  attendance,
  setEarlyCheckInWarning,
  recordAttendance        // callback function
);

// Record attendance to database
await attendanceLogic.recordAttendance(
  key,
  employeeId,
  date,
  shiftId,
  inTime,
  startTime,
  shifts,
  attendance,
  setAttendance,
  outTimes,
  employees,
  roles,
  currentWeek,
  daysOfWeek
);

// Save to file/database
await attendanceLogic.saveAttendanceToFile(attendanceData);
```

---

### 7. NotificationsModule - Messages & Leave Requests
**File**: `src/modules/NotificationsModule.jsx`

**Export**: `useNotificationsLogic()`

**Functions**:
```javascript
const notificationsLogic = useNotificationsLogic();

// Load notifications
await notificationsLogic.loadNotifications(setNotifications);

// Send message from employee to manager
await notificationsLogic.sendMessageToManager(
  form,                   // { message }
  currentUser,
  notifications,
  setNotifications,
  setForm,
  setShowForm,
  saveNotifications       // callback
);

// Send leave request
await notificationsLogic.sendLeaveRequest(
  form,                   // { startDate, endDate, reason }
  currentUser,
  notifications,
  setNotifications,
  setForm,
  setShowForm,
  saveNotifications       // callback
);

// Approve leave request
await notificationsLogic.approveLeaveRequest(
  requestId,
  notifications,
  leaveRequests,
  employees,
  setLeaveRequests,
  setNotifications,
  saveNotifications       // callback
);

// Reject leave request
await notificationsLogic.rejectLeaveRequest(
  requestId,
  notifications,
  setNotifications,
  saveNotifications       // callback
);

// Delete message
await notificationsLogic.deleteMessage(messageId, notifications, setNotifications, saveNotifications);

// Delete leave request
await notificationsLogic.deleteLeaveRequest(requestId, notifications, setNotifications, saveNotifications);

// Send message from manager to employee
await notificationsLogic.sendManagerNotification(
  employeeId,
  message,
  notifications,
  setNotifications,
  saveNotifications       // callback
);
```

---

### 8. ExportModule - PDF & Excel Exports
**File**: `src/modules/ExportModule.jsx`

**Export**: `useExportLogic()`

**Functions**:
```javascript
const exportLogic = useExportLogic();

// Download schedule as PDF
await exportLogic.downloadSchedulePDF(
  schedule,
  currentWeek,
  daysOfWeek,
  employees,
  roles,
  shifts,
  language,               // 'en' or 'ja'
  t                       // translation function
);

// Download schedule as Excel
await exportLogic.downloadScheduleExcel(
  schedule,
  currentWeek,
  daysOfWeek,
  employees,
  roles,
  shifts,
  language,
  t
);

// Download attendance as Excel
await exportLogic.downloadAttendanceExcel(
  attendance,
  currentWeek,
  daysOfWeek,
  employees,
  roles,
  schedule,
  language,
  t
);
```

---

## Constants Module

**File**: `src/utils/constants.js`

**Exports**:
```javascript
export const API_BASE_URL = 'http://localhost:5000/api';

export const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const translations = {
  en: { /* 400+ English translations */ },
  ja: { /* 400+ Japanese translations */ }
};

export const getWeekDates = () => { /* returns week dates array */ };
```

**Usage**:
```javascript
import { API_BASE_URL, daysOfWeek, translations, getWeekDates } from './src/utils/constants';

const t = (key) => translations[language][key] || key;
const dates = getWeekDates();
const days = daysOfWeek;  // ['Monday', 'Tuesday', ...]
const apiUrl = API_BASE_URL;  // 'http://localhost:5000/api'
```

---

## Integration Example

Here's a practical example of using multiple modules together:

```javascript
import { useAuthLogic } from './src/modules/AuthModule';
import { useEmployeeLogic } from './src/modules/EmployeeModule';
import { useScheduleLogic } from './src/modules/ScheduleModule';
import { useExportLogic } from './src/modules/ExportModule';
import { API_BASE_URL, daysOfWeek, translations, getWeekDates } from './src/utils/constants';

const MyComponent = () => {
  const [employees, setEmployees] = useState([]);
  const [language, setLanguage] = useState('en');
  
  // Initialize modules
  const authLogic = useAuthLogic(...);
  const employeeLogic = useEmployeeLogic();
  const scheduleLogic = useScheduleLogic();
  const exportLogic = useExportLogic();
  
  // Translation helper
  const t = (key) => translations[language][key] || key;
  
  // Load data on mount
  useEffect(() => {
    employeeLogic.loadDataFromFiles(setEmployees, ...);
  }, []);
  
  // Generate and export schedule
  const handleGenerateAndExport = async () => {
    await scheduleLogic.generateSchedule(...);
    await exportLogic.downloadScheduleExcel(...);
  };
  
  return (
    <button onClick={handleGenerateAndExport}>
      {t('generateSchedule')}
    </button>
  );
};
```

---

## Notes

- All modules export functions that don't use hooks internally for data management
- State is managed in the component, not in modules
- Modules receive state and setters as parameters
- All functions handle their own error messages
- Translations are centralized in constants.js

---

**Last Updated**: December 15, 2025
