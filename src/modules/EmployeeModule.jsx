// Employee Management Module
import { API_BASE_URL } from '../utils/constants';

export const useEmployeeLogic = () => {
  
  const saveEmployee = (employeeForm, editingEmployee, employees, setEmployees, setEditingEmployee) => {
    console.log('👤 [EmployeeModule] saveEmployee called with name:', employeeForm.name);
    if (!employeeForm.name || !employeeForm.roleId) {
      alert('Please fill required fields');
      return;
    }

    const employeeData = {
      ...employeeForm,
      shiftsPerWeek: Math.ceil(employeeForm.weeklyHours / employeeForm.dailyMaxHours),
      skills: employeeForm.skills.split(',').map(s => s.trim()).filter(s => s)
    };

    if (editingEmployee) {
      setEmployees(employees.map(e => e.id === editingEmployee.id ? { ...employeeData, id: editingEmployee.id } : e));
      setEditingEmployee(null);
      console.log('✅ [EmployeeModule] Employee updated:', employeeForm.name);
    } else {
      setEmployees([...employees, { ...employeeData, id: Date.now().toString() }]);
      console.log('✅ [EmployeeModule] Employee created:', employeeForm.name);
    }
  };

  const deleteEmployee = (id, employees, setEmployees) => {
    if (window.confirm('Delete this employee?')) {
      setEmployees(employees.filter(e => e.id !== id));
    }
  };

  const loadDataFromFiles = async (setEmployees, setRoles, setShifts, setSchedule, setAttendance, setOvertimeHours) => {
    try {
      const empResponse = await fetch('/employees.json');
      const empData = await empResponse.json();
      setEmployees(empData);

      const rolesResponse = await fetch('/roles.json');
      const rolesData = await rolesResponse.json();
      setRoles(rolesData);

      const allShifts = [];
      rolesData.forEach(role => {
        if (role.shifts) {
          role.shifts.forEach(shift => {
            allShifts.push({ ...shift, roleId: role.id });
          });
        }
      });
      setShifts(allShifts);

      try {
        const scheduleResponse = await fetch('/schedule.json');
        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json();
          setSchedule(scheduleData);
          console.log('✅ Schedule loaded from schedule.json');
        }
      } catch (error) {
        console.log('No schedule.json found');
      }

      try {
        const attendanceResponse = await fetch('/attendance.json');
        if (attendanceResponse.ok) {
          const attendanceData = await attendanceResponse.json();
          setAttendance(attendanceData);

          const overtimeData = {};
          Object.entries(attendanceData).forEach(([key, record]) => {
            if (record.overtime) {
              const empId = record.employeeId || key.split('-')[0];
              overtimeData[empId] = (overtimeData[empId] || 0) + record.overtime;
            }
          });
          setOvertimeHours(overtimeData);
          console.log('✅ Attendance records loaded from attendance.json');
        }
      } catch (error) {
        console.log('No attendance.json found');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveDataToFiles = async (employees, roles, shifts, leaveRequests, unavailability) => {
    try {
      if (employees.length === 0 || roles.length === 0) {
        console.warn('⚠️ Skipping save: employees or roles are empty');
        return;
      }

      console.log('💾 Saving data to backend...');

      const rolesWithShifts = roles.map(role => ({
        ...role,
        shifts: shifts.filter(s => s.roleId === role.id).map(s => {
          const { roleId, ...shiftData } = s;
          return shiftData;
        })
      }));

      const response = await fetch(`${API_BASE_URL}/save-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees, roles: rolesWithShifts, leaveRequests, unavailability })
      });

      if (response.ok) {
        console.log('✅ Data saved successfully');
      } else {
        console.error('❌ Failed to save data:', response.statusText);
      }
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const getSortedEmployees = (employees, roles) => {
    return [...employees].sort((a, b) => {
      const roleA = roles.find(r => r.id === a.roleId);
      const roleB = roles.find(r => r.id === b.roleId);
      const roleNameA = roleA?.name || '';
      const roleNameB = roleB?.name || '';
      if (roleNameA !== roleNameB) return roleNameA.localeCompare(roleNameB);
      return a.name.localeCompare(b.name);
    });
  };

  return {
    saveEmployee,
    deleteEmployee,
    loadDataFromFiles,
    saveDataToFiles,
    getSortedEmployees
  };
};
