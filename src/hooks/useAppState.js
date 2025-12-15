import { useState } from 'react';
import { getWeekDates } from '../constants';

/**
 * Consolidates all state management into organized groups
 * Returns organized state objects and setters to reduce component complexity
 */
export const useAppState = () => {
  // ============================================
  // AUTHENTICATION STATE
  // ============================================
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginCredentials, setLoginCredentials] = useState({ userId: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const authState = {
    isLoggedIn,
    currentUser,
    loginCredentials,
    loginError,
  };

  const authSetters = {
    setIsLoggedIn,
    setCurrentUser,
    setLoginCredentials,
    setLoginError,
  };

  // ============================================
  // DATA STATE (Employees, Roles, Shifts)
  // ============================================
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [shifts, setShifts] = useState([]);

  const dataState = {
    employees,
    roles,
    shifts,
  };

  const dataSetters = {
    setEmployees,
    setRoles,
    setShifts,
  };

  // ============================================
  // SCHEDULE STATE
  // ============================================
  const [schedule, setSchedule] = useState({});
  const [currentWeek, setCurrentWeek] = useState(getWeekDates());
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedSchedule, setEditedSchedule] = useState({});
  const [overtimeWarnings, setOvertimeWarnings] = useState([]);
  const [overtimeHours, setOvertimeHours] = useState({});
  const [demandForecast, setDemandForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  const scheduleState = {
    schedule,
    currentWeek,
    isEditMode,
    editedSchedule,
    overtimeWarnings,
    overtimeHours,
    demandForecast,
    forecastLoading,
  };

  const scheduleSetters = {
    setSchedule,
    setCurrentWeek,
    setIsEditMode,
    setEditedSchedule,
    setOvertimeWarnings,
    setOvertimeHours,
    setDemandForecast,
    setForecastLoading,
  };

  // ============================================
  // ATTENDANCE STATE
  // ============================================
  const [attendance, setAttendance] = useState({});
  const [attendanceTimes, setAttendanceTimes] = useState({});
  const [checkInOutDate, setCheckInOutDate] = useState(null);
  const [checkInOutShift, setCheckInOutShift] = useState(null);
  const [attendanceInTimes, setAttendanceInTimes] = useState({});
  const [attendanceOutTimes, setAttendanceOutTimes] = useState({});
  const [earlyCheckInWarning, setEarlyCheckInWarning] = useState(null);

  const attendanceState = {
    attendance,
    attendanceTimes,
    checkInOutDate,
    checkInOutShift,
    attendanceInTimes,
    attendanceOutTimes,
    earlyCheckInWarning,
  };

  const attendanceSetters = {
    setAttendance,
    setAttendanceTimes,
    setCheckInOutDate,
    setCheckInOutShift,
    setAttendanceInTimes,
    setAttendanceOutTimes,
    setEarlyCheckInWarning,
  };

  // ============================================
  // LEAVE & UNAVAILABILITY STATE
  // ============================================
  const [leaveRequests, setLeaveRequests] = useState({});
  const [unavailability, setUnavailability] = useState({});

  const leaveState = {
    leaveRequests,
    unavailability,
  };

  const leaveSetters = {
    setLeaveRequests,
    setUnavailability,
  };

  // ============================================
  // NOTIFICATIONS STATE
  // ============================================
  const [notifications, setNotifications] = useState({ messages: [], leaveRequests: [] });
  const [showManagerNotificationForm, setShowManagerNotificationForm] = useState(false);
  const [showEmployeeMessageForm, setShowEmployeeMessageForm] = useState(false);
  const [showLeaveRequestForm, setShowLeaveRequestForm] = useState(false);

  const notificationState = {
    notifications,
    showManagerNotificationForm,
    showEmployeeMessageForm,
    showLeaveRequestForm,
  };

  const notificationSetters = {
    setNotifications,
    setShowManagerNotificationForm,
    setShowEmployeeMessageForm,
    setShowLeaveRequestForm,
  };

  // ============================================
  // UI STATE
  // ============================================
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(null);
  const [language, setLanguage] = useState('en');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [employeeViewTab, setEmployeeViewTab] = useState('schedule');
  const [selectedShiftDetails, setSelectedShiftDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedRoles, setExpandedRoles] = useState({});

  const uiState = {
    activeView,
    selectedDate,
    language,
    selectedEmployeeId,
    employeeViewTab,
    selectedShiftDetails,
    loading,
    selectedDay,
    currentTime,
    expandedRoles,
  };

  const uiSetters = {
    setActiveView,
    setSelectedDate,
    setLanguage,
    setSelectedEmployeeId,
    setEmployeeViewTab,
    setSelectedShiftDetails,
    setLoading,
    setSelectedDay,
    setCurrentTime,
    setExpandedRoles,
  };

  // ============================================
  // EDIT & MODAL STATE
  // ============================================
  const [editingShiftTime, setEditingShiftTime] = useState(null);
  const [addingShift, setAddingShift] = useState(null);

  const editState = {
    editingShiftTime,
    addingShift,
  };

  const editSetters = {
    setEditingShiftTime,
    setAddingShift,
  };

  // ============================================
  // CONSOLIDATED STATE OBJECT
  // ============================================
  return {
    // State groups
    authState,
    dataState,
    scheduleState,
    attendanceState,
    leaveState,
    notificationState,
    uiState,
    editState,

    // Setter groups
    authSetters,
    dataSetters,
    scheduleSetters,
    attendanceSetters,
    leaveSetters,
    notificationSetters,
    uiSetters,
    editSetters,

    // Convenience getters for backward compatibility
    isLoggedIn,
    currentUser,
    employees,
    roles,
    shifts,
    schedule,
    currentWeek,
    attendance,
    leaveRequests,
    unavailability,
    notifications,
    activeView,
    selectedDate,
    language,
    loading,
    isEditMode,
    editedSchedule,
    overtimeWarnings,
    overtimeHours,
    demandForecast,
    forecastLoading,
  };
};
