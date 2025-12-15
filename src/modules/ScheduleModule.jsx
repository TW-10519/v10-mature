// Schedule Generation and Management Module
import { API_BASE_URL, daysOfWeek } from '../utils/constants';

export const useScheduleLogic = () => {
  
  const calculateOvertimeFromSchedule = (scheduleData, employees, roles) => {
    const updatedOvertimeHours = {};
    
    Object.entries(scheduleData).forEach(([date, dayShifts]) => {
      Object.entries(dayShifts).forEach(([empId, shiftList]) => {
        if (!Array.isArray(shiftList)) return;
        
        shiftList.forEach(shift => {
          if (shift && shift.startTime && shift.endTime) {
            const [startH, startM] = shift.startTime.split(':').map(Number);
            const [endH, endM] = shift.endTime.split(':').map(Number);
            let shiftHours = (endH + endM / 60) - (startH + startM / 60);
            
            const employee = employees.find(e => e.id === empId);
            const role = employee ? roles.find(r => r.id === employee.roleId) : null;
            const breakMinutes = role ? role.breakMinutes : 60;
            shiftHours -= breakMinutes / 60;
            
            if (!updatedOvertimeHours[empId]) {
              updatedOvertimeHours[empId] = 0;
            }
            updatedOvertimeHours[empId] += shiftHours;
          }
        });
      });
    });
    
    const overtimeData = {};
    employees.forEach(emp => {
      const maxHours = emp.weeklyHours || 40;
      const scheduledHours = updatedOvertimeHours[emp.id] || 0;
      
      if (scheduledHours > maxHours) {
        overtimeData[emp.id] = {
          employeeId: emp.id,
          employeeName: emp.name,
          plannedHours: Math.round(scheduledHours * 10) / 10,
          maxHours: maxHours,
          overtime: Math.round((scheduledHours - maxHours) * 10) / 10
        };
      }
    });
    
    return { overtimeHours: updatedOvertimeHours, overtimeData };
  };

  const generateSchedule = async (employees, roles, shifts, leaveRequests, unavailability, currentWeek, setLoading, setSchedule, setOvertimeHours, setOvertimeWarnings, t) => {
    setLoading(true);
    try {
      const shiftsForBackend = shifts.map(shift => {
        const daysOfWeek = Object.keys(shift.schedule).filter(day => shift.schedule[day].enabled);
        return {
          id: shift.id,
          name: shift.name,
          roleId: shift.roleId,
          priority: shift.priority,
          daysOfWeek,
          schedule: shift.schedule
        };
      });

      const response = await fetch(`${API_BASE_URL}/generate-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees,
          roles,
          shifts: shiftsForBackend,
          leaveRequests,
          unavailability,
          currentWeek
        })
      });

      const data = await response.json();

      if (data.success) {
        setSchedule(data.schedule);
        const { overtimeHours: newOvertimeHours, overtimeData } = calculateOvertimeFromSchedule(data.schedule, employees, roles);
        
        setOvertimeHours(newOvertimeHours);
        setOvertimeWarnings(Object.values(overtimeData));
        alert(t('scheduleGeneratedSuccess'));
        return true;
      } else {
        alert(t('errorPrefix') + data.error);
        return false;
      }
    } catch (error) {
      console.error('Error:', error);
      alert(t('failedToConnectBackend'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const validateSchedule = async (scheduleToValidate, employees, roles, shifts, currentWeek, language) => {
    try {
      const response = await fetch(`${API_BASE_URL}/validate-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule: scheduleToValidate,
          employees,
          roles,
          shifts,
          currentWeek,
          language
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Validation error:', error);
      return { valid: false, errors: ['Failed to connect to validation service'], overtime: [] };
    }
  };

  const saveScheduleToFile = async (schedule) => {
    try {
      const response = await fetch(`${API_BASE_URL}/save-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule })
      });
      if (response.ok) {
        console.log('✅ Schedule saved to schedule.json');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  // Schedule Editing Functions
  const enterEditMode = (setIsEditMode, setEditedSchedule, schedule) => {
    setIsEditMode(true);
    setEditedSchedule({ ...schedule });
  };

  const exitEditMode = (setIsEditMode, setEditedSchedule, setOvertimeWarnings) => {
    setIsEditMode(false);
    setEditedSchedule({});
    setOvertimeWarnings([]);
  };

  const saveEditedSchedule = async (editedSchedule, employees, roles, shifts, currentWeek, language, setLoading, setSchedule, setOvertimeHours, setIsEditMode, setEditedSchedule, setOvertimeWarnings, setLoading2, t) => {
    setLoading(true);
    try {
      const validation = await validateSchedule(editedSchedule, employees, roles, shifts, currentWeek, language);

      if (!validation.valid) {
        alert(`${t('constraintViolation')}:\n\n${validation.errors.join('\n')}`);
        setLoading(false);
        return;
      }

      if (validation.overtime && validation.overtime.length > 0) {
        setOvertimeWarnings(validation.overtime);
        setLoading(false);
        return;
      }

      setSchedule(editedSchedule);
      const { overtimeHours: newOvertimeHours, overtimeData } = calculateOvertimeFromSchedule(editedSchedule, employees, roles);
      setOvertimeHours(newOvertimeHours);
      
      await saveScheduleToFile(editedSchedule);
      setIsEditMode(false);
      setEditedSchedule({});
      alert(t('scheduleUpdatedSuccess'));
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert(t('failedToSaveSchedule'));
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop Functions
  const handleScheduleDragStart = (e, sourceDate, sourceEmployeeId, shift) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('sourceDate', sourceDate);
    e.dataTransfer.setData('sourceEmployeeId', sourceEmployeeId);
    e.dataTransfer.setData('shiftId', shift.id);
    e.dataTransfer.setData('shiftData', JSON.stringify(shift));
  };

  const handleScheduleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleScheduleDrop = (e, targetDate, targetEmployeeId, editedSchedule, setEditedSchedule, currentWeek, daysOfWeek) => {
    e.preventDefault();
    
    const sourceDate = e.dataTransfer.getData('sourceDate');
    const sourceEmployeeId = e.dataTransfer.getData('sourceEmployeeId');
    const shiftId = e.dataTransfer.getData('shiftId');
    const shiftData = JSON.parse(e.dataTransfer.getData('shiftData'));

    if (sourceDate === targetDate && sourceEmployeeId === targetEmployeeId) {
      return;
    }

    const newSchedule = { ...editedSchedule };

    // Remove from source
    if (newSchedule[sourceDate] && newSchedule[sourceDate][sourceEmployeeId]) {
      newSchedule[sourceDate][sourceEmployeeId] = newSchedule[sourceDate][sourceEmployeeId].filter(s => s.id !== shiftId);
      if (newSchedule[sourceDate][sourceEmployeeId].length === 0) {
        delete newSchedule[sourceDate][sourceEmployeeId];
      }
    }

    // Add to target
    if (!newSchedule[targetDate]) newSchedule[targetDate] = {};
    if (!newSchedule[targetDate][targetEmployeeId]) newSchedule[targetDate][targetEmployeeId] = [];
    newSchedule[targetDate][targetEmployeeId].push(shiftData);

    setEditedSchedule(newSchedule);
  };

  // Time Editing Functions
  const openTimeEditor = (date, employeeId, shift, setEditingShiftTime, setSelectedDay) => {
    setEditingShiftTime({ date, employeeId, shift });
    setSelectedDay(date);
  };

  const saveShiftTime = (editingShiftTime, editedSchedule, setEditedSchedule, setEditingShiftTime) => {
    if (!editingShiftTime.startTime || !editingShiftTime.endTime) {
      alert('Please enter both start and end times');
      return;
    }

    const newSchedule = { ...editedSchedule };
    const shifts = newSchedule[editingShiftTime.date]?.[editingShiftTime.employeeId] || [];
    
    const shiftIndex = shifts.findIndex(s => s.id === editingShiftTime.shift.id);
    if (shiftIndex !== -1) {
      shifts[shiftIndex] = {
        ...shifts[shiftIndex],
        startTime: editingShiftTime.startTime,
        endTime: editingShiftTime.endTime
      };
      newSchedule[editingShiftTime.date][editingShiftTime.employeeId] = shifts;
      setEditedSchedule(newSchedule);
    }

    setEditingShiftTime(null);
  };

  const deleteShiftFromSchedule = (editingShiftTime, editedSchedule, setEditedSchedule, setEditingShiftTime) => {
    const newSchedule = { ...editedSchedule };
    const shifts = newSchedule[editingShiftTime.date]?.[editingShiftTime.employeeId] || [];
    
    const filteredShifts = shifts.filter(s => s.id !== editingShiftTime.shift.id);
    
    if (filteredShifts.length > 0) {
      newSchedule[editingShiftTime.date][editingShiftTime.employeeId] = filteredShifts;
    } else {
      delete newSchedule[editingShiftTime.date][editingShiftTime.employeeId];
    }

    setEditedSchedule(newSchedule);
    setEditingShiftTime(null);
  };

  // Add Shift Functions
  const openAddShift = (date, employeeId, setAddingShift, setSelectedDay) => {
    setAddingShift({ date, employeeId, shiftId: null });
    setSelectedDay(date);
  };

  const saveAddedShift = (addingShift, editedSchedule, setEditedSchedule, shifts, setAddingShift) => {
    if (!addingShift.shiftId) {
      alert('Please select a shift');
      return;
    }

    const selectedShift = shifts.find(s => s.id === addingShift.shiftId);
    if (!selectedShift) return;

    const newSchedule = { ...editedSchedule };
    if (!newSchedule[addingShift.date]) newSchedule[addingShift.date] = {};
    if (!newSchedule[addingShift.date][addingShift.employeeId]) {
      newSchedule[addingShift.date][addingShift.employeeId] = [];
    }

    newSchedule[addingShift.date][addingShift.employeeId].push(selectedShift);
    setEditedSchedule(newSchedule);
    setAddingShift(null);
  };

  // Demand Forecasting
  const loadDemandForecast = async (currentWeek, language, setDemandForecast, setForecastLoading, t) => {
    setForecastLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/demand-forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentWeek,
          language
        })
      });

      const data = await response.json();

      if (data.success) {
        const translatedForecast = { ...data.forecast };
        translatedForecast.dayForecasts = {};
        
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        days.forEach((day, idx) => {
          if (data.forecast.dayForecasts[day]) {
            translatedForecast.dayForecasts[day] = data.forecast.dayForecasts[day];
          }
        });

        setDemandForecast(translatedForecast);
      } else {
        alert(`${t('failedToLoadForecast')}${data.error}`);
      }
    } catch (error) {
      console.error('Forecast error:', error);
      alert(`${t('failedToConnectForecast')}`);
    } finally {
      setForecastLoading(false);
    }
  };

  // Utility function for sorting employees by role
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
    calculateOvertimeFromSchedule,
    generateSchedule,
    validateSchedule,
    saveScheduleToFile,
    enterEditMode,
    exitEditMode,
    saveEditedSchedule,
    handleScheduleDragStart,
    handleScheduleDragOver,
    handleScheduleDrop,
    openTimeEditor,
    saveShiftTime,
    deleteShiftFromSchedule,
    openAddShift,
    saveAddedShift,
    loadDemandForecast,
    getSortedEmployees
  };
};
