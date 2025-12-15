// Authentication Module - Handles login and logout functionality
const API_BASE_URL = 'http://localhost:5000/api';

export const useAuthLogic = (employees) => {
  
  const handleLogin = async (loginCredentials, setLoginError, setCurrentUser, setIsLoggedIn, setActiveView) => {
    console.log('🔐 [AuthModule] handleLogin called with userId:', loginCredentials.userId);
    setLoginError('');

    try {
      // Load login credentials
      const response = await fetch('/login.json');
      const loginData = await response.json();

      const { userId, password } = loginCredentials;

      // Check manager login
      if (userId === loginData.manager.userId && password === loginData.manager.password) {
        console.log('✅ [AuthModule] Manager login successful');
        setCurrentUser({ id: '0', name: 'Manager', role: 'manager' });
        setIsLoggedIn(true);
        return true;
      }

      // Check employee login: userId format is 105XX where XX is employee ID
      if (userId.startsWith('105') && userId.length >= 4) {
        const employeeId = userId.substring(3);
        const employee = employees.find(emp => emp.id === employeeId);
        
        if (employee) {
          const expectedPassword = userId + '@twave';
          if (password === expectedPassword) {
            setCurrentUser({ ...employee, role: 'employee' });
            setIsLoggedIn(true);
            setActiveView('mySchedule');
            return true;
          }
        }
      }

      setLoginError('Invalid credentials');
      return false;
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Login system error');
      return false;
    }
  };

  const loadScheduleFromDatabase = async (setSchedule, setLeaveRequests, setUnavailability) => {
    try {
      console.log('📥 Loading schedule from database...');
      
      // Load schedule
      const scheduleResponse = await fetch(`${API_BASE_URL}/load-schedule`);
      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json();
        if (scheduleData.schedule && Object.keys(scheduleData.schedule).length > 0) {
          setSchedule(scheduleData.schedule);
          console.log('✅ Schedule loaded from PostgreSQL');
        }
      }

      // Load leave requests and unavailability
      const leaveResponse = await fetch(`${API_BASE_URL}/load-leave-unavailability`);
      if (leaveResponse.ok) {
        const leaveData = await leaveResponse.json();
        if (leaveData.leaveRequests && Object.keys(leaveData.leaveRequests).length > 0) {
          setLeaveRequests(leaveData.leaveRequests);
          console.log('✅ Leave requests loaded from PostgreSQL');
        }
        if (leaveData.unavailability && Object.keys(leaveData.unavailability).length > 0) {
          setUnavailability(leaveData.unavailability);
          console.log('✅ Unavailability loaded from PostgreSQL');
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load data from database (may be first login):', error);
    }
  };

  const handleLogout = async (leaveRequests, unavailability, schedule, setIsLoggedIn, setCurrentUser, setActiveView, setLoginCredentials, setLoginError) => {
    try {
      console.log('💾 Saving all data before logout...');
      const response = await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveRequests, unavailability, schedule })
      });

      if (response.ok) {
        console.log('✅ All data saved successfully before logout');
      } else {
        console.warn('⚠️ Warning saving data before logout');
      }
    } catch (error) {
      console.error('❌ Error saving data on logout:', error);
    }

    // Logout regardless of save success
    setIsLoggedIn(false);
    setCurrentUser(null);
    setActiveView('dashboard');
    setLoginCredentials({ userId: '', password: '' });
    setLoginError('');
  };

  return {
    handleLogin,
    handleLogout,
    loadScheduleFromDatabase
  };
};
