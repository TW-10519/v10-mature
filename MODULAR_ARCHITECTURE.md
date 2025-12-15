# Shift Scheduler App - Module Structure

## Overview
The application has been refactored into modular components to improve code organization, reusability, and maintainability. The original monolithic `ShiftSchedulerApp_v2.jsx` file has been separated into multiple focused modules, each handling specific functionality.

## Module Structure

```
/src
├── modules/
│   ├── AuthModule.jsx           # Authentication & Login
│   ├── EmployeeModule.jsx       # Employee CRUD Operations
│   ├── RoleModule.jsx           # Role Management
│   ├── ShiftModule.jsx          # Shift Configuration
│   ├── ScheduleModule.jsx       # Schedule Generation & Management
│   ├── AttendanceModule.jsx     # Check-in/Check-out & Attendance
│   ├── NotificationsModule.jsx  # Messages & Leave Requests
│   └── ExportModule.jsx         # PDF & Excel Exports
├── utils/
│   └── constants.js             # Shared constants, translations, API config
└── components/
    └── ShiftSchedulerApp.jsx    # Main App Component (refactored)
```

## Modules Description

### 1. **AuthModule.jsx**
Handles all authentication-related functionality.

**Exported Functions:**
- `useAuthLogic()` - Returns hook with:
  - `handleLogin(loginCredentials, setLoginError)` - Validates user credentials
  - `handleLogout()` - Clears session and saves data
  - `loadScheduleFromDatabase()` - Loads schedule from PostgreSQL

**State Dependencies:**
- `employees`, `isLoggedIn`, `currentUser`, `activeView`

**Example Usage:**
```javascript
const { handleLogin, handleLogout, loadScheduleFromDatabase } = useAuthLogic();
await handleLogin(credentials, setError);
```

---

### 2. **EmployeeModule.jsx**
Manages employee creation, updating, and deletion.

**Exported Functions:**
- `useEmployeeLogic()` - Returns hook with:
  - `saveEmployee()` - Creates or updates employee
  - `deleteEmployee()` - Removes employee with confirmation
  - `loadDataFromFiles()` - Loads employees, roles, shifts from JSON files
  - `saveDataToFiles()` - Persists data to backend

**State Dependencies:**
- `employees`, `roles`, `shifts`, `attendance`, `overtimeHours`

**Example Usage:**
```javascript
const { saveEmployee, deleteEmployee } = useEmployeeLogic();
saveEmployee(form, editingId, employees, setEmployees, ...);
```

---

### 3. **RoleModule.jsx**
Handles role configuration and management.

**Exported Functions:**
- `useRoleLogic()` - Returns hook with:
  - `saveRole()` - Creates or updates role
  - `deleteRole()` - Removes role and associated shifts

**State Dependencies:**
- `roles`, `shifts`

**Example Usage:**
```javascript
const { saveRole, deleteRole } = useRoleLogic();
saveRole(roleForm, editingRole, ...);
```

---

### 4. **ShiftModule.jsx**
Manages shift templates and scheduling rules.

**Exported Functions:**
- `useShiftLogic()` - Returns hook with:
  - `saveShift()` - Creates/updates shift with validation
  - `deleteShift()` - Removes shift from system

**Features:**
- Break time validation for shifts > 4 hours
- Multi-day schedule configuration
- Priority assignment

**Example Usage:**
```javascript
const { saveShift, deleteShift } = useShiftLogic();
saveShift(shiftForm, editingShift, ...);
```

---

### 5. **ScheduleModule.jsx**
Handles schedule generation, validation, and overtime calculation.

**Exported Functions:**
- `useScheduleLogic()` - Returns hook with:
  - `generateSchedule()` - API call to backend for schedule generation
  - `validateSchedule()` - Validates schedule constraints
  - `calculateOvertimeFromSchedule()` - Computes overtime hours
  - `saveScheduleToFile()` - Persists schedule to database

**Features:**
- Constraint validation (consecutive shifts, weekly max hours)
- Overtime detection and warnings
- Schedule persistence

**Example Usage:**
```javascript
const { generateSchedule, validateSchedule } = useScheduleLogic();
await generateSchedule(employees, roles, shifts, ...);
```

---

### 6. **AttendanceModule.jsx**
Manages check-in/check-out and attendance recording.

**Exported Functions:**
- `useAttendanceLogic()` - Returns hook with:
  - `markAttendance()` - Records employee check-in/check-out
  - `recordAttendance()` - Saves attendance record with status
  - `getAttendanceStatus()` - Calculates on-time/late status
  - `saveAttendanceToFile()` - Persists to database

**Features:**
- Early check-in warnings (>1 hour before shift)
- Automatic status calculation (on-time, slightly late, late)
- Break time consideration in work hours

**Example Usage:**
```javascript
const { markAttendance, recordAttendance } = useAttendanceLogic();
await markAttendance(empId, date, shiftId, inTime, ...);
```

---

### 7. **NotificationsModule.jsx**
Handles all messaging and leave request management.

**Exported Functions:**
- `useNotificationsLogic()` - Returns hook with:
  - `loadNotifications()` - Loads messages and leave requests
  - `sendMessageToManager()` - Employee sends message
  - `sendLeaveRequest()` - Employee submits leave request
  - `approveLeaveRequest()` - Manager approves leave
  - `rejectLeaveRequest()` - Manager rejects leave
  - `deleteMessage()` - Removes message
  - `sendManagerNotification()` - Manager sends notification
  - `saveNotifications()` - Persists to database

**Features:**
- Leave request workflow (pending → approved/rejected)
- Notification persistence
- Automatic date blocking for approved leaves

**Example Usage:**
```javascript
const { sendLeaveRequest, approveLeaveRequest } = useNotificationsLogic();
await sendLeaveRequest(form, currentUser, ...);
```

---

### 8. **ExportModule.jsx**
Provides export functionality for reports.

**Exported Functions:**
- `useExportLogic()` - Returns hook with:
  - `downloadSchedulePDF()` - Exports schedule as PDF
  - `downloadScheduleExcel()` - Exports schedule as Excel
  - `downloadAttendanceExcel()` - Exports attendance as Excel

**Features:**
- Multi-language support (EN/JA)
- Formatted headers and columns
- Proper calculation of worked hours

**Example Usage:**
```javascript
const { downloadScheduleExcel, downloadAttendanceExcel } = useExportLogic();
await downloadScheduleExcel(schedule, currentWeek, ...);
```

---

### 9. **constants.js** (Utilities)
Centralized constants and configuration.

**Exports:**
- `API_BASE_URL` - Backend API endpoint
- `daysOfWeek` - Array of day names
- `translations` - Multi-language UI strings (English & Japanese)
- `getWeekDates()` - Utility function to get current week dates

**Example Usage:**
```javascript
import { API_BASE_URL, translations, daysOfWeek } from './utils/constants';
const t = (key) => translations[language][key];
```

---

## Integration Guide

### Using Modules in Main Component

```javascript
import React, { useState } from 'react';
import { useAuthLogic } from './modules/AuthModule';
import { useEmployeeLogic } from './modules/EmployeeModule';
import { useScheduleLogic } from './modules/ScheduleModule';
// ... import other modules

const ShiftSchedulerApp = () => {
  // State declarations
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [employees, setEmployees] = useState([]);
  // ... other states
  
  // Initialize module hooks
  const { handleLogin, handleLogout } = useAuthLogic();
  const { saveEmployee, deleteEmployee } = useEmployeeLogic();
  const { generateSchedule, validateSchedule } = useScheduleLogic();
  // ... other modules
  
  // Use module functions in your component
  const onLogin = async (credentials) => {
    await handleLogin(credentials, setError);
  };
  
  // ... rest of component
};
```

---

## State Management Flow

```
┌─────────────────────────────────────────┐
│      Main App Component (State)         │
├─────────────────────────────────────────┤
│ - employees                             │
│ - roles                                 │
│ - shifts                                │
│ - schedule                              │
│ - attendance                            │
│ - leaveRequests                         │
│ - notifications                         │
│ - ... (other states)                    │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴─────────────────────────────────┐
       │                                          │
   ┌───▼──────────┐  ┌──────────────┐  ┌────────▼───┐
   │ AuthModule   │  │ Employee     │  │ Schedule   │
   │ (Login)      │  │ Module       │  │ Module     │
   └──────────────┘  │ (CRUD)       │  │ (Generate) │
                     └──────────────┘  └────────────┘
       │                    │                │
       └────────────────────┴────────────────┘
              (Receive state & setters)
```

---

## Benefits of Modular Architecture

1. **Separation of Concerns** - Each module handles one responsibility
2. **Reusability** - Modules can be imported in different components
3. **Testability** - Individual modules are easier to test
4. **Maintainability** - Bugs are easier to track and fix
5. **Scalability** - New features can be added without touching existing code
6. **Code Organization** - Logical grouping improves readability

---

## Migration Notes

### Original vs. Modular

| Original | Modular |
|----------|---------|
| 5,897 lines in 1 file | ~500-700 lines per module |
| Monolithic component | Focused hooks/modules |
| Hard to test | Easy to test individually |
| Difficult to reuse | Reusable across components |
| Poor code navigation | Clear file structure |

---

## Error Handling

All modules include basic error handling:

```javascript
try {
  // Operation
  await saveData(...);
  console.log('✅ Success');
} catch (error) {
  console.error('❌ Error:', error);
  // Show user-friendly error
  alert('Operation failed. Please try again.');
}
```

---

## Future Enhancements

- Extract UI components into separate component files
- Add custom hooks for state management
- Implement Context API for global state
- Add TypeScript for type safety
- Create unit tests for each module
- Add error boundary components
- Implement Redux for complex state management

---

## Quick Reference

### Module Imports
```javascript
import { useAuthLogic } from './modules/AuthModule';
import { useEmployeeLogic } from './modules/EmployeeModule';
import { useRoleLogic } from './modules/RoleModule';
import { useShiftLogic } from './modules/ShiftModule';
import { useScheduleLogic } from './modules/ScheduleModule';
import { useAttendanceLogic } from './modules/AttendanceModule';
import { useNotificationsLogic } from './modules/NotificationsModule';
import { useExportLogic } from './modules/ExportModule';
```

### Constants Import
```javascript
import { API_BASE_URL, daysOfWeek, translations, getWeekDates } from './utils/constants';
```

---

**Last Updated:** December 15, 2025
**Version:** 2.0 (Modular Architecture)
