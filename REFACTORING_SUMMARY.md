# Refactoring Plan Summary

## Problem
- **5,893 lines** in ShiftSchedulerApp.jsx (monolithic)
- **8 modules exist** but **are not being used**
- **All business logic mixed** with UI rendering
- **Unmaintainable** and **difficult to test**

## Solution
Refactor into **modular architecture** where:
1. Each module exports a **custom hook** with business logic
2. Main component becomes **UI-only** (render + state + delegating to modules)
3. Result: **~2,000 lines** in main component (60% reduction)

---

## Module Functions to Extract

### **AuthModule**
```
handleLogin() → {success, role, employeeId}
handleLogout() → {success}
loadScheduleFromDatabase() → {schedule, leaveRequests, unavailability}
loadDataFromFiles() → {employees, roles, shifts, schedule, attendance}
```

### **EmployeeModule**
```
saveEmployee(form, editingId, employees) → employees[]
deleteEmployee(id, employees) → employees[]
validateEmployeeForm(form) → {errors}
```

### **RoleModule**
```
saveRole(form, editingId, roles) → roles[]
deleteRole(id, roles) → roles[]
validateRoleForm(form) → {errors}
validateBreakTimeConstraint(shift, role) → boolean
```

### **ShiftModule**
```
saveShift(form, editingId, shifts, roles) → shifts[]
deleteShift(id, shifts) → shifts[]
validateShiftForm(form, roles) → {errors}
validateBreakTimeConstraint(shift, role) → boolean
```

### **ScheduleModule**
```
generateSchedule(employees, roles, shifts, leaves, unavail, week) → {schedule, overtimeData}
calculateOvertime(schedule, employees, roles) → {overtimeHours, warnings}
saveEditedSchedule(edited, schedule) → schedule
updateScheduleShift(schedule, empId, date, shift) → schedule
getShiftForEmployeeDate(empId, date, schedule) → Shift|null
```

### **AttendanceModule**
```
markAttendance(empId, date, shiftId, inTime, shifts, roles) → attendance
recordAttendance(empId, date, shift, inTime, outTime) → record
getAttendanceStatus(actualTime, shift, type) → 'onTime'|'slightlyLate'|'late'
calculateOvertimeHours(inTime, outTime, breakMinutes) → number
validateCheckInTime(inTime, shiftTime) → {warning?, error?}
```

### **NotificationsModule**
```
loadNotifications() → {messages, leaveRequests}
saveNotifications(notif) → void
sendMessageToManager(message, user) → notifications
sendLeaveRequest(form, user) → notifications
approveLeaveRequest(requestId, notif) → notifications
rejectLeaveRequest(requestId, notif) → notifications
deleteMessage(messageId, notif) → notifications
sendManagerNotification(empId, msg, notif) → notifications
getUnreadCount(notif) → number
```

### **ExportModule**
```
downloadSchedulePDF(schedule, week, employees, roles, shifts, t) → void
downloadScheduleExcel(schedule, week, employees, roles, shifts, language, t) → void
downloadAttendanceReport(attendance, employees, startDate, endDate, t) → void
generateScheduleMatrix(schedule, week, employees) → matrix
```

---

## Main Component Structure (After Refactoring)

```
ShiftSchedulerApp.jsx (2,000 lines)
├── State Declarations (150 lines)
│   ├── Authentication state
│   ├── Data state (employees, roles, etc.)
│   └── UI state (activeView, language, etc.)
│
├── Module Initialization (10 lines)
│   └── const authLogic = useAuthLogic();
│       const employeeLogic = useEmployeeLogic();
│       // ... 8 modules total
│
├── useEffect Hooks (40 lines)
│   ├── Data loading on mount
│   ├── Auto-save on state change
│   └── Current time timer
│
├── Event Handlers (600 lines)
│   ├── handleLogin() → delegates to authLogic
│   ├── handleSaveEmployee() → delegates to employeeLogic
│   ├── handleSaveRole() → delegates to roleLogic
│   ├── handleGenerateSchedule() → delegates to scheduleLogic
│   ├── handleApproveLeave() → delegates to notificationsLogic
│   └── handleExport() → delegates to exportLogic
│
└── JSX/Rendering (1,200 lines)
    ├── Login screen
    ├── Navigation
    ├── Dashboard view
    ├── Employee management
    ├── Role management
    ├── Shift configuration
    ├── Schedule editor
    ├── Attendance tracking
    ├── Notifications
    └── Export dialogs
```

---

## Module Dependencies

```
Main Component
    ↓
    ├→ AuthModule (initial load)
    ├→ EmployeeModule ──→ RoleModule (validation)
    ├→ RoleModule
    ├→ ShiftModule ──→ RoleModule (validation)
    ├→ ScheduleModule ──→ Employee, Role, Shift, Attendance
    ├→ AttendanceModule ──→ Schedule, Shift, Role
    ├→ NotificationsModule
    └→ ExportModule (reads all data)
```

---

## Usage Pattern in Main Component

### Before (Current - All mixed)
```jsx
const handleSaveEmployee = () => {
  // 50 lines of business logic here
  // Validation, API calls, data transformation
  // State updates scattered
}
```

### After (Refactored - Separated)
```jsx
const handleSaveEmployee = async () => {
  const errors = employeeLogic.validateEmployeeForm(employeeForm);
  if (errors.length > 0) {
    setValidationErrors(errors);
    return;
  }
  
  const updated = await employeeLogic.saveEmployee(employeeForm, editingEmployee, employees);
  setEmployees(updated);
  setShowEmployeeForm(false);
};
```

---

## Implementation Phases

| Phase | Duration | Tasks |
|-------|----------|-------|
| **1. Module Specs** | 4 hours | Define function signatures, return types, error handling |
| **2. Module Enhancement** | 8 hours | Implement missing functions in each module |
| **3. Main Refactoring** | 4 hours | Reorganize state, initialize modules, add effects |
| **4. Handler Delegation** | 6 hours | Convert all handlers to call module functions |
| **5. Testing & Cleanup** | 4 hours | Unit tests, integration tests, remove dead code |
| **Total** | **26 hours** | Complete refactoring |

---

## Expected Outcomes

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Main component lines | 5,893 | ~2,000 | **66% reduction** |
| Business logic in main | 2,500 | <500 | **80% reduction** |
| Testable modules | 0% | 100% | **All modules testable** |
| Code reusability | 0% | High | **Modules usable elsewhere** |
| Maintainability | Low | High | **Clear separation of concerns** |
| Bundle size | Baseline | -15% | **Smaller output** |

---

## Success Criteria

✅ ShiftSchedulerApp.jsx reduced to ~2,000 lines  
✅ All 8 modules properly implemented and called  
✅ 100% feature parity with current version  
✅ All handlers delegate to modules  
✅ JSX contains no business logic  
✅ Unit test coverage >80%  
✅ Zero breaking changes for end users  

---

## Key Principles

1. **Single Responsibility:** Each module handles one domain
2. **Composition:** Modules combine into larger features
3. **Delegation:** Main component delegates, not implements
4. **Testability:** Each module independently testable
5. **Immutability:** All state updates immutable
6. **Clear APIs:** Consistent function signatures across modules

---

## Detailed Plan Document

See **REFACTORING_PLAN.md** for:
- Complete function mapping for each module
- Exact hook signatures with TypeScript-style types
- Dependency graph
- Error handling patterns
- Testing strategy
- Risk mitigation
- Implementation roadmap
- File structure diagram

