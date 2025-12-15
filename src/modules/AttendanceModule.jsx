// Attendance Module - Check-in/Check-out and attendance recording
import { API_BASE_URL, daysOfWeek } from '../utils/constants';

export const useAttendanceLogic = () => {
  
  const getAttendanceStatus = (actualTime, shift, date, type, currentWeek) => {
    const dayIndex = currentWeek.indexOf(date);
    const dayName = daysOfWeek[dayIndex];
    const shiftSchedule = shift?.schedule?.[dayName] || {};

    const targetTime = type === 'in' ? shiftSchedule.startTime : shiftSchedule.endTime;
    if (!targetTime) return 'onTime';

    const [targetHour, targetMin] = targetTime.split(':').map(Number);
    const [actualHour, actualMin] = actualTime.split(':').map(Number);

    const targetMinutes = targetHour * 60 + targetMin;
    const actualMinutes = actualHour * 60 + actualMin;
    const diff = actualMinutes - targetMinutes;

    if (type === 'in') {
      if (diff <= 0) return 'onTime';
      if (diff <= 15) return 'slightlyLate';
      return 'late';
    } else {
      if (Math.abs(diff) <= 15) return 'onTime';
      return 'slightlyLate';
    }
  };

  const markAttendance = async (employeeId, date, shiftId, inTime, shifts, currentWeek, setEarlyCheckInWarning) => {
    const key = `${employeeId}-${date}-${shiftId}`;
    
    if (!inTime) {
      alert('Please enter in-time');
      return;
    }

    const shift = shifts.find(s => s.id === shiftId);
    const dayIndex = currentWeek.indexOf(date);
    if (dayIndex === -1) return;
    
    const dayName = daysOfWeek[dayIndex];
    const shiftSchedule = shift?.schedule?.[dayName];
    
    if (!shiftSchedule) return;

    const [shiftHour, shiftMin] = shiftSchedule.startTime.split(':').map(Number);
    const [inHour, inMin] = inTime.split(':').map(Number);
    
    const shiftMinutes = shiftHour * 60 + shiftMin;
    const inMinutes = inHour * 60 + inMin;
    const diff = inMinutes - shiftMinutes;

    if (diff < -60) {
      setEarlyCheckInWarning({
        employeeId,
        date,
        shiftId,
        key,
        inTime,
        shiftStartTime: shiftSchedule.startTime,
        minutesEarly: Math.abs(diff)
      });
      return false;
    }
    return true;
  };

  const recordAttendance = async (key, employeeId, date, shiftId, inTime, shiftStartTime, shifts, attendance, setAttendance, attendanceOutTimes, currentWeek) => {
    const shift = shifts.find(s => s.id === shiftId);
    const dayIndex = currentWeek.indexOf(date);
    if (dayIndex === -1) return;
    
    const dayName = daysOfWeek[dayIndex];
    const shiftSchedule = shift?.schedule?.[dayName];

    if (!shiftSchedule) return;

    const [shiftHour, shiftMin] = shiftStartTime.split(':').map(Number);
    const [inHour, inMin] = inTime.split(':').map(Number);

    const shiftMinutes = shiftHour * 60 + shiftMin;
    const inMinutes = inHour * 60 + inMin;
    const diff = inMinutes - shiftMinutes;

    let status = 'onTime';
    if (diff > 15) status = 'late';
    else if (diff > 0) status = 'slightlyLate';
    else if (diff >= -60) status = 'onTime';

    let outStatus = 'onTime';
    const outTime = attendanceOutTimes[key] || '';

    if (outTime && shiftSchedule.endTime) {
      const [endHour, endMin] = shiftSchedule.endTime.split(':').map(Number);
      const [outHour, outMin] = outTime.split(':').map(Number);

      const endMinutes = endHour * 60 + endMin;
      const outMinutes = outHour * 60 + outMin;
      const outDiff = outMinutes - endMinutes;

      if (Math.abs(outDiff) <= 15) {
        outStatus = 'onTime';
      } else {
        outStatus = 'slightlyLate';
      }
    }

    const newAttendance = {
      ...attendance,
      [key]: {
        employeeId,
        date,
        shiftId,
        inTime,
        outTime,
        status,
        outStatus
      }
    };
    setAttendance(newAttendance);
    await saveAttendanceToFile(newAttendance);
  };

  const saveAttendanceToFile = async (attendanceData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/save-attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: attendanceData })
      });
      if (response.ok) {
        console.log('✅ Attendance records saved');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
    }
  };

  // Leave and Unavailability Management
  const toggleLeave = (employeeId, date, leaveRequests, setLeaveRequests, unavailability, setUnavailability) => {
    const key = `${employeeId}-${date}`;
    const newLeaves = { ...leaveRequests };
    
    if (newLeaves[key]) {
      delete newLeaves[key];
    } else {
      newLeaves[key] = { employeeId, date, type: 'leave' };
      const newUnavail = { ...unavailability };
      delete newUnavail[key];
      setUnavailability(newUnavail);
    }
    
    setLeaveRequests(newLeaves);
  };

  const toggleUnavailability = (employeeId, date, employees, leaveRequests, unavailability, setUnavailability) => {
    const key = `${employeeId}-${date}`;
    const newUnavail = { ...unavailability };
    
    if (newUnavail[key]) {
      delete newUnavail[key];
    } else {
      const employee = employees.find(e => e.id === employeeId);
      const minAvailableDays = Math.ceil(employee?.shiftsPerWeek || 5);
      const availableDays = 7 - Object.keys(leaveRequests)
        .filter(k => k.startsWith(`${employeeId}-`)).length 
        - Object.keys(unavailability)
        .filter(k => k.startsWith(`${employeeId}-`)).length;
      
      if (availableDays <= minAvailableDays) {
        alert(`Cannot mark unavailable. Employee needs at least ${minAvailableDays} days available.`);
        return;
      }
      
      newUnavail[key] = { employeeId, date, type: 'unavailable' };
    }
    
    setUnavailability(newUnavail);
  };

  const isOnLeave = (employeeId, date, leaveRequests) => {
    return !!leaveRequests[`${employeeId}-${date}`];
  };

  const isUnavailable = (employeeId, date, unavailability) => {
    return !!unavailability[`${employeeId}-${date}`];
  };

  const handleAttendanceTimeChange = (key, value, setAttendanceTimes) => {
    setAttendanceTimes(prev => ({ ...prev, [key]: value }));
  };

  const handleOutTimeChange = (key, value, setAttendanceOutTimes) => {
    setAttendanceOutTimes(prev => ({ ...prev, [key]: value }));
  };

  const confirmOvertime = async (overtimeWarnings, currentWeek, editedSchedule, attendance, setAttendance, overtimeHours, setOvertimeHours, setIsEditMode, setEditedSchedule, setOvertimeWarnings, scheduleLogic, t) => {
    try {
      const newAttendance = { ...attendance };
      const updatedOvertimeHours = { ...overtimeHours };

      overtimeWarnings.forEach(warning => {
        const key = `${warning.employeeId}-${currentWeek[0]}-overtime`;
        newAttendance[key] = {
          employeeId: warning.employeeId,
          weekStart: currentWeek[0],
          weekEnd: currentWeek[6],
          plannedHours: warning.plannedHours,
          maxHours: warning.maxHours,
          overtime: warning.overtime,
          recordedAt: new Date().toISOString(),
          type: 'overtime'
        };

        updatedOvertimeHours[warning.employeeId] =
          (updatedOvertimeHours[warning.employeeId] || 0) + warning.overtime;
      });

      await fetch(`${API_BASE_URL}/save-attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: newAttendance })
      });

      setAttendance(newAttendance);
      setOvertimeHours(updatedOvertimeHours);

      setEditedSchedule(editedSchedule);
      await scheduleLogic.saveScheduleToFile(editedSchedule);
      setIsEditMode(false);
      setEditedSchedule({});
      setOvertimeWarnings([]);
      alert(t('scheduleUpdateWithOvertimeSuccess'));
    } catch (error) {
      console.error('Error saving with overtime:', error);
      alert(t('failedToSaveSchedule'));
    }
  };

  const openCheckInPopup = (date, shift, setCheckInOutDate, setCheckInOutShift) => {
    setCheckInOutDate(date);
    setCheckInOutShift(shift);
  };

  const openCheckOutPopup = (date, shift, setCheckInOutDate, setCheckInOutShift) => {
    setCheckInOutDate(date);
    setCheckInOutShift(shift);
  };

  const confirmCheckInOut = async (checkInOutDate, checkInOutShift, currentUser, attendanceTimes, attendanceOutTimes, attendance, setAttendance, schedule, employees, shifts, currentWeek, setCheckInOutDate, setCheckInOutShift, setEarlyCheckInWarning, t) => {
    if (!checkInOutDate || !checkInOutShift) return;

    const key = `${currentUser.id}-${checkInOutDate}-${checkInOutShift.id}`;
    const inTime = attendanceTimes[key];
    const outTime = attendanceOutTimes[key];

    try {
      const existingRecord = attendance[key];
      const isCheckIn = !existingRecord?.inTime;

      const newAttendance = {
        ...attendance,
        [key]: {
          ...(existingRecord || {}),
          employeeId: currentUser.id,
          date: checkInOutDate,
          shiftId: checkInOutShift.id,
          [isCheckIn ? 'inTime' : 'outTime']: isCheckIn ? inTime : outTime,
          status: isCheckIn ? 'checkedIn' : (existingRecord?.status || '')
        }
      };

      setAttendance(newAttendance);
      await fetch(`${API_BASE_URL}/save-attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: newAttendance })
      });

      setCheckInOutDate(null);
      setCheckInOutShift(null);
      alert(isCheckIn ? t('checkedIn') : t('checkedOut'));
    } catch (error) {
      console.error('Check-in/out error:', error);
      alert(t('failedToSaveSchedule'));
    }
  };

  return {
    getAttendanceStatus,
    markAttendance,
    recordAttendance,
    saveAttendanceToFile,
    toggleLeave,
    toggleUnavailability,
    isOnLeave,
    isUnavailable,
    handleAttendanceTimeChange,
    handleOutTimeChange,
    confirmOvertime,
    openCheckInPopup,
    openCheckOutPopup,
    confirmCheckInOut
  };
};
