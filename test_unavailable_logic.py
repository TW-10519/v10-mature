#!/usr/bin/env python3
"""
Test script to verify LEAVE vs UNAVAILABLE logic in the scheduler:
- LEAVE: Reduce target shifts (employee absent)
- UNAVAILABLE: Keep full target shifts, reassign to other days
"""

import sys
import json
from datetime import datetime, timedelta

# Simple demonstration of the logic without running the full solver
def explain_logic():
    """Explain the LEAVE vs UNAVAILABLE logic"""
    
    print("=" * 80)
    print("LEAVE vs UNAVAILABLE Logic Explanation")
    print("=" * 80)
    
    print("""
SCENARIO 1: UNAVAILABLE (Employee prefers not to work)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Employee A: Needs 5 shifts per week
Available Days: Mon, Tue, Thu, Fri, Sat, Sun (6 days available)
Unavailable: Wednesday

SCHEDULER LOGIC:
1. ✅ Calculate target shifts: 5 (NOT reduced, unavailability doesn't change target)
2. ✅ Create decision variables: for all days (including Wednesday)
3. ✅ Apply weights: Higher weight for available days (2x), lower for unavailable (1x)
4. ✅ Solve: Assign 5 shifts on days Mon, Tue, Thu, Fri, + one of weekend
         
RESULT:
   Monday:    1 shift  ✓ (available)
   Tuesday:   1 shift  ✓ (available)
   Wednesday: 0 shifts ✓ (prefer to avoid)
   Thursday:  1 shift  ✓ (available)
   Friday:    1 shift  ✓ (available)
   Weekend:   1 shift  ✓ (available)
   ─────────────────
   TOTAL:     5 shifts ✓ (Full target met, just on different days)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCENARIO 2: LEAVE (Employee is absent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Employee B: Needs 5 shifts per week
On Leave: Wednesday
Available Days: Mon, Tue, Thu, Fri, Sat, Sun (6 days available)

SCHEDULER LOGIC:
1. ✅ Calculate target shifts: 5 - 1 (leave day) = 4 shifts (REDUCED)
2. ✅ Create decision variables: only for available days (not Wednesday)
3. ✅ No variables for Wednesday = cannot assign
4. ✅ Solve: Assign 4 shifts on Mon, Tue, Thu, Fri
         
RESULT:
   Monday:    1 shift  ✓ (available)
   Tuesday:   1 shift  ✓ (available)
   Wednesday: - (ON LEAVE - no shifts possible)
   Thursday:  1 shift  ✓ (available)
   Friday:    1 shift  ✓ (available)
   ─────────────────
   TOTAL:     4 shifts ✓ (Reduced by 1 leave day)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEY DIFFERENCES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                   UNAVAILABLE             LEAVE
        ────────────────────────────────────────────
Target Shifts      NOT reduced            REDUCED
Example            5 shifts (same)        4 shifts (5-1)
Reassign?          YES (to other days)    NO (no other days)
Can force work?    Only if needed         NO, impossible
Use When:          Prefers not to work    Truly absent
                   (wedding, personal)    (vacation, sick)
        ────────────────────────────────────────────

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPLEMENTATION DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Decision Variables Creation:
   • LEAVE dates:      SKIPPED (no variables created)
   • UNAVAILABLE dates: CREATED (variables exist)
   
2. Constraint Application:
   • Target shifts calculation: subtract ONLY leaves
   • Assignment weighting: prefer available over unavailable
   
3. Solver Objective:
   • Maximize total assignments
   • Weight available days 2x vs unavailable 1x
   • Result: Solver prefers available days but uses unavailable if needed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TESTING IN YOUR SYSTEM:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To test UNAVAILABLE:
  1. Mark employee as unavailable for a date
  2. Generate schedule
  3. Employee should get full shifts on available days

To test LEAVE:
  1. Mark employee as on leave for a date
  2. Generate schedule
  3. Employee should get reduced shifts (fewer by 1 leave day)

Code Location: shift_scheduler_backend_v2.py
  • Line 115: _is_unavailable() method
  • Line 112: _is_on_leave() method
  • Line 287: Variable creation (only skip leaves)
  • Line 318: Target shifts calculation (only reduce for leaves)
  • Line 478: Weighted objective (prefer available days)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    """)

if __name__ == '__main__':
    explain_logic()
