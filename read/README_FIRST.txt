╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           SHIFT SCHEDULER PRO - Getting Started             ║
║                                                              ║
║     Intelligent Workforce Scheduling with OR-Tools          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

📦 WHAT YOU HAVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A complete shift scheduling application that uses Google OR-Tools
to automatically generate optimal work schedules.

✓ React frontend (modern web interface)
✓ Python backend (optimization engine)  
✓ Sample data (8 employees, 3 roles, 7 shifts)
✓ Complete documentation
✓ Easy startup scripts


🚀 QUICK START (2 MINUTES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Linux/Mac:
  $ chmod +x start.sh
  $ ./start.sh

Windows:
  > start.bat

The script installs everything and starts both servers!


📖 DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Start with these files in order:

1. INSTALLATION.md     ← Start here! Complete setup guide
2. QUICKSTART.md       ← 5-minute getting started
3. README.md           ← Full feature documentation
4. SETUP_GUIDE.md      ← Advanced configuration
5. PROJECT_OVERVIEW.md ← Technical deep dive
6. ARCHITECTURE.md     ← System architecture diagrams


⚙️ SYSTEM REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Python 3.8 or higher
• Node.js 16.0 or higher
• 4GB RAM (8GB recommended)
• 500MB free disk space


🎯 WHAT IT DOES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Calculates total shifts needed per role
2. Accounts for employee leaves
3. Distributes shifts by priority weight
4. Uses OR-Tools to find optimal assignments
5. Respects all constraints (hours, leaves, etc.)
6. Produces fair, balanced schedules


📂 KEY FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Backend:
  shift_scheduler_backend.py  - Flask API with OR-Tools
  requirements.txt            - Python dependencies

Frontend:
  ShiftSchedulerApp.jsx       - Main React app
  package.json                - Node dependencies
  
Data:
  employees.json              - Employee information
  roles.json                  - Roles and shift templates

Launchers:
  start.sh                    - Linux/Mac startup script
  start.bat                   - Windows startup script


🔧 MANUAL SETUP (IF SCRIPTS DON'T WORK)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Terminal 1 - Backend:
  $ pip install -r requirements.txt
  $ python shift_scheduler_backend.py
  ✓ Runs on http://localhost:5000

Terminal 2 - Frontend:
  $ npm install
  $ npm run dev
  ✓ Runs on http://localhost:3000

Browser:
  Open http://localhost:3000


💡 FIRST STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Start both servers (use start.sh or start.bat)
2. Open http://localhost:3000 in browser
3. Click "Generate Schedule" button
4. View the optimized weekly schedule
5. Try the "Leaves" tab to mark vacation days
6. Export your schedule as JSON


🆘 TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"pip: command not found"
  → Use: python -m pip install -r requirements.txt

"npm: command not found"  
  → Install Node.js from nodejs.org

"Port already in use"
  → Close other programs using ports 5000 or 3000
  → Or change ports in config files

"No schedule generated"
  → Check employees.json has valid roleIds
  → Reduce leave requests if too many
  → See SETUP_GUIDE.md for detailed help


📚 NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Read INSTALLATION.md for complete setup instructions
• Customize employees.json with your employee data
• Modify roles.json to match your shift patterns
• Experiment with priority values (0-100)
• Generate schedules for different scenarios


✨ FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Optimal scheduling with OR-Tools
✓ Priority-based shift distribution
✓ Leave management
✓ Constraint satisfaction (hours, roles, etc.)
✓ Fair workload balancing
✓ Modern, responsive UI
✓ JSON import/export
✓ Real-time capacity calculation


🎓 LEARNING RESOURCES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Google OR-Tools: developers.google.com/optimization
• React Documentation: react.dev
• Constraint Programming: en.wikipedia.org/wiki/Constraint_programming


📧 SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For help:
1. Check INSTALLATION.md troubleshooting section
2. Read SETUP_GUIDE.md for detailed guidance
3. Review example data in employees.json and roles.json


═══════════════════════════════════════════════════════════════

                      VERSION: 1.0.0
                  LAST UPDATED: December 2024
              BUILT WITH: React, Python, OR-Tools

═══════════════════════════════════════════════════════════════

                  🚀 Happy Scheduling! 🚀

═══════════════════════════════════════════════════════════════
