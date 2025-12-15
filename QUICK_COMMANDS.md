# 🎯 Quick Commands Reference - Copy & Paste

## 🟢 START HERE - Run Everything (5 minutes)

### Terminal 1: Start Frontend
```bash
cd /home/tw10517/v12
npm install
npm run dev
```
**Wait for**: `VITE v4.5.14 ready in XXX ms` and `➜ Local: http://localhost:3001/`

### Terminal 2: Start Backend
```bash
cd /home/tw10517/v12
python shift_scheduler_backend_v2.py
```
**Wait for**: `Running on http://127.0.0.1:5000`

### Terminal 3: Open Browser
```
http://localhost:3001
```

---

## 📋 One-Time Setup Commands

### Install Frontend Dependencies
```bash
cd /home/tw10517/v12
npm install
```

### Install Backend Dependencies
```bash
cd /home/tw10517/v12
pip install -r requirements.txt
```

### Check Python Version
```bash
python --version  # Should be 3.8+
```

### Check Node Version
```bash
node --version    # Should be 16+
npm --version     # Should be 7+
```

---

## 🚀 Daily Run Commands

### Quick Start (Both)
```bash
# Terminal 1
cd /home/tw10517/v12 && npm run dev

# Terminal 2 (new terminal)
cd /home/tw10517/v12 && python shift_scheduler_backend_v2.py

# Then open: http://localhost:3001
```

### Just Frontend
```bash
cd /home/tw10517/v12 && npm run dev
```

### Just Backend
```bash
cd /home/tw10517/v12 && python shift_scheduler_backend_v2.py
```

---

## 🔍 Troubleshooting Commands

### Check if Backend is Running
```bash
curl http://localhost:5000/api/load-schedule
# Should return JSON (even if empty)
```

### Check if Frontend is Running
```bash
curl http://localhost:3001
# Should return HTML
```

### Kill Process on Port 3001
```bash
# Linux/Mac
lsof -i :3001
kill -9 <PID>

# Or just restart npm
npm run dev
```

### Kill Process on Port 5000
```bash
# Linux/Mac
lsof -i :5000
kill -9 <PID>
```

### Clear NPM Cache
```bash
npm cache clean --force
npm install
```

### Reinstall All Frontend Dependencies
```bash
rm -rf node_modules
npm install
npm run dev
```

### Reinstall All Backend Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

---

## 🏗️ Build Commands

### Build for Production
```bash
cd /home/tw10517/v12
npm run build
# Creates: dist/ folder (ready to deploy)
```

### Preview Production Build Locally
```bash
cd /home/tw10517/v12
npm run preview
# Opens production build on http://localhost:4173
```

### Check Build Size
```bash
npm run build
# Shows file sizes and optimization info
```

---

## 🧪 Testing Commands

### Test Frontend
```bash
cd /home/tw10517/v12
npm run dev
# Then open http://localhost:3001 in browser
```

### Test Backend API
```bash
# In new terminal
curl -X GET http://localhost:5000/api/load-schedule
```

### Test Python Import
```bash
python -c "import flask, psycopg2, ortools; print('✓ All imports OK')"
```

### Check Project Files
```bash
cd /home/tw10517/v12
find src/modules -name "*.jsx" | wc -l  # Should show 8
ls -la src/utils/constants.js           # Should exist
```

---

## 📊 Status Check Commands

### Frontend Status
```bash
# Check if running
curl -I http://localhost:3001
# Response: HTTP/1.1 200 OK = ✅ Running
```

### Backend Status  
```bash
# Check if running
curl -I http://localhost:5000
# Response: HTTP/1.1 200 OK = ✅ Running
```

### Port Status
```bash
# Linux/Mac: Check what's using ports
lsof -i :3001
lsof -i :5000
lsof -i :5432

# Windows: Check ports
netstat -ano | findstr :3001
netstat -ano | findstr :5000
```

---

## 🐳 Docker Commands

### Start Everything with Docker
```bash
cd /home/tw10517/v12
docker-compose up --build
# Starts frontend, backend, and database
```

### Stop Docker
```bash
docker-compose down
```

### View Docker Logs
```bash
docker-compose logs -f backend   # Backend logs
docker-compose logs -f frontend  # Frontend logs (if enabled)
```

### Rebuild Docker Images
```bash
docker-compose build --no-cache
docker-compose up
```

---

## 💾 Database Commands

### Migrate Database
```bash
cd /home/tw10517/v12
python migrate.py
```

### Check Database Connection
```bash
python -c "import psycopg2; print('✓ psycopg2 OK')"
```

### View Database Files
```bash
ls -la /home/tw10517/v12/*.json
# Shows: employees.json, roles.json, shifts.json, etc.
```

---

## 📝 Viewing Files

### View Project Structure
```bash
cd /home/tw10517/v12
tree -L 2 -I 'node_modules|__pycache__'
# or
find . -maxdepth 2 -type d -not -path '*/\.*'
```

### View Documentation
```bash
# List all documentation files
ls -la /home/tw10517/v12/*.md

# View specific documentation
cat /home/tw10517/v12/COMPLETE_SETUP_GUIDE.md
cat /home/tw10517/v12/MODULES_QUICK_REFERENCE.md
```

### View Error Logs
```bash
# Frontend errors shown in: browser console (F12)
# Backend errors shown in: terminal running Flask

# Or check for error files
find /home/tw10517/v12 -name "*.log" -type f
```

---

## 🔐 Login Credentials

### Manager Login
```
User ID: manager
Password: manager_password
```

### Employee Login  
```
User ID: 10501
Password: 10501@twave
```

### Generate Employee Credentials
Employee password = UserID + "@twave"
- User 10502 → Password: 10502@twave
- User 10503 → Password: 10503@twave

---

## 🎯 Must-Run Commands

### First Time Setup
```bash
# 1. Install frontend deps
npm install

# 2. Install backend deps
pip install -r requirements.txt

# 3. Start frontend (terminal 1)
npm run dev

# 4. Start backend (terminal 2)
python shift_scheduler_backend_v2.py

# 5. Open browser
open http://localhost:3001
```

### Daily Startup
```bash
# Terminal 1
cd /home/tw10517/v12 && npm run dev

# Terminal 2
cd /home/tw10517/v12 && python shift_scheduler_backend_v2.py
```

### Full Clean Restart
```bash
# Stop everything (Ctrl+C in both terminals)

# Clear caches
rm -rf node_modules
npm cache clean --force

# Reinstall
npm install
pip install -r requirements.txt --force-reinstall

# Start again
npm run dev  # Terminal 1
python shift_scheduler_backend_v2.py  # Terminal 2
```

---

## ✅ Success Indicators

### Frontend Running ✓
- [ ] Terminal shows: `VITE v4.5.14 ready`
- [ ] Terminal shows: `http://localhost:3001`
- [ ] Browser loads: http://localhost:3001
- [ ] See login page with form

### Backend Running ✓
- [ ] Terminal shows: `Running on http://127.0.0.1:5000`
- [ ] No error messages in terminal
- [ ] `curl http://localhost:5000` returns data

### Application Ready ✓
- [ ] Can login with credentials
- [ ] Can navigate between pages
- [ ] Can view/create schedules
- [ ] Console has no major errors

---

## 📞 Quick Troubleshooting

### "Module not found" Error
```bash
npm install
npm run dev
```

### "Cannot connect to API"
```bash
# Check backend is running
ps aux | grep python
# If not, run:
python shift_scheduler_backend_v2.py
```

### "Port already in use"
```bash
# Kill process
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use different port
npx vite --port 3002
```

### "psycopg2 not found"
```bash
pip install psycopg2-binary
```

### "npm: command not found"
```bash
# Install Node.js from: https://nodejs.org
# Then try again
npm install
```

---

## 💡 Pro Tips

### Keep Terminals Open
- Use separate terminals for frontend and backend
- Makes it easier to see errors
- Can restart one without stopping the other

### Use Browser DevTools
- Press F12 to open developer tools
- Check Console tab for JavaScript errors
- Check Network tab to see API calls

### Monitor Logs
- Frontend logs: appear in browser console (F12)
- Backend logs: appear in terminal running Python
- Both show timestamps and error details

### Restart Smartly
- Frontend hangs? Press Ctrl+C and run `npm run dev` again
- Backend hangs? Press Ctrl+C and run Python command again
- Database issues? Restart backend (JSON fallback will be used)

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `COMPLETE_SETUP_GUIDE.md` | Detailed setup instructions |
| `QUICK_COMMANDS.md` | This file - copy/paste commands |
| `PROJECT_OVERVIEW.md` | Project overview |
| `MODULES_QUICK_REFERENCE.md` | Module API reference |
| `MODULE_INTEGRATION_GUIDE.md` | Integration instructions |

---

**Last Updated**: December 15, 2025  
**Status**: ✅ Ready to use  
**Version**: 1.0 - Command Reference
