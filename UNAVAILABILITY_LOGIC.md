# Unavailability Handling - Updated Logic

## Overview

The shift scheduler now has enhanced **unavailability handling** that intelligently manages employee availability constraints during schedule generation.

## Two Types of Unavailability

### 1. **Complete Unavailability** ❌
An employee marked as **unavailable for ALL days** in the week cannot be scheduled at all.

**Logic:**
```
If unavailable_days >= 7 (all days of the week):
  ├─ Employee is COMPLETELY UNAVAILABLE
  ├─ NO variables created in the scheduler
  ├─ NO shifts assigned
  └─ Schedule regenerates WITHOUT this employee
```

**Example:**
- John is unavailable: Mon, Tue, Wed, Thu, Fri, Sat, Sun
- John will NOT appear in the generated schedule
- The system redistributes John's shifts to other available employees

### 2. **Partial Unavailability** ⚠️
An employee is unavailable for **specific days** but available on other days.

**Logic:**
```
If unavailable_days < 7:
  ├─ Employee is PARTIALLY UNAVAILABLE
  ├─ Variables created ONLY for available days
  ├─ Shifts assigned ONLY to available days
  ├─ Unavailable days are skipped (not blocked)
  └─ Schedule redistributes shifts to other available days
```

**Example:**
- Sarah is unavailable: Monday, Friday
- Sarah is available: Tue, Wed, Thu, Sat, Sun
- When schedule regenerates:
  - Sarah's Monday shift → assigned to another employee
  - Sarah's Friday shift → assigned to another employee
  - Sarah works on other available days instead
  - Total shifts for Sarah remain the same

## Schedule Regeneration Process

When you mark an employee as unavailable:

### Step 1: System Analysis
```
Total employees: 12
Unavailable for ALL days: 1 (John)
Partially unavailable: 2 (Sarah, Mike)
Available: 9 (normal scheduling)
```

### Step 2: Capacity Recalculation
```
For each role:
  Calculate shifts needed
  - Subtract: Leave days
  - Subtract: Unavailable days  ← NEW
  = Available shift capacity
```

### Step 3: Schedule Generation
```
For completely unavailable employees:
  └─ Skip entirely (no variables created)

For partially unavailable employees:
  ├─ Create shift variables ONLY for available days
  ├─ Assign shifts ONLY to available days
  └─ Never assign to unavailable days
```

### Step 4: Distribution
```
Remaining available employees:
  └─ Redistribute the unassigned shifts
  └─ Maintain equal distribution
  └─ Respect all other constraints
```

## Key Differences: Leave vs Unavailability

| Aspect | Leave | Unavailability |
|--------|-------|-----------------|
| **Meaning** | Approved time off | Cannot work (temporary issue) |
| **Shift Count** | Reduced by leave days | Reduced by unavailable days |
| **Regeneration** | Reduces total shifts needed | Shifts reassigned to other days |
| **Display Color** | 🔴 Red | 🟠 Orange |
| **Impact** | Permanent (week-based) | Flexible (can be changed) |

## Constraint Logic

### For Completely Unavailable Employees
```python
if unavailable_days >= 7:
    # Cannot schedule at all
    skip_employee_entirely()
    add_feedback("⚠️ Employee: Unavailable ALL days - will NOT be scheduled")
```

### For Partially Unavailable Employees
```python
# Available days calculation
available_days = 7 - leave_days - unavailable_days

# Target shifts
target_shifts = shifts_per_week - leave_days - unavailable_days

# Constraint: Only create variables for available days
if available_days > 0:
    create_shift_variables_for_available_days_only()
```

## Example Scenarios

### Scenario 1: Sarah - Partial Unavailability
```
Configuration:
  Name: Sarah
  Role: Cashier
  Shifts per week: 5
  Leave: None
  Unavailable: Monday, Friday

Calculation:
  Available days: 7 - 0 - 2 = 5 days ✓
  Target shifts: 5 - 0 - 2 = 3 shifts ✓

Generated Schedule:
  Monday:    [UNAVAILABLE]
  Tuesday:   Morning Shift (Sarah assigned) ✓
  Wednesday: Evening Shift (Sarah assigned) ✓
  Thursday:  [No shift]
  Friday:    [UNAVAILABLE]
  Saturday:  Morning Shift (Sarah assigned) ✓
  Sunday:    [No shift]
  
  Result: Sarah works 3 shifts on available days
```

### Scenario 2: John - Complete Unavailability
```
Configuration:
  Name: John
  Role: Supervisor
  Shifts per week: 5
  Leave: None
  Unavailable: Mon, Tue, Wed, Thu, Fri, Sat, Sun

Calculation:
  Available days: 7 - 0 - 7 = 0 days ✗
  Status: COMPLETELY UNAVAILABLE

Generated Schedule:
  Monday-Sunday: [SKIP - John not scheduled]
  
  John's 5 shifts:
    → Redistributed to: Michael (2), Lisa (2), Robert (1)
  
  Result: John does NOT appear in schedule
```

### Scenario 3: Multiple Partial Unavailability
```
Configuration:
  Employees: 10 total
  Sarah: Unavailable Mon, Fri (available 5 days → needs 3 shifts)
  Mike:  Unavailable Thu, Sat (available 5 days → needs 3 shifts)
  All others: Available (all 7 days → normal shifts)

Generated Schedule:
  Available employees per day:
    Monday:    8 (Sarah + Mike + 6 others unavail → 8 available)
    Tuesday:   10 (all available)
    Wednesday: 10 (all available)
    Thursday:  9 (Mike unavail → 9 available)
    Friday:    9 (Sarah unavail → 9 available)
    Saturday:  9 (Mike unavail → 9 available)
    Sunday:    10 (all available)

  Shift distribution:
    → Adjusted based on daily availability
    → Sarah: Gets 3 shifts (Tue, Wed, Sat, Sun - picks 3)
    → Mike: Gets 3 shifts (Mon, Tue, Wed, Fri, Sun - picks 3)
    → Others: Normal shifts
```

## Feedback Messages

### During Schedule Generation
```
⚠️ Employee: Unavailable ALL days - will NOT be scheduled
  → Employee is excluded from scheduling

Step 0: Analyzing daily availability...
  Monday - Role 'Cashier': 8 employees available
  Tuesday - Role 'Cashier': 9 employees available
  → Shows availability-aware distribution

Step 1: Analyzing total shifts per role...
  Role 'Cashier': 48 total shifts (after 2 leave days + 3 unavailable days)
  → Accounts for unavailable days in capacity calculation
```

### Infeasibility Messages
```
❌ Sarah: Needs 3 shifts but only 1 day available
   → Too many unavailable days for required shifts
   
Suggestion: Reduce unavailable days or shiftsPerWeek from 5
```

## Technical Implementation

### New Method: `_identify_completely_unavailable()`
```python
def _identify_completely_unavailable(self):
    """Identify employees unavailable for ALL days"""
    completely_unavailable = set()
    
    for emp in self.employees:
        unavailable_days = sum(
            1 for date in self.current_week
            if self._is_unavailable(emp['id'], date)
        )
        
        if unavailable_days >= len(self.current_week):
            completely_unavailable.add(emp['id'])
    
    return completely_unavailable
```

### Updated Schedule Generation
1. **Initial phase**: Identify completely unavailable employees
2. **Capacity phase**: 
   - Subtract BOTH leave days AND unavailable days
   - Calculate adjusted shifts needed
3. **Variable creation phase**: Skip completely unavailable employees
4. **Constraint phase**: Apply constraints only to schedulable employees
5. **Solving phase**: Find optimal distribution for remaining employees

## Frontend Behavior

### Marking Unavailability
```javascript
const toggleUnavailability = (employeeId, date) => {
  const shiftsPerWeek = emp?.shiftsPerWeek || 5;
  const unavailDays = count_unavailable_days(employeeId);
  
  // Warning: Can't mark unavailable if already at limit
  if (unavailDays >= shiftsPerWeek - 1) {
    alert("Cannot mark unavailable - need at least shiftsPerWeek days");
  }
};
```

### Schedule Display
- **Red badge**: Leave (approved time off)
- **Orange badge**: Unavailable (cannot work that day)
- **Gray/normal**: Can be scheduled

## Best Practices

1. **Mark unavailability BEFORE generating schedule**
   - Changes take effect on next generation
   - Already-generated schedule won't auto-update

2. **Avoid over-constraining**
   - Don't mark more than (shiftsPerWeek - required_shifts) days unavailable
   - System will warn if constraints are too tight

3. **Use strategically**
   - Leave: Planned absences (vacation, sick day)
   - Unavailability: Unexpected issues (doctor appointment, car trouble)

4. **Monitor feedback**
   - Check system feedback for "COMPLETELY UNAVAILABLE" warnings
   - Adjust unavailable days if schedule generation fails

## Validation Rules

```
Valid unavailability:
  ✓ unavailable_days <= 6  (at least 1 day available)
  ✓ unavailable_days + leave_days <= 6  (at least 1 day available)
  ✓ shiftsPerWeek - unavailable_days >= 1  (can fit required shifts)

Invalid unavailability:
  ✗ unavailable_days = 7  (completely unavailable)
  ✗ unavailable_days + leave_days >= 7  (no days available)
```

## Future Enhancements

Potential improvements to unavailability handling:

1. **Recurring unavailability** (every Monday, every Friday)
2. **Partial shifts** (unavailable morning only, available evening)
3. **Advance notice** (mark unavailable 2 weeks in advance)
4. **Preference levels** (strongly prefer not available, vs cannot work)
5. **Rotation-based** (rotate unavailable days across weeks)

---

**Last Updated:** December 12, 2025  
**Version:** Shift Scheduler V4 with Enhanced Unavailability Logic
