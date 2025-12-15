import React, { useState, useEffect, Fragment } from 'react';
import {
  Calendar, Users, Clock, Save, Plus, Edit2, Trash2, X,
  Check, AlertCircle, ChevronDown, ChevronRight, GripVertical,
  FileText, Settings, UserCheck, BarChart3, Download, Upload, Printer, Bell
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Import modules
import { useAuthLogic } from './modules/AuthModule';
import { useEmployeeLogic } from './modules/EmployeeModule';
import { useRoleLogic } from './modules/RoleModule';
import { useShiftLogic } from './modules/ShiftModule';
import { useScheduleLogic } from './modules/ScheduleModule';
import { useAttendanceLogic } from './modules/AttendanceModule';
import { useNotificationsLogic } from './modules/NotificationsModule';
import { useExportLogic } from './modules/ExportModule';

// Import constants and utilities
import { API_BASE_URL, daysOfWeek, translations, getWeekDates } from './utils/constants';

const ShiftSchedulerApp = () => {
  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginCredentials, setLoginCredentials] = useState({ userId: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [leaveRequests, setLeaveRequests] = useState({});
  const [unavailability, setUnavailability] = useState({});
  const [attendance, setAttendance] = useState({});
  const [attendanceTimes, setAttendanceTimes] = useState({});
  const [currentWeek, setCurrentWeek] = useState(getWeekDates());
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(null);
  const [language, setLanguage] = useState('en');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedSchedule, setEditedSchedule] = useState({});
  const [editingShiftTime, setEditingShiftTime] = useState(null);
  const [overtimeWarnings, setOvertimeWarnings] = useState([]);
  const [addingShift, setAddingShift] = useState(null);
  const [overtimeHours, setOvertimeHours] = useState({});

  // Check-in/Check-out state
  const [checkInOutDate, setCheckInOutDate] = useState(null);
  const [checkInOutShift, setCheckInOutShift] = useState(null);
  const [employeeViewTab, setEmployeeViewTab] = useState('schedule'); // 'schedule' or 'messages'
  const [selectedShiftDetails, setSelectedShiftDetails] = useState(null); // For shift details popup

  // Notifications state
  const [notifications, setNotifications] = useState({ messages: [], leaveRequests: [] });
  const [showManagerNotificationForm, setShowManagerNotificationForm] = useState(false);
  const [showEmployeeMessageForm, setShowEmployeeMessageForm] = useState(false);
  const [showLeaveRequestForm, setShowLeaveRequestForm] = useState(false);
  const [notificationForm, setNotificationForm] = useState({ message: '' });
  const [leaveRequestForm, setLeaveRequestForm] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Form states
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [editingShift, setEditingShift] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedRoles, setExpandedRoles] = useState({});
  const [attendanceInTimes, setAttendanceInTimes] = useState({});
  const [attendanceOutTimes, setAttendanceOutTimes] = useState({});
  const [earlyCheckInWarning, setEarlyCheckInWarning] = useState(null);

  const [employeeForm, setEmployeeForm] = useState({
    name: '', roleId: '', weeklyHours: 40, dailyMaxHours: 8, shiftsPerWeek: 5, skills: ''
  });

  const [roleForm, setRoleForm] = useState({
    name: '', weekendRequired: false, requiredSkills: '', breakMinutes: 60
  });

  const [shiftForm, setShiftForm] = useState({
    name: '', roleId: '', priority: 50,
    schedule: {
      Monday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [], dayPriority: 1 },
      Tuesday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [], dayPriority: 1 },
      Wednesday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [], dayPriority: 1 },
      Thursday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [], dayPriority: 1 },
      Friday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [], dayPriority: 1 },
      Saturday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [], dayPriority: 1 },
      Sunday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [], dayPriority: 1 }
    }
  });

  // Demand Forecasting state
  const [demandForecast, setDemandForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  // ============================================
  // MODULE INITIALIZATION & WRAPPERS
  // ============================================
  
  // Initialize modules
  const authLogic = useAuthLogic(employees);
  const employeeLogic = useEmployeeLogic();
  const roleLogic = useRoleLogic();
  const shiftLogic = useShiftLogic();
  const scheduleLogic = useScheduleLogic();
  const attendanceLogic = useAttendanceLogic();
  const notificationsLogic = useNotificationsLogic();
  const exportLogic = useExportLogic();

  // Get translation function
  const t = (key) => translations[language]?.[key] || key;

  const daysOfWeek_temp = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const translations_temp = {
    en: {
      title: 'Attendance Management System',
      subtitle: 'Demo',
      export: 'Export',
      generateSchedule: 'Generate Schedule',
      processing: 'Processing...',
      dashboard: 'Dashboard',
      employees: 'Employees',
      roles: 'Roles',
      schedule: 'Schedule',
      dailyView: 'Daily View',
      attendance: 'Attendance',
      totalEmployees: 'Total Employees',
      totalRoles: 'Total Roles',
      shiftTypes: 'Shift Types',
      attendanceRecords: 'Attendance Records',
      systemOverview: 'System Overview',
      leaveRequests: 'Leave Requests',
      unavailability: 'Unavailability',
      employeeManagement: 'Employee Management',
      addEmployee: 'Add Employee',
      editEmployee: 'Edit Employee',
      newEmployee: 'New Employee',
      name: 'Name',
      role: 'Role',
      selectRole: 'Select a role',
      weeklyHours: 'Weekly Hours',
      dailyMaxHours: 'Daily Max Hours',
      skills: 'Skills (comma-separated)',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      delete: 'Delete',
      edit: 'Edit',
      deleteConfirm: 'Delete this employee?',
      deleteRoleConfirm: 'Delete this role and all its shifts?',
      deleteShiftConfirm: 'Delete this shift?',
      fillRequired: 'Please fill required fields',
      enterRoleName: 'Please enter role name',
      roleManagement: 'Role Management',
      addRole: 'Add Role',
      editRole: 'Edit Role',
      newRole: 'New Role',
      roleName: 'Role Name',
      breakTime: 'Break Time (minutes)',
      requiredSkills: 'Required Skills (comma-separated)',
      weekendRequired: 'Weekend work required',
      shifts: 'Shifts',
      addShift: 'Add Shift',
      editShift: 'Edit Shift',
      newShift: 'New Shift',
      shiftName: 'Shift Name',
      priority: 'Priority (0-100)',
      daySchedule: 'Day Schedule',
      weeklySchedule: 'Weekly Schedule',
      noSchedule: 'No schedule generated yet',
      generateScheduleBtn: 'Click "Generate Schedule" to create one',
      dailyScheduleView: 'Daily Schedule',
      attendanceManagement: 'Attendance Management',
      status: 'Status',
      leave: 'Leave',
      unavailable: 'Unavailable',
      attendanceRecordsList: 'Attendance Records',
      recordBtn: 'Record',
      onTime: 'On time',
      slightlyLate: 'Slightly late',
      late: 'Late',
      selectEmployee: 'Select an employee',
      roleDoesNotMatch: 'Role does not match',
      selectDate: 'Select Date',
      timeSlots: 'Time Slots',
      noShiftsScheduled: 'No shifts scheduled for this day',
      availabilityStatus: 'Availability Status',
      arrivedAt: 'Arrived at',
      editSchedule: 'Edit Schedule',
      saveChanges: 'Save Changes',
      discardChanges: 'Discard Changes',
      editShiftTime: 'Edit Shift Time',
      startTime: 'Start Time',
      endTime: 'End Time',
      overtimeDetected: 'Overtime Detected',
      overtimeWarning: 'The following employees will work overtime:',
      weeklyMaxExceeded: 'Weekly max hours exceeded',
      continueWithOvertime: 'Continue and record overtime?',
      constraintViolation: 'Constraint Violation',
      consecutiveShiftsError: 'Cannot assign more than 5 consecutive shifts without a break',
      dragToReassign: 'Drag shifts to reassign',
      clickToEditTime: 'Click to edit time',
      selectShift: 'Select Shift',
      customTime: 'Custom Time',
      overtimeHours: 'Overtime Hours',
      totalOvertime: 'Total Overtime',
      noOvertime: 'No overtime recorded',
      deleteShiftConfirmSchedule: 'Delete this shift from schedule?',
      changeShiftType: 'Change Shift Type',
      dailyMaxWarning: 'Daily Max Hours Warning',
      dailyMaxExceeded: 'This shift exceeds the daily maximum hours',
      continueAnyway: 'Continue anyway?',
      dailyMax: 'Daily Max',
      shiftHours: 'Shift Hours',
      roleManagementTitle: 'Role Management',
      addRoleBtn: 'Add Role',
      breakLabel: 'Break',
      minLabel: 'min',
      weekendLabel: 'Weekend',
      requiredLabel: 'Required',
      notRequiredLabel: 'Not required',
      skillsLabel: 'Skills',
      shiftsLabel: 'Shifts',
      addShiftBtn: 'Add Shift',
      editShiftTitle: 'Edit Shift',
      newShiftTitle: 'New Shift',
      shiftNameLabel: 'Shift Name *',
      priorityLabel: 'Priority (0-100)',
      dayScheduleLabel: 'Day Schedule',
      workHours: 'Work Hours',
      totalShiftTime: 'Total Shift Time',
      workHoursSummary: 'Work Hours Summary',
      noWorkSchedule: 'No days enabled yet',
      morningPlaceholder: 'Morning',
      machineOperatorPlaceholder: 'Machine Operator',
      machineOpSkillPlaceholder: 'Machine operation, Quality assurance',
      daysLabel: 'Days',
      priortyLabel: 'Priority',
      dayPriorityLabel: 'Day Priority',
      earlyCheckInTitle: 'Early Check-In',
      earlyCheckInMsg: 'Check-in is more than 1 hour early',
      checkInTimeLabel: 'Check-in Time',
      shiftStartTimeLabel: 'Shift Start Time',
      minutesEarlyLabel: 'minutes early',
      goAheadBtn: 'Go Ahead',
      inTimeLabel: 'In Time',
      outTimeLabel: 'Out Time',
      recordAttendanceBtn: 'Record',
      addingShiftMsg: 'Adding this shift may result in overtime. You\'ll be prompted to confirm before saving.',
      scheduleGeneratedSuccess: '✅ Schedule generated and saved successfully!',
      scheduleUpdatedSuccess: '✅ Schedule updated successfully!',
      scheduleUpdateWithOvertimeSuccess: '✅ Schedule updated with overtime recorded!',
      scheduleConfirmedSuccess: '✅ Schedule confirmed and saved!',
      notificationSentSuccess: 'Notification sent successfully!',
      messageSentSuccess: 'Message sent successfully!',
      fillRequiredFields: 'Please fill required fields',
      enterInTime: 'Please enter in-time',
      breakRequiredError: 'Shifts longer than 4 hours require a break time to be configured for the role',
      employeeAlreadyHasShift: 'Employee already has a shift on this day',
      selectEmployeeAndMessage: 'Please select an employee and enter a message',
      fillAllFields: 'Please fill all fields',
      cannotMarkUnavailable: 'Cannot mark unavailable. Employee needs at least {days} days available.',
      scheduleTableNotFound: 'Schedule table not found',
      dailyScheduleNotFound: 'Daily schedule not found',
      roleScheduleNotFound: 'Role schedule not found',
      failedToDownloadSchedule: 'Failed to download schedule',
      failedToDownloadDailySchedule: 'Failed to download daily schedule',
      failedToDownloadAttendance: 'Failed to download attendance',
      failedToSaveSchedule: '❌ Failed to save schedule',
      failedToLoadForecast: 'Failed to load demand forecast: ',
      failedToConnectForecast: '❌ Failed to connect to forecast service.',
      failedToConnectBackend: '❌ Failed to connect to backend.',
      errorPrefix: '❌ Error: ',
      // Login
      loginTitle: 'Attendance Management System ',
      userId: 'User ID',
      password: 'Password',
      loginBtn: 'Login',
      logout: 'Logout',
      invalidCredentials: 'Invalid credentials',
      // Employee View
      mySchedule: 'My Schedule',
      confirmCheckIn: 'Confirm Check-In',
      confirmCheckOut: 'Confirm Check-Out',
      checkInTime: 'Check-In Time',
      checkOutTime: 'Check-Out Time',
      alreadyCheckedIn: 'Already checked in',
      alreadyCheckedOut: 'Already checked out',
      noShiftToday: 'No shift assigned for today',
      checkedIn: 'Checked In',
      checkedOut: 'Checked Out',
      missed: 'MISSED',
      // Notifications
      notifications: 'Notifications',
      noNotifications: 'No notifications yet',
      sendNotification: 'Send Message',
      requestLeave: 'Request Leave',
      sendMessage: 'Send Message',
      messageToManager: 'Message to Manager',
      typeMessage: 'Type your message...',
      send: 'Send',
      leaveRequest: 'Leave Request',
      startDate: 'Start Date',
      endDate: 'End Date',
      reason: 'Reason',
      requestReason: 'Reason for leave...',
      submit: 'Submit',
      messages: 'Messages',
      noMessages: 'No messages',
      from: 'From',
      approve: 'Approve',
      reject: 'Reject',
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      messageSent: 'Message sent successfully!',
      leaveRequestSent: 'Leave request submitted!',
      leaveApproved: 'Leave request approved',
      leaveRejected: 'Leave request rejected',
      recordOvertimeBtn: 'Record Overtime & Save',
      noteLabel: 'Note',
      plannedHours: 'Planned Hours',
      inTime: 'In Time',
      outTime: 'Out Time',
      japanLocalTime: 'Japan Local Time',
      Monday: 'Monday',
      Tuesday: 'Tuesday',
      Wednesday: 'Wednesday',
      Thursday: 'Thursday',
      Friday: 'Friday',
      Saturday: 'Saturday',
      Sunday: 'Sunday',
      confirmSchedule: 'Confirm & Save',
      downloadPDF: 'Download PDF',
      printSchedule: 'Print',
      demandForecast: 'Demand Forecast',
      loadForecast: 'Load Forecast',
      forecastingLoadingDemand: 'Forecasting demand...',
      peakDay: 'Peak Day',
      lowestDemand: 'Lowest Demand',
      historicalRange: 'Historical Range',
      trend: 'Trend',
      predictedEmployees: 'Predicted Employees',
      confidence: 'Confidence',
      insights: 'Key Insights',
      recommendations: 'Recommendations',
      roleBasedForecast: 'Role-Based Forecast',
      averageDemand: 'Average Demand',
      peakDemand: 'Peak Demand',
      variability: 'Variability',
      absenceRate: 'Absence Rate',
      overtimeShifts: 'Avg Overtime Shifts',
      weeklyBreakdown: 'Weekly Breakdown',
      range: 'Range',
      historicalWeeks: 'Historical Weeks',
      scheduleConfidence: 'Schedule Confidence',
      dateAndDay: 'Date & Day',
      shiftTimings: 'Shift Timings',
      hours: 'Hours',
      veryLate: 'Very Late',
      break: 'Break',
      minutes: 'minutes',
      downloadWeeklyAttendance: 'Download Weekly Attendance',
      downloadMonthlyAttendance: 'Download Monthly Attendance'
    },
    ja: {
      title: '勤怠管理システム',
      subtitle: 'デモ',
      export: 'エクスポート',
      generateSchedule: 'スケジュール生成',
      processing: '処理中...',
      dashboard: 'ダッシュボード',
      employees: '従業員',
      roles: 'ロール',
      schedule: 'スケジュール',
      dailyView: '日別表示',
      attendance: '出勤',
      totalEmployees: '総従業員数',
      totalRoles: '総ロール数',
      shiftTypes: 'シフトタイプ',
      attendanceRecords: '出勤記録',
      systemOverview: 'システム概要',
      leaveRequests: '休暇申請',
      unavailability: '利用不可',
      employeeManagement: '従業員管理',
      addEmployee: '従業員を追加',
      editEmployee: '従業員を編集',
      newEmployee: '新しい従業員',
      name: '名前',
      role: 'ロール',
      selectRole: 'ロールを選択してください',
      weeklyHours: '週間時間',
      dailyMaxHours: '1日の最大時間',
      skills: 'スキル（カンマ区切り）',
      save: '保存',
      cancel: 'キャンセル',
      close: '閉じる',
      delete: '削除',
      edit: '編集',
      deleteConfirm: 'この従業員を削除しますか？',
      deleteRoleConfirm: 'このロールとすべてのシフトを削除しますか？',
      deleteShiftConfirm: 'このシフトを削除しますか？',
      fillRequired: '必須フィールドに入力してください',
      enterRoleName: 'ロール名を入力してください',
      roleManagement: 'ロール管理',
      addRole: 'ロールを追加',
      editRole: 'ロールを編集',
      newRole: '新しいロール',
      roleName: 'ロール名',
      breakTime: '休憩時間（分）',
      requiredSkills: '必要なスキル（カンマ区切り）',
      weekendRequired: '週末の勤務が必須',
      shifts: 'シフト',
      addShift: 'シフトを追加',
      editShift: 'シフトを編集',
      newShift: '新しいシフト',
      shiftName: 'シフト名',
      priority: '優先度（0-100）',
      daySchedule: '日程',
      weeklySchedule: '週間スケジュール',
      noSchedule: 'スケジュールはまだ生成されていません',
      generateScheduleBtn: '"スケジュール生成"をクリックして作成します',
      dailyScheduleView: '日別スケジュール',
      attendanceManagement: '出勤管理',
      status: 'ステータス',
      leave: '休暇',
      unavailable: '利用不可',
      attendanceRecordsList: '出勤記録',
      recordBtn: '記録',
      onTime: '定時',
      slightlyLate: 'やや遅刻',
      late: '遅刻',
      selectEmployee: '従業員を選択',
      roleDoesNotMatch: 'ロールが一致しません',
      selectDate: '日付を選択',
      timeSlots: 'タイムスロット',
      noShiftsScheduled: 'この日はシフトがスケジュール済みです',
      availabilityStatus: '利用可能ステータス',
      arrivedAt: '到着時間',
      editSchedule: 'スケジュール編集',
      saveChanges: '変更を保存',
      discardChanges: '変更を破棄',
      editShiftTime: 'シフト時間を編集',
      startTime: '開始時間',
      endTime: '終了時間',
      overtimeDetected: '残業検出',
      overtimeWarning: '以下の従業員が残業になります：',
      weeklyMaxExceeded: '週間最大時間を超過',
      continueWithOvertime: '残業を記録して続行しますか？',
      constraintViolation: '制約違反',
      consecutiveShiftsError: '5日以上連続のシフトはできません（1日以上の休暇が必要です）',
      dragToReassign: 'ドラッグして再割り当て',
      clickToEditTime: 'クリックして時間を編集',
      selectShift: 'シフトを選択',
      customTime: 'カスタム時間',
      overtimeHours: '残業時間',
      totalOvertime: '総残業時間',
      noOvertime: '残業記録なし',
      deleteShiftConfirmSchedule: 'このシフトをスケジュールから削除しますか？',
      changeShiftType: 'シフトタイプを変更',
      dailyMaxWarning: '日次最大時間警告',
      dailyMaxExceeded: 'このシフトは1日の最大時間を超えています',
      continueAnyway: 'それでも続行しますか？',
      dailyMax: '日次最大',
      shiftHours: 'シフト時間',
      editRoleTitle: 'ロールを編集',
      newRoleTitle: '新しいロール',
      roleManagementTitle: 'ロール管理',
      addRoleBtn: 'ロールを追加',
      breakLabel: '休憩',
      minLabel: '分',
      weekendLabel: '週末',
      requiredLabel: '必須',
      notRequiredLabel: '必須なし',
      skillsLabel: 'スキル',
      shiftsLabel: 'シフト',
      addShiftBtn: 'シフトを追加',
      editShiftTitle: 'シフトを編集',
      newShiftTitle: '新しいシフト',
      shiftNameLabel: 'シフト名 *',
      priorityLabel: '優先度 (0-100)',
      dayScheduleLabel: '日程',
      workHours: '勤務時間',
      totalShiftTime: 'シフト総時間',
      workHoursSummary: '勤務時間サマリー',
      noWorkSchedule: 'まだ有効な日がありません',
      morningPlaceholder: '朝',
      machineOperatorPlaceholder: 'マシンオペレーター',
      machineOpSkillPlaceholder: '機械操作、品質保証',
      daysLabel: '日数',
      priortyLabel: '優先度',
      dayPriorityLabel: '日の優先度',
      earlyCheckInTitle: '早期チェックイン',
      earlyCheckInMsg: 'チェックインが1時間以上早い',
      checkInTimeLabel: 'チェックイン時間',
      shiftStartTimeLabel: 'シフト開始時間',
      minutesEarlyLabel: '分早い',
      goAheadBtn: '進める',
      inTimeLabel: '入退勤時間',
      outTimeLabel: '退勤時間',
      recordAttendanceBtn: '記録',
      addingShiftMsg: 'このシフトを追加すると、残業が発生する可能性があります。保存する前に確認を求めます。',
      scheduleGeneratedSuccess: '✅ スケジュールが正常に生成・保存されました！',
      scheduleUpdatedSuccess: '✅ スケジュールが正常に更新されました！',
      scheduleUpdateWithOvertimeSuccess: '✅ スケジュールが残業記録で更新されました！',
      scheduleConfirmedSuccess: '✅ スケジュールが確認・保存されました！',
      notificationSentSuccess: '通知が正常に送信されました！',
      messageSentSuccess: 'メッセージが正常に送信されました！',
      fillRequiredFields: '必須フィールドに入力してください',
      enterInTime: '入退勤時間を入力してください',
      breakRequiredError: '4時間を超えるシフトにはロールの休憩時間設定が必要です',
      employeeAlreadyHasShift: 'この従業員はこの日にすでにシフトがあります',
      selectEmployeeAndMessage: '従業員を選択してメッセージを入力してください',
      fillAllFields: 'すべてのフィールドに入力してください',
      cannotMarkUnavailable: '利用不可にできません。従業員は最低でも{days}日利用可能である必要があります。',
      scheduleTableNotFound: 'スケジュール表が見つかりません',
      dailyScheduleNotFound: '日別スケジュールが見つかりません',
      roleScheduleNotFound: 'ロールスケジュールが見つかりません',
      failedToDownloadSchedule: 'スケジュールのダウンロードに失敗しました',
      failedToDownloadDailySchedule: '日別スケジュールのダウンロードに失敗しました',
      failedToDownloadAttendance: '出勤記録のダウンロードに失敗しました',
      failedToSaveSchedule: '❌ スケジュール保存に失敗しました',
      failedToLoadForecast: '需要予測の読み込みに失敗しました: ',
      failedToConnectForecast: '❌ 予測サービスへの接続に失敗しました。',
      failedToConnectBackend: '❌ バックエンドへの接続に失敗しました。',
      errorPrefix: '❌ エラー: ',
      // Login
      loginTitle: '勤怠管理システム',
      userId: 'ユーザーID',
      password: 'パスワード',
      loginBtn: 'ログイン',
      logout: 'ログアウト',
      invalidCredentials: '無効な認証情報',
      // Employee View
      mySchedule: '私のスケジュール',
      confirmCheckIn: 'チェックインを確認',
      confirmCheckOut: 'チェックアウトを確認',
      checkInTime: 'チェックイン時間',
      checkOutTime: 'チェックアウト時間',
      alreadyCheckedIn: 'すでにチェックイン済み',
      alreadyCheckedOut: 'すでにチェックアウト済み',
      noShiftToday: '今日はシフトが割り当てられていません',
      checkedIn: 'チェックイン済み',
      checkedOut: 'チェックアウト済み',
      missed: '欠席',
      // Notifications
      notifications: '通知',
      noNotifications: '通知はまだありません',
      sendNotification: 'メッセージを送信',
      requestLeave: '休暇申請',
      sendMessage: 'メッセージを送信',
      messageToManager: 'マネージャーへのメッセージ',
      typeMessage: 'メッセージを入力...',
      send: '送信',
      leaveRequest: '休暇申請',
      startDate: '開始日',
      endDate: '終了日',
      reason: '理由',
      requestReason: '休暇の理由...',
      submit: '送信',
      messages: 'メッセージ',
      noMessages: 'メッセージなし',
      from: '送信者',
      approve: '承認',
      reject: '却下',
      pending: '保留中',
      approved: '承認済み',
      rejected: '却下',
      messageSent: 'メッセージが送信されました！',
      leaveRequestSent: '休暇申請が送信されました！',
      leaveApproved: '休暇申請が承認されました',
      leaveRejected: '休暇申請が却下されました',
      recordOvertimeBtn: '残業を記録して保存',
      noteLabel: '注記',
      plannedHours: '計画時間',
      inTime: 'イン タイム',
      outTime: 'アウト タイム',
      japanLocalTime: '日本現地時間',
      Monday: '月曜日',
      Tuesday: '火曜日',
      Wednesday: '水曜日',
      Thursday: '木曜日',
      Friday: '金曜日',
      Saturday: '土曜日',
      Sunday: '日曜日',
      confirmSchedule: '確認して保存',
      downloadPDF: 'PDFダウンロード',
      printSchedule: '印刷',
      demandForecast: '需要予測',
      loadForecast: '予測を読み込み',
      forecastingLoadingDemand: '需要を予測中...',
      peakDay: 'ピークの日',
      lowestDemand: '最低需要',
      historicalRange: '過去の範囲',
      trend: 'トレンド',
      predictedEmployees: '予測従業員数',
      confidence: '信頼度',
      insights: '主要な洞察',
      recommendations: '推奨事項',
      roleBasedForecast: 'ロール別予測',
      averageDemand: '平均需要',
      peakDemand: 'ピーク需要',
      variability: '変動性',
      absenceRate: '欠席率',
      overtimeShifts: '平均残業シフト',
      weeklyBreakdown: '週別の分析',
      range: '範囲',
      historicalWeeks: '過去データ週数',
      scheduleConfidence: 'スケジュール信頼度',
      dateAndDay: '日付と曜日',
      shiftTimings: 'シフト時間',
      hours: '時間',
      veryLate: '大幅遅刻',
      break: '休憩',
      minutes: '分',
      downloadWeeklyAttendance: '週間出勤記録をダウンロード',
      downloadMonthlyAttendance: '月間出勤記録をダウンロード'
    }
  };

  // Note: t() function is defined above after module initialization
  // Note: getWeekDates() is imported from constants module

  useEffect(() => {
    loadDataFromFiles(setEmployees, setRoles, setShifts, setSchedule, setAttendance, setOvertimeHours);
    notificationsLogic.loadNotifications(setNotifications);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    console.log('🔍 Auto-save triggered. State:', {
      employeesCount: employees.length,
      rolesCount: roles.length,
      shiftsCount: shifts.length,
      leaveRequestsCount: leaveRequests.length,
      unavailabilityCount: unavailability.length
    });
    
    if (employees.length > 0 || roles.length > 0) {
      saveDataToFiles();
    } else {
      console.warn('⚠️ Not saving: both employees and roles are empty!');
    }
  }, [employees, roles, shifts, leaveRequests, unavailability]);

  // ============================================
  // Login Functions - Delegated to AuthModule
  // ============================================

  const handleLogin = async (e) => {
    e.preventDefault();
    const success = await authLogic.handleLogin(
      loginCredentials,
      setLoginError,
      setCurrentUser,
      setIsLoggedIn,
      setActiveView
    );
    
    if (success) {
      // Load saved data from database after login
      await authLogic.loadScheduleFromDatabase(setSchedule, setLeaveRequests, setUnavailability);
    }
  };

  const loadScheduleFromDatabase = async () => {
    await authLogic.loadScheduleFromDatabase(setSchedule, setLeaveRequests, setUnavailability);
  };

  // Logout functionality - Delegated to AuthModule
  const handleLogout = async () => {
    await authLogic.handleLogout(
      leaveRequests,
      unavailability,
      schedule,
      setIsLoggedIn,
      setCurrentUser,
      setActiveView,
      setLoginCredentials,
      setLoginError
    );
  };

  // Check-in/Check-out functionality for employees
  const openCheckInPopup = (date, shift) => {
    setCheckInOutDate(date);
    setCheckInOutShift(shift);
  };

  const openCheckOutPopup = (date, shift) => {
    setCheckInOutDate(date);
    setCheckInOutShift(shift);
  };

  const confirmCheckInOut = async () => {
    if (!checkInOutDate || !checkInOutShift) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const key = `${currentUser.id}-${checkInOutDate}-${checkInOutShift.id}`;

    const newAttendance = { ...attendance };
    const existingRecord = newAttendance[key] || {};

    // Determine if this is check-in or check-out based on existing record
    const isCheckIn = !existingRecord.inTime;

    if (isCheckIn) {
      newAttendance[key] = {
        ...existingRecord,
        employeeId: currentUser.id,
        date: checkInOutDate,
        shiftId: checkInOutShift.id,
        inTime: currentTime,
        status: attendanceLogic.getAttendanceStatus(currentTime, checkInOutShift, checkInOutDate, 'in', currentWeek)
      };
    } else {
      newAttendance[key] = {
        ...existingRecord,
        outTime: currentTime,
        outStatus: attendanceLogic.getAttendanceStatus(currentTime, checkInOutShift, checkInOutDate, 'out', currentWeek)
      };
    }

    setAttendance(newAttendance);
    await attendanceLogic.saveAttendanceToFile(newAttendance);
    setCheckInOutDate(null);
    setCheckInOutShift(null);
  };

  const sendMessageToManager = async () => {
    await notificationsLogic.sendMessageToManager(notificationForm, currentUser, notifications, setNotifications);
    setNotificationForm({ message: '' });
    setShowEmployeeMessageForm(false);
    alert(t('messageSent'));
  };

  // Send leave request
  const sendLeaveRequest = async () => {
    await notificationsLogic.sendLeaveRequest(leaveRequestForm, currentUser, notifications, setNotifications);
    setLeaveRequestForm({ startDate: '', endDate: '', reason: '' });
    setShowLeaveRequestForm(false);
    alert(t('leaveRequestSent'));
  };

  // Approve leave request
  const approveLeaveRequest = async (requestId) => {
    const request = notifications.leaveRequests.find(r => r.id === requestId);
    if (!request) return;
    
    await notificationsLogic.approveLeaveRequest(requestId, notifications, setNotifications, setLeaveRequests);
    
    // Persist the leave dates
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const newLeaveRequests = { ...leaveRequests };
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const key = `${request.employeeId}-${dateStr}`;
      newLeaveRequests[key] = true;
    }
    setLeaveRequests(newLeaveRequests);
    try {
      await fetch(`${API_BASE_URL}/save-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees, roles, leaveRequests: newLeaveRequests })
      });
    } catch (err) {
      console.error('Error saving leave data:', err);
    }
    alert(t('leaveApproved'));
  };

  // Reject leave request
  const rejectLeaveRequest = async (requestId) => {
    await notificationsLogic.rejectLeaveRequest(requestId, notifications, setNotifications);
    alert(t('leaveRejected'));
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    await notificationsLogic.deleteMessage(messageId, notifications, setNotifications);
  };

  // Delete leave request
  const deleteLeaveRequest = async (requestId) => {
    await notificationsLogic.deleteLeaveRequest(requestId, notifications, setNotifications);
  };

  // Send notification from manager to employee
  const sendManagerNotification = async (employeeId, message) => {
    await notificationsLogic.sendManagerNotification(employeeId, message, notifications, setNotifications);
  };

  const loadDataFromFiles = async () => {
    await employeeLogic.loadDataFromFiles(setEmployees, setRoles, setShifts, setSchedule, setAttendance, setOvertimeHours);
  };

  const saveDataToFiles = async () => {
    await employeeLogic.saveDataToFiles(employees, roles, shifts, leaveRequests, unavailability);
  };

  const saveEmployee = () => {
    employeeLogic.saveEmployee(employeeForm, editingEmployee, employees, setEmployees, setEditingEmployee);
    setEmployeeForm({ name: '', roleId: '', weeklyHours: 40, dailyMaxHours: 8, shiftsPerWeek: 5, skills: '' });
    setShowEmployeeForm(false);
  };

  const deleteEmployee = (id) => {
    employeeLogic.deleteEmployee(id, employees, setEmployees);
  };

  const saveRole = () => {
    roleLogic.saveRole(roleForm, editingRole, roles, setRoles, setEditingRole);
    setRoleForm({ name: '', weekendRequired: false, requiredSkills: '', breakMinutes: 60 });
    setShowRoleForm(false);
  };

  const deleteRole = (id) => {
    roleLogic.deleteRole(id, roles, setRoles, shifts, setShifts);
  };

  const saveShift = () => {
    shiftLogic.saveShift(shiftForm, editingShift, shifts, setShifts, setEditingShift, roles);
    
    setShiftForm({
      name: '', roleId: '', priority: 50,
      schedule: {
        Monday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [] },
        Tuesday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [] },
        Wednesday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [] },
        Thursday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [] },
        Friday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [] },
        Saturday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [] },
        Sunday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [] }
      }
    });
    setShowShiftForm(false);
  };

  const deleteShift = (id) => {
    shiftLogic.deleteShift(id, shifts, setShifts);
  };

  const toggleLeave = (employeeId, date) => {
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

  const toggleUnavailability = (employeeId, date) => {
    const key = `${employeeId}-${date}`;
    const newUnavail = { ...unavailability };
    
    if (newUnavail[key]) {
      delete newUnavail[key];
    } else {
      const emp = employees.find(e => e.id === employeeId);
      const shiftsPerWeek = emp?.shiftsPerWeek || 5;
      const unavailDays = Object.keys(unavailability).filter(k => k.startsWith(employeeId)).length;
      
      if (unavailDays >= shiftsPerWeek - 1) {
        alert(t('cannotMarkUnavailable').replace('{days}', shiftsPerWeek));
        return;
      }
      
      newUnavail[key] = { employeeId, date, type: 'unavailable' };
      const newLeaves = { ...leaveRequests };
      delete newLeaves[key];
      setLeaveRequests(newLeaves);
    }
    
    setUnavailability(newUnavail);
  };

  const isOnLeave = (employeeId, date) => {
    return !!leaveRequests[`${employeeId}-${date}`];
  };

  const isUnavailable = (employeeId, date) => {
    return !!unavailability[`${employeeId}-${date}`];
  };

  const handleAttendanceTimeChange = (key, value) => {
    setAttendanceTimes(prev => ({ ...prev, [key]: value }));
  };

  const markAttendance = async (employeeId, date, shiftId, inTime) => {
    const key = `${employeeId}-${date}-${shiftId}`;
    
    if (!inTime) {
      alert(t('enterInTime'));
      return;
    }

    const shift = shifts.find(s => s.id === shiftId);
    const dayName = daysOfWeek[currentWeek.indexOf(date)];
    const shiftSchedule = shift?.schedule[dayName];
    
    if (!shiftSchedule) return;

    const [shiftHour, shiftMin] = shiftSchedule.startTime.split(':').map(Number);
    const [inHour, inMin] = inTime.split(':').map(Number);
    
    const shiftMinutes = shiftHour * 60 + shiftMin;
    const inMinutes = inHour * 60 + inMin;
    const diff = inMinutes - shiftMinutes;

    // Check if check-in is more than 1 hour (60 minutes) before shift start
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
      return;
    }

    // Proceed with recording attendance
    recordAttendance(key, employeeId, date, shiftId, inTime, shiftSchedule.startTime);
  };

  const recordAttendance = async (key, employeeId, date, shiftId, inTime, shiftStartTime) => {
    const shift = shifts.find(s => s.id === shiftId);
    const dayName = daysOfWeek[currentWeek.indexOf(date)];
    const shiftSchedule = shift?.schedule?.[dayName];

    if (!shiftSchedule) return;

    // Calculate in-time status
    const [shiftHour, shiftMin] = shiftStartTime.split(':').map(Number);
    const [inHour, inMin] = inTime.split(':').map(Number);

    const shiftMinutes = shiftHour * 60 + shiftMin;
    const inMinutes = inHour * 60 + inMin;
    const diff = inMinutes - shiftMinutes;

    let status = 'onTime';
    if (diff > 15) status = 'late';
    else if (diff > 0) status = 'slightlyLate';
    else if (diff >= -60) status = 'onTime'; // Early but within 1 hour is still on-time

    // Calculate out-time status if outTime is provided
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
    // Save attendance to file immediately when record is pressed
    await attendanceLogic.saveAttendanceToFile(newAttendance);
    setEarlyCheckInWarning(null);
  };

  const handleOutTimeChange = (key, value) => {
    setAttendanceOutTimes(prev => ({ ...prev, [key]: value }));
  };

  const generateSchedule = async () => {
    const success = await scheduleLogic.generateSchedule(
      employees,
      roles,
      shifts,
      leaveRequests,
      unavailability,
      currentWeek,
      setLoading,
      setSchedule,
      setOvertimeHours,
      setOvertimeWarnings,
      t
    );

    if (success) {
      // Save updated attendance and schedule to file
      await attendanceLogic.saveAttendanceToFile(attendance);
      await scheduleLogic.saveScheduleToFile(schedule);
      
      // Navigate to schedule tab
      setActiveView('schedule');
    }
  };

  const getSortedEmployees = () => {
    return [...employees].sort((a, b) => {
      const roleA = roles.find(r => r.id === a.roleId);
      const roleB = roles.find(r => r.id === b.roleId);
      const roleNameA = roleA?.name || '';
      const roleNameB = roleB?.name || '';
      if (roleNameA !== roleNameB) return roleNameA.localeCompare(roleNameB);
      return a.name.localeCompare(b.name);
    });
  };

  const loadDemandForecast = async () => {
    setForecastLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/demand-forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentWeek,
          language  // Pass current language setting to backend
        })
      });

      const data = await response.json();

      if (data.success) {
        // Translate day names in the forecast based on current language
        const translatedForecast = { ...data.forecast };
        translatedForecast.dayForecasts = {};
        
        Object.entries(data.forecast.dayForecasts).forEach(([dayName, dayData]) => {
          translatedForecast.dayForecasts[dayName] = dayData;
          // Store translated day name for display
          dayData.translatedDayName = t(dayName);
        });
        
        setDemandForecast(translatedForecast);
        console.log('✅ Demand forecast loaded:', translatedForecast);
      } else {
        console.error('❌ Forecast error:', data.error);
        alert(t('failedToLoadForecast') + data.error);
      }
    } catch (error) {
      console.error('Error loading forecast:', error);
      alert(t('failedToConnectForecast'));
    } finally {
      setForecastLoading(false);
    }
  };

  const exportData = () => {
    const exportData = {
      employees,
      roles: roles.map(role => ({
        ...role,
        shifts: shifts.filter(s => s.roleId === role.id).map(s => {
          const { roleId, ...shiftData } = s;
          return shiftData;
        })
      })),
      schedule,
      leaveRequests,
      unavailability,
      attendance,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `schedule-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const enterEditMode = () => {
    setIsEditMode(true);
    setEditedSchedule(JSON.parse(JSON.stringify(schedule))); // Deep copy
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditedSchedule({});
    setOvertimeWarnings([]);
  };

  const saveEditedSchedule = async () => {
    setLoading(true);
    try {
      console.log('💾 Validating edited schedule...');
      const validation = await scheduleLogic.validateSchedule(editedSchedule, employees, roles, shifts, currentWeek, language);

      console.log('✅ Validation response:', validation);
      
      if (!validation.valid) {
        console.log('❌ Validation failed - showing errors');
        alert(`${t('constraintViolation')}:\n\n${validation.errors.join('\n')}`);
        setLoading(false);
        return;
      }

      console.log('✓ No validation errors');
      
      if (validation.overtime && validation.overtime.length > 0) {
        console.log('⚠️  Overtime detected - showing modal');
        setOvertimeWarnings(validation.overtime);
        // Show overtime modal - will be handled in UI
        return;
      }

      console.log('✓ No overtime issues - proceeding to save');
      
      // Save schedule
      // Save schedule and recalculate overtime
      setSchedule(editedSchedule);
      
      // Recalculate overtime based on edited schedule
      const { overtimeHours: newOvertimeHours, overtimeData } = scheduleLogic.calculateOvertimeFromSchedule(editedSchedule, employees, roles);
      setOvertimeHours(newOvertimeHours);
      
      await scheduleLogic.saveScheduleToFile(editedSchedule);
      setIsEditMode(false);
      setEditedSchedule({});
      console.log('✅ Schedule saved successfully');
      alert(t('scheduleUpdatedSuccess'));
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert(t('failedToSaveSchedule'));
    } finally {
      setLoading(false);
    }
  };

  const downloadSchedulePDF = async () => {
    const element = document.getElementById('schedule-table-for-pdf');
    if (!element) {
      alert(t('scheduleTableNotFound'));
      return;
    }

    // Load html2pdf from CDN
    if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      document.head.appendChild(script);
      
      await new Promise(resolve => {
        script.onload = resolve;
      });
    }

    const opt = {
      margin: 10,
      filename: `schedule-${currentWeek[0]}-to-${currentWeek[6]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
    };

    window.html2pdf().set(opt).from(element).save();
  };

  const confirmOvertime = async () => {
    try {
      // Record overtime to attendance
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

        // Update overtime hours tracking
        updatedOvertimeHours[warning.employeeId] =
          (updatedOvertimeHours[warning.employeeId] || 0) + warning.overtime;
      });

      // Save attendance with overtime
      await fetch(`${API_BASE_URL}/save-attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: newAttendance })
      });

      setAttendance(newAttendance);
      setOvertimeHours(updatedOvertimeHours);

      // Save schedule
      setSchedule(editedSchedule);
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

  const handleScheduleDragStart = (e, sourceDate, sourceEmployeeId, shift) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      sourceDate,
      sourceEmployeeId,
      shift
    }));
  };

  const handleScheduleDragOver = (e) => {
    e.preventDefault();
  };

  const handleScheduleDrop = (e, targetDate, targetEmployeeId) => {
    e.preventDefault();

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { sourceDate, sourceEmployeeId, shift } = data;

      const targetEmployee = employees.find(emp => emp.id === targetEmployeeId);

      if (!targetEmployee) return;

      // Check role match
      if (targetEmployee.roleId !== shift.roleId) {
        alert(t('roleDoesNotMatch'));
        return;
      }

      // Create new schedule
      const newSchedule = JSON.parse(JSON.stringify(editedSchedule));

      // Remove from source
      if (newSchedule[sourceDate] && newSchedule[sourceDate][sourceEmployeeId]) {
        newSchedule[sourceDate][sourceEmployeeId] = newSchedule[sourceDate][sourceEmployeeId].filter(
          s => s.id !== shift.id
        );
        if (newSchedule[sourceDate][sourceEmployeeId].length === 0) {
          delete newSchedule[sourceDate][sourceEmployeeId];
        }
      }

      // Add to target
      if (!newSchedule[targetDate]) newSchedule[targetDate] = {};
      if (!newSchedule[targetDate][targetEmployeeId]) {
        newSchedule[targetDate][targetEmployeeId] = [];
      }

      // Check if already has a shift on this day
      if (newSchedule[targetDate][targetEmployeeId].length > 0) {
        alert(t('employeeAlreadyHasShift'));
        return;
      }

      newSchedule[targetDate][targetEmployeeId].push(shift);

      setEditedSchedule(newSchedule);
    } catch (error) {
      console.error('Drop error:', error);
    }
  };

  const openTimeEditor = (date, employeeId, shift) => {
    const dayIdx = currentWeek.indexOf(date);
    const dayName = daysOfWeek[dayIdx];
    const shiftSchedule = shift.schedule?.[dayName];

    setEditingShiftTime({
      date,
      employeeId,
      shift,
      dayName,
      startTime: shiftSchedule?.startTime || '09:00',
      endTime: shiftSchedule?.endTime || '17:00',
      selectedShiftId: shift.id
    });
  };

  const saveShiftTime = () => {
    if (!editingShiftTime) return;

    const { date, employeeId, dayName, startTime, endTime, selectedShiftId } = editingShiftTime;

    // Calculate shift hours
    const startParts = startTime.split(':');
    const endParts = endTime.split(':');
    let startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    let endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    if (endMinutes < startMinutes) endMinutes += 24 * 60;
    const shiftHours = (endMinutes - startMinutes) / 60.0;

    // Get employee's daily max
    const emp = employees.find(e => e.id === employeeId);
    const dailyMax = emp?.dailyMaxHours || 8;

    // Get break minutes
    const role = roles.find(r => r.id === emp?.roleId);
    const breakMinutes = role?.breakMinutes || 0;
    const actualHours = shiftHours - (breakMinutes / 60.0);

    // Check if exceeds daily max
    if (actualHours > dailyMax) {
      const confirmed = window.confirm(
        `${t('dailyMaxWarning')}\n\n` +
        `${t('shiftHours')}: ${actualHours.toFixed(1)}h\n` +
        `${t('dailyMax')}: ${dailyMax}h\n\n` +
        `${t('dailyMaxExceeded')}\n${t('continueAnyway')}`
      );
      if (!confirmed) return; // User cancelled
    }

    const newSchedule = JSON.parse(JSON.stringify(editedSchedule));

    if (newSchedule[date] && newSchedule[date][employeeId]) {
      const shiftIndex = newSchedule[date][employeeId].findIndex(s => s.id === editingShiftTime.shift.id);
      if (shiftIndex !== -1) {
        // If shift type changed, replace the shift
        if (selectedShiftId !== editingShiftTime.shift.id) {
          const newShift = shifts.find(s => s.id === selectedShiftId);
          if (newShift) {
            newSchedule[date][employeeId][shiftIndex] = { ...newShift };
          }
        }

        // Update times
        if (!newSchedule[date][employeeId][shiftIndex].schedule) {
          newSchedule[date][employeeId][shiftIndex].schedule = {};
        }
        if (!newSchedule[date][employeeId][shiftIndex].schedule[dayName]) {
          newSchedule[date][employeeId][shiftIndex].schedule[dayName] = {};
        }
        newSchedule[date][employeeId][shiftIndex].schedule[dayName].startTime = startTime;
        newSchedule[date][employeeId][shiftIndex].schedule[dayName].endTime = endTime;
      }
    }

    setEditedSchedule(newSchedule);
    setEditingShiftTime(null);
  };

  const deleteShiftFromSchedule = () => {
    if (!editingShiftTime) return;
    if (!window.confirm(t('deleteShiftConfirmSchedule'))) return;

    const { date, employeeId, shift } = editingShiftTime;
    const newSchedule = JSON.parse(JSON.stringify(editedSchedule));

    if (newSchedule[date] && newSchedule[date][employeeId]) {
      newSchedule[date][employeeId] = newSchedule[date][employeeId].filter(s => s.id !== shift.id);
      if (newSchedule[date][employeeId].length === 0) {
        delete newSchedule[date][employeeId];
      }
    }

    setEditedSchedule(newSchedule);
    setEditingShiftTime(null);
  };

  const openAddShift = (date, employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    const dayIdx = currentWeek.indexOf(date);
    const dayName = daysOfWeek[dayIdx];
    const empShifts = shifts.filter(s => s.roleId === emp.roleId);

    setAddingShift({
      date,
      employeeId,
      dayName,
      availableShifts: empShifts,
      selectedShiftId: empShifts[0]?.id || '',
      startTime: '09:00',
      endTime: '17:00',
      isCustom: false
    });
  };

  const saveAddedShift = () => {
    if (!addingShift) return;

    const { date, employeeId, dayName, selectedShiftId, startTime, endTime, isCustom } = addingShift;

    const newSchedule = JSON.parse(JSON.stringify(editedSchedule));

    if (!newSchedule[date]) newSchedule[date] = {};
    if (!newSchedule[date][employeeId]) newSchedule[date][employeeId] = [];

    if (isCustom) {
      // Create a custom shift
      const customShift = {
        id: `custom-${Date.now()}`,
        name: 'Custom',
        roleId: employees.find(e => e.id === employeeId)?.roleId,
        priority: 50,
        schedule: {
          [dayName]: {
            enabled: true,
            startTime,
            endTime
          }
        }
      };
      newSchedule[date][employeeId].push(customShift);
    } else {
      // Add existing shift
      const shift = shifts.find(s => s.id === selectedShiftId);
      if (shift) {
        const shiftCopy = { ...shift };
        if (!shiftCopy.schedule) shiftCopy.schedule = {};
        if (!shiftCopy.schedule[dayName]) shiftCopy.schedule[dayName] = {};
        shiftCopy.schedule[dayName].startTime = startTime;
        shiftCopy.schedule[dayName].endTime = endTime;
        shiftCopy.schedule[dayName].enabled = true;
        newSchedule[date][employeeId].push(shiftCopy);
      }
    }

    setEditedSchedule(newSchedule);
    setAddingShift(null);
  };

  // Login Page
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-600 flex items-center justify-center">
                <Calendar size={40} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('loginTitle')}</h1>
              <p className="text-gray-500">{t('subtitle')}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('userId')}
                </label>
                <input
                  type="text"
                  value={loginCredentials.userId}
                  onChange={(e) => setLoginCredentials({ ...loginCredentials, userId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter user ID"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('password')}
                </label>
                <input
                  type="password"
                  value={loginCredentials.password}
                  onChange={(e) => setLoginCredentials({ ...loginCredentials, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter password"
                  required
                />
              </div>

              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {t('invalidCredentials')}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {t('loginBtn')}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Login using credentials provided by your administrator.
              </p>
            </div>

            {/* Language Toggle */}
            <div className="mt-4 flex justify-center">
              <div className="flex items-center bg-gray-100 rounded-full p-1">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    language === 'en'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ja')}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    language === 'ja'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  日本語
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white border-2 border-blue-600 flex items-center justify-center overflow-hidden">
                <img src="/logo/logo.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
                <p className="text-xs text-gray-500">{t('subtitle')}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* User Info & Logout */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-lg">
                <Users size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{currentUser?.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  {t('logout')}
                </button>
              </div>

              {/* Language Toggle */}
              <div className="flex items-center bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    language === 'en'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage('ja')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    language === 'ja'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  日本語
                </button>
              </div>

              {currentUser?.role === 'manager' && (
                <>
                  <button
                    onClick={exportData}
                    className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700"
                  >
                    <Download size={16} />
                    {t('export')}
                  </button>
                  <button
                    onClick={generateSchedule}
                    disabled={loading}
                    className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>{t('processing')}</>
                    ) : (
                      <>
                        <Calendar size={18} />
                        {t('generateSchedule')}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Navigation Tabs */}
        {currentUser?.role === 'manager' ? (
          <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            {[
              { id: 'dashboard', label: t('dashboard'), icon: BarChart3 },
              { id: 'employees', label: t('employees'), icon: Users },
              { id: 'roles', label: t('roles'), icon: Settings },
              { id: 'schedule', label: t('schedule'), icon: Calendar },
              { id: 'daily', label: t('dailyView'), icon: FileText },
              { id: 'attendance', label: t('attendance'), icon: UserCheck },
              { id: 'notifications', label: t('notifications'), icon: Bell }
            ].map(tab => {
              const unreadCount = tab.id === 'notifications' ?
                (notifications.messages.filter(m => !m.read).length +
                 notifications.leaveRequests.filter(r => r.status === 'pending').length) : 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id)}
                  className={`flex-1 px-4 py-2.5 rounded-md font-medium transition-all flex items-center justify-center gap-2 relative ${
                    activeView === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon size={18} />
                  <span className="text-sm">{tab.label}</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            {[
              { id: 'mySchedule', label: t('mySchedule'), icon: Calendar }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className="flex-1 px-4 py-2.5 rounded-md font-medium transition-all flex items-center justify-center gap-2 bg-blue-600 text-white shadow-sm"
              >
                <tab.icon size={18} />
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
        )}

        {activeView === 'dashboard' && (
          <div className="space-y-6">
            {/* Date and Time in Japan Timezone */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 bg-gradient-to-r from-blue-50 to-purple-50">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">{t('japanLocalTime')}</h3>
              <div className="text-3xl font-bold text-gray-900">
                {currentTime.toLocaleString('ja-JP', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  timeZone: 'Asia/Tokyo'
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard icon={Users} label={t('totalEmployees')} value={employees.length} color="blue" onClick={() => setActiveView('employees')} />
              <StatCard icon={Settings} label={t('totalRoles')} value={roles.length} color="purple" onClick={() => setActiveView('roles')} />
              <StatCard icon={Clock} label={t('shiftTypes')} value={shifts.length} color="green" onClick={() => setActiveView('schedule')} />
              <StatCard icon={UserCheck} label={t('attendanceRecords')} value={Object.keys(attendance).length} color="orange" onClick={() => setActiveView('attendance')} />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('systemOverview')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">{t('leaveRequests')}</div>
                  <div className="text-2xl font-bold text-gray-900">{Object.keys(leaveRequests).length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">{t('unavailability')}</div>
                  <div className="text-2xl font-bold text-gray-900">{Object.keys(unavailability).length}</div>
                </div>
              </div>
            </div>

            {/* Demand Forecasting Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 size={20} className="text-blue-600" />
                  {t('demandForecast')}
                </h3>
                <button
                  onClick={loadDemandForecast}
                  disabled={forecastLoading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
                >
                  {forecastLoading ? t('forecastingLoadingDemand') : t('loadForecast')}
                </button>
              </div>

              {demandForecast ? (
                <div className="space-y-4">
                  {/* Key Insights */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <AlertCircle size={16} className="text-blue-600" />
                      {t('insights')}
                    </h4>
                    <ul className="space-y-1">
                      {demandForecast.insights.map((insight, idx) => (
                        <li key={idx} className="text-sm text-gray-700">{insight}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Daily Forecasts */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">{t('weeklyBreakdown')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(demandForecast.dayForecasts).map(([day, forecast]) => (
                        <div key={day} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-gray-900">{forecast.translatedDayName || t(day)}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                <div>👥 {t('predictedEmployees')}: <span className="font-bold text-blue-600">{forecast.predictedEmployees}</span></div>
                                <div>📊 {t('shifts')}: <span className="font-bold">{forecast.predictedShifts}</span></div>
                                <div className="text-xs mt-1">{t('range')}: {forecast.historicalRange.min}-{forecast.historicalRange.max}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold">{forecast.trend}</div>
                              <div className="text-xs text-gray-500 mt-1">{t('confidence')}: {forecast.confidence}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Role-Based Forecasts */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">{t('roleBasedForecast')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(demandForecast.roleForecasts).map(([role, forecast]) => (
                        <div key={role} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="font-semibold text-gray-900 mb-2">{role}</div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <div className="text-gray-600">{t('averageDemand')}</div>
                              <div className="font-bold text-purple-600">{forecast.averageDemand}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">{t('peakDemand')}</div>
                              <div className="font-bold text-red-600">{forecast.peakDemand}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">{t('variability')}</div>
                              <div className="font-bold">{forecast.variability}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">{t('confidence')}</div>
                              <div className="font-bold">{forecast.confidence}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Check size={16} className="text-green-600" />
                      {t('recommendations')}
                    </h4>
                    <ul className="space-y-1">
                      {demandForecast.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-gray-700">{rec}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">{t('absenceRate')}</div>
                      <div className="text-xl font-bold text-gray-900">{demandForecast.metrics.averageAbsenceRate}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">{t('overtimeShifts')}</div>
                      <div className="text-xl font-bold text-orange-600">{demandForecast.metrics.averageOvertimeShifts}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">{t('historicalWeeks')}</div>
                      <div className="text-xl font-bold text-blue-600">{demandForecast.metrics.totalHistoricalWeeks}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 size={32} className="mx-auto mb-2 opacity-30" />
                  <p>{t('loadForecast')} {t('forecastingLoadingDemand')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'employees' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">{t('employeeManagement')}</h2>
              <button
                onClick={() => {
                  setShowEmployeeForm(true);
                  setEditingEmployee(null);
                  setEmployeeForm({ name: '', roleId: '', weeklyHours: 40, dailyMaxHours: 8, shiftsPerWeek: 5, skills: '' });
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 font-medium"
              >
                <Plus size={18} />
                {t('addEmployee')}
              </button>
            </div>

            {showEmployeeForm && (
              <div className="fixed bottom-6 right-6 w-96 max-h-[90vh] overflow-y-auto p-6 bg-white rounded-lg border border-gray-200 shadow-2xl z-40">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">
                    {editingEmployee ? t('editEmployee') : t('newEmployee')}
                  </h3>
                  <button
                    onClick={() => {
                      setShowEmployeeForm(false);
                      setEditingEmployee(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')} *</label>
                    <input
                      value={employeeForm.name}
                      onChange={e => setEmployeeForm({...employeeForm, name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('role')} *</label>
                    <select
                      value={employeeForm.roleId}
                      onChange={e => setEmployeeForm({...employeeForm, roleId: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">{t('selectRole')}</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('weeklyHours')}</label>
                    <input
                      type="number"
                      value={employeeForm.weeklyHours}
                      onChange={e => setEmployeeForm({...employeeForm, weeklyHours: Number(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('dailyMaxHours')}</label>
                    <input
                      type="number"
                      value={employeeForm.dailyMaxHours}
                      onChange={e => setEmployeeForm({...employeeForm, dailyMaxHours: Number(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('skills')}</label>
                    <input
                      value={employeeForm.skills}
                      onChange={e => setEmployeeForm({...employeeForm, skills: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Machine operation, Quality assurance"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={saveEmployee}
                    className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    {t('save')}
                  </button>
                  <button
                    onClick={() => {
                      setShowEmployeeForm(false);
                      setEditingEmployee(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            )}

            {/* Employee List grouped by Role */}
            <div className="space-y-6">
              {roles.map(role => {
                const roleEmployees = getSortedEmployees().filter(e => e.roleId === role.id);
                if (roleEmployees.length === 0) return null;

                return (
                  <div key={role.id} className="border-2 border-gray-300 rounded-lg overflow-hidden">
                    {/* Role Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Users size={20} />
                        {role.name}
                        <span className="text-sm font-normal opacity-90">({roleEmployees.length} {roleEmployees.length === 1 ? 'employee' : 'employees'})</span>
                      </h3>
                    </div>

                    {/* Employee Cards */}
                    <div className="p-4 space-y-3">
                      {roleEmployees.map(emp => {
                        const isSelected = selectedEmployeeId === emp.id;
                        return (
                          <div
                            key={emp.id}
                            className={`border rounded-lg overflow-hidden transition-all ${
                              isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {/* Employee Header - Always Visible */}
                            <div
                              className={`p-4 cursor-pointer ${isSelected ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'}`}
                              onClick={() => setSelectedEmployeeId(isSelected ? null : emp.id)}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                    isSelected ? 'bg-blue-600' : 'bg-gray-600'
                                  }`}>
                                    {emp.name.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-900">{emp.name}</h4>
                                    <p className="text-sm text-gray-600">{emp.weeklyHours}h/week • {emp.shiftsPerWeek} shifts</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingEmployee(emp);
                                      setEmployeeForm({...emp, skills: emp.skills.join(', ')});
                                      setShowEmployeeForm(true);
                                    }}
                                    className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm(t('deleteConfirm'))) {
                                        deleteEmployee(emp.id);
                                      }
                                    }}
                                    className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                  {isSelected ? (
                                    <ChevronDown size={20} className="text-gray-600" />
                                  ) : (
                                    <ChevronRight size={20} className="text-gray-600" />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {isSelected && (
                              <div className="p-4 bg-white border-t border-gray-200">
                                <div className="grid grid-cols-5 gap-4 mb-6">
                                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                                    <div className="text-xs text-gray-600 mb-1">{t('weeklyHours')}</div>
                                    <div className="text-xl font-bold text-gray-900">{emp.weeklyHours}h</div>
                                  </div>
                                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                                    <div className="text-xs text-gray-600 mb-1">{t('dailyMaxHours')}</div>
                                    <div className="text-xl font-bold text-gray-900">{emp.dailyMaxHours}h</div>
                                  </div>
                                  <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                                    <div className="text-xs text-blue-600 mb-1">Weekly Shifts</div>
                                    <div className="text-xl font-bold text-blue-900">{emp.shiftsPerWeek}</div>
                                  </div>
                                  <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                                    <div className="text-xs text-green-600 mb-1">{t('skills')}</div>
                                    <div className="text-xs font-medium text-green-900">{emp.skills.length > 0 ? emp.skills.length : 'None'}</div>
                                  </div>
                                  <div className={`rounded-lg p-3 text-center border-2 ${
                                    overtimeHours[emp.id] > 0 ? 'bg-orange-50 border-orange-400' : 'bg-gray-50 border-gray-200'
                                  }`}>
                                    <div className={`text-xs mb-1 ${overtimeHours[emp.id] > 0 ? 'text-orange-700 font-semibold' : 'text-gray-600'}`}>
                                      {t('overtimeHours')}
                                    </div>
                                    <div className={`text-xl font-bold ${overtimeHours[emp.id] > 0 ? 'text-orange-700' : 'text-gray-900'}`}>
                                      {overtimeHours[emp.id] ? `${overtimeHours[emp.id].toFixed(1)}h` : '0h'}
                                    </div>
                                  </div>
                                </div>

                                {/* Leave and Unavailability */}
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('availabilityStatus')}</h4>
                                  <div className="grid grid-cols-7 gap-2">
                                    {currentWeek.map((date, idx) => {
                                      const onLeave = isOnLeave(emp.id, date);
                                      const unavail = isUnavailable(emp.id, date);
                                      return (
                                        <div key={date} className="text-center">
                                          <div className="text-xs font-medium mb-1">{t(daysOfWeek[idx]).slice(0, 3)}</div>
                                          <div className="text-xs text-gray-500 mb-1">{date.split('-')[2]}</div>
                                          <div className="flex flex-col gap-1">
                                            <button
                                              onClick={() => toggleLeave(emp.id, date)}
                                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                                onLeave
                                                  ? 'bg-red-600 text-white'
                                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                              }`}
                                            >
                                              L
                                            </button>
                                            <button
                                              onClick={() => toggleUnavailability(emp.id, date)}
                                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                                unavail
                                                  ? 'bg-orange-500 text-white'
                                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                              }`}
                                            >
                                              U
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="mt-3 flex gap-4 text-xs text-gray-600">
                                    <span><span className="inline-block w-3 h-3 bg-red-600 rounded mr-1"></span>L = Leave</span>
                                    <span><span className="inline-block w-3 h-3 bg-orange-500 rounded mr-1"></span>U = Unavailable</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeView === 'roles' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">{t('roleManagementTitle')}</h2>
                <button
                  onClick={() => {
                    setShowRoleForm(true);
                    setEditingRole(null);
                    setRoleForm({ name: '', weekendRequired: false, requiredSkills: '', breakMinutes: 60 });
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 font-medium"
                >
                  <Plus size={18} />
                  {t('addRoleBtn')}
                </button>
              </div>

              {showRoleForm && (
                <div className="fixed bottom-6 right-6 w-96 max-h-[90vh] overflow-y-auto p-6 bg-white rounded-lg border border-gray-200 shadow-2xl z-40">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900">
                      {editingRole ? t('editRoleTitle') : t('newRoleTitle')}
                    </h3>
                    <button
                      onClick={() => {
                        setShowRoleForm(false);
                        setEditingRole(null);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('roleName')} *</label>
                      <input
                        value={roleForm.name}
                        onChange={e => setRoleForm({...roleForm, name: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('machineOperatorPlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('breakTime')}</label>
                      <input
                        type="number"
                        value={roleForm.breakMinutes}
                        onChange={e => setRoleForm({...roleForm, breakMinutes: Number(e.target.value)})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('requiredSkills')}</label>
                      <input
                        value={roleForm.requiredSkills}
                        onChange={e => setRoleForm({...roleForm, requiredSkills: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('machineOpSkillPlaceholder')}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={roleForm.weekendRequired}
                          onChange={e => setRoleForm({...roleForm, weekendRequired: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">{t('weekendRequired')}</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={saveRole}
                      className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                      {t('save')}
                    </button>
                    <button
                      onClick={() => {
                        setShowRoleForm(false);
                        setEditingRole(null);
                      }}
                      className="flex-1 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {roles.map(role => (
                  <div key={role.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{role.name}</h3>
                        <div className="flex gap-4 mt-1 text-sm text-gray-600">
                          <span>{t('breakLabel')}: {role.breakMinutes} {t('minLabel')}</span>
                          <span>{t('weekendLabel')}: {role.weekendRequired ? t('requiredLabel') : t('notRequiredLabel')}</span>
                          {role.requiredSkills.length > 0 && (
                            <span>{t('skillsLabel')}: {role.requiredSkills.join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingRole(role);
                            setRoleForm({...role, requiredSkills: role.requiredSkills.join(', ')});
                            setShowRoleForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteRole(role.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">{t('shiftsLabel')}</h4>
                        <button
                          onClick={() => {
                            setShowShiftForm(true);
                            setEditingShift(null);
                            setShiftForm({
                              ...shiftForm,
                              roleId: role.id
                            });
                          }}
                          className="text-sm px-3 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"
                        >
                          <Plus size={14} />
                          {t('addShiftBtn')}
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {shifts.filter(s => s.roleId === role.id).map(shift => {
                          // Calculate work hours for each enabled day
                          const shiftDetails = Object.entries(shift.schedule)
                            .filter(([day, config]) => config.enabled)
                            .map(([day, config]) => {
                              const [startH, startM] = config.startTime.split(':').map(Number);
                              const [endH, endM] = config.endTime.split(':').map(Number);
                              let startMin = startH * 60 + startM;
                              let endMin = endH * 60 + endM;
                              if (endMin < startMin) endMin += 24 * 60;
                              const totalHours = (endMin - startMin) / 60;
                              const breakHours = (role.breakMinutes || 0) / 60;
                              const workHours = Math.max(0, totalHours - breakHours);
                              return {
                                day,
                                startTime: config.startTime,
                                endTime: config.endTime,
                                totalHours: totalHours.toFixed(1),
                                workHours: workHours.toFixed(1),
                                breakHours: breakHours.toFixed(1)
                              };
                            });

                          return (
                            <div key={shift.id} className="bg-gray-50 rounded p-3 text-sm">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{shift.name}</div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {t('priortyLabel')}: {shift.priority}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {t('daysLabel')}: {Object.keys(shift.schedule).filter(day => shift.schedule[day].enabled).join(', ')}
                                  </div>
                                  
                                  {/* Work Hours and Break Time for each day */}
                                  {shiftDetails.length > 0 && (
                                    <div className="mt-2 space-y-1 border-t border-gray-300 pt-2">
                                      {shiftDetails.map((detail, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs bg-white rounded p-2">
                                          <span className="text-gray-700 font-medium">{detail.day}: {detail.startTime} - {detail.endTime}</span>
                                          <div className="flex gap-2">
                                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                                              {detail.workHours}h
                                            </span>
                                            {role.breakMinutes > 0 && (
                                              <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-semibold">
                                                Break: {detail.breakHours}h
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingShift(shift);
                                      setShiftForm(shift);
                                      setShowShiftForm(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => deleteShift(shift.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {showShiftForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-gray-900">
                        {editingShift ? t('editShiftTitle') : t('newShiftTitle')}
                      </h3>
                      <button
                        onClick={() => setShowShiftForm(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('shiftNameLabel')}</label>
                          <input
                            value={shiftForm.name}
                            onChange={e => setShiftForm({...shiftForm, name: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={t('morningPlaceholder')}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('priorityLabel')}</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={shiftForm.priority}
                            onChange={e => setShiftForm({...shiftForm, priority: Number(e.target.value)})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('dayScheduleLabel')}</label>
                        <div className="space-y-2">
                          {daysOfWeek.map(day => (
                            <div key={day} className="border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={shiftForm.schedule[day].enabled}
                                  onChange={e => setShiftForm({
                                    ...shiftForm,
                                    schedule: {
                                      ...shiftForm.schedule,
                                      [day]: { ...shiftForm.schedule[day], enabled: e.target.checked }
                                    }
                                  })}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="w-20 font-medium text-sm text-gray-900">{t(day)}</span>
                                {shiftForm.schedule[day].enabled && (
                                  <>
                                    <input
                                      type="time"
                                      value={shiftForm.schedule[day].startTime}
                                      onChange={e => setShiftForm({
                                        ...shiftForm,
                                        schedule: {
                                          ...shiftForm.schedule,
                                          [day]: { ...shiftForm.schedule[day], startTime: e.target.value }
                                        }
                                      })}
                                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                                    />
                                    <span className="text-gray-500">-</span>
                                    <input
                                      type="time"
                                      value={shiftForm.schedule[day].endTime}
                                      onChange={e => setShiftForm({
                                        ...shiftForm,
                                        schedule: {
                                          ...shiftForm.schedule,
                                          [day]: { ...shiftForm.schedule[day], endTime: e.target.value }
                                        }
                                      })}
                                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                                    />
                                    <div className="flex items-center gap-2 ml-3">
                                      <label className="text-sm text-gray-600">{t('dayPriorityLabel')}:</label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={shiftForm.schedule[day].dayPriority || 1}
                                        onChange={e => setShiftForm({
                                          ...shiftForm,
                                          schedule: {
                                            ...shiftForm.schedule,
                                            [day]: { ...shiftForm.schedule[day], dayPriority: Number(e.target.value) || 1 }
                                          }
                                        })}
                                        className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
                                      />
                                    </div>
                                    {(() => {
                                      const [startH, startM] = shiftForm.schedule[day].startTime.split(':').map(Number);
                                      const [endH, endM] = shiftForm.schedule[day].endTime.split(':').map(Number);
                                      let startMin = startH * 60 + startM;
                                      let endMin = endH * 60 + endM;
                                      if (endMin < startMin) endMin += 24 * 60;
                                      const workHours = ((endMin - startMin) / 60).toFixed(1);
                                      return (
                                        <div className="flex items-center gap-2 ml-3 px-3 py-1 bg-blue-50 border border-blue-200 rounded">
                                          <span className="text-sm text-gray-600">{t('totalShiftTime')}:</span>
                                          <span className="text-sm font-semibold text-blue-600">{workHours}h</span>
                                        </div>
                                      );
                                    })()}
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-6">
                      <button
                        onClick={saveShift}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                      >
                        {t('save')}
                      </button>
                      <button
                        onClick={() => setShowShiftForm(false)}
                        className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'schedule' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('weeklySchedule')}</h2>
                {isEditMode && (
                  <p className="text-sm text-blue-600 mt-1">
                    {t('dragToReassign')} • {t('clickToEditTime')}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {!isEditMode ? (
                  <>
                    <button
                      onClick={enterEditMode}
                      disabled={Object.keys(schedule).length === 0}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                    >
                      <Edit2 size={16} />
                      {t('editSchedule')}
                    </button>
                    <button
                      onClick={async () => {
                        await scheduleLogic.saveScheduleToFile(schedule);
                        alert(t('scheduleConfirmedSuccess'));
                      }}
                      disabled={Object.keys(schedule).length === 0}
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                    >
                      <Check size={16} />
                      {t('confirmSchedule')}
                    </button>
                    <button
                      onClick={downloadSchedulePDF}
                      disabled={Object.keys(schedule).length === 0}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                    >
                      <Download size={16} />
                      {t('downloadPDF')}
                    </button>
                    <button
                      onClick={() => exportLogic.downloadScheduleExcel(schedule, currentWeek, daysOfWeek, employees, roles, shifts, language, t)}
                      disabled={Object.keys(schedule).length === 0}
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                    >
                      <Download size={16} />
                      Excel
                    </button>
                    <button
                      onClick={exportData}
                      className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 flex items-center gap-2 text-sm font-medium text-gray-700"
                    >
                      <Download size={16} />
                      {t('export')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={saveEditedSchedule}
                      disabled={loading}
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                    >
                      <Save size={16} />
                      {t('saveChanges')}
                    </button>
                    <button
                      onClick={exitEditMode}
                      disabled={loading}
                      className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                    >
                      <X size={16} />
                      {t('discardChanges')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {Object.keys(isEditMode ? editedSchedule : schedule).length > 0 ? (
              <div className="overflow-x-auto">
                <table id="schedule-table-for-pdf" className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gray-50">
                        {t('employees')}
                      </th>
                      {currentWeek.map((date, idx) => (
                        <th key={date} className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-700 min-w-[140px]">
                          <div>{t(daysOfWeek[idx])}</div>
                          <div className="text-xs font-normal text-gray-500">{date}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const employeesByRole = {};
                      roles.forEach(role => {
                        employeesByRole[role.id] = getSortedEmployees().filter(e => e.roleId === role.id);
                      });

                      return Object.entries(employeesByRole).map(([roleId, roleEmployees], roleIndex) => {
                        if (roleEmployees.length === 0) return null;
                        const role = roles.find(r => r.id === roleId);

                        return (
                          <React.Fragment key={roleId}>
                            {/* Role Separator Row */}
                            {roleIndex > 0 && (
                              <tr>
                                <td colSpan={8} className="border-0 p-0">
                                  <div className="h-2 bg-gray-300"></div>
                                </td>
                              </tr>
                            )}
                            {/* Role Header Row */}
                            <tr className="bg-gradient-to-r from-blue-100 to-blue-50">
                              <td colSpan={8} className="border border-gray-300 px-4 py-2">
                                <div className="font-bold text-blue-900 flex items-center gap-2">
                                  <Users size={16} />
                                  {role?.name}
                                </div>
                              </td>
                            </tr>
                            {/* Employee Rows for this Role */}
                            {roleEmployees.map(emp => {
                              return (
                                <tr key={emp.id} className="hover:bg-gray-50">
                                  <td className="border border-gray-200 px-4 py-3 sticky left-0 bg-white">
                                    <div className="font-medium text-sm text-gray-900">{emp.name}</div>
                                    <div className="text-xs text-gray-500">{role?.name}</div>
                                  </td>
                                  {currentWeek.map(date => {
                                    const currentSchedule = isEditMode ? editedSchedule : schedule;
                                    const empShifts = currentSchedule[date]?.[emp.id] || [];
                                    const onLeave = isOnLeave(emp.id, date);
                                    const unavail = isUnavailable(emp.id, date);

                                    return (
                                      <td
                                        key={date}
                                        className={`border border-gray-200 px-2 py-2 relative ${
                                          onLeave ? 'bg-red-100 bg-opacity-40' : unavail ? 'bg-orange-100 bg-opacity-40' : ''
                                        }`}
                                        onDragOver={isEditMode ? handleScheduleDragOver : undefined}
                                        onDrop={isEditMode ? (e) => handleScheduleDrop(e, date, emp.id) : undefined}
                                      >
                                        {(onLeave || unavail) && (
                                          <div className="absolute top-1 right-1">
                                            <span className={`text-xs font-bold px-1 rounded ${
                                              onLeave ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                                            }`}>
                                              {onLeave ? 'L' : 'U'}
                                            </span>
                                          </div>
                                        )}
                                        <div className="space-y-1 min-h-[40px]">
                                          {empShifts.map(shift => {
                                            const dayName = daysOfWeek[currentWeek.indexOf(date)];
                                            const shiftSchedule = shift.schedule?.[dayName];
                                            // Times can be either directly on shift (from DB) or in schedule[dayName] (from generation)
                                            const startTime = shift.startTime || shiftSchedule?.startTime;
                                            const endTime = shift.endTime || shiftSchedule?.endTime;
                                            return (
                                              <div
                                                key={shift.id}
                                                draggable={isEditMode}
                                                onDragStart={isEditMode ? (e) => handleScheduleDragStart(e, date, emp.id, shift) : undefined}
                                                onClick={() => {
                                                  if (isEditMode) {
                                                    openTimeEditor(date, emp.id, shift);
                                                  } else {
                                                    const dayName = daysOfWeek[currentWeek.indexOf(date)];
                                                    const shiftSchedule = shift.schedule?.[dayName];
                                                    setSelectedShiftDetails({
                                                      shift,
                                                      employee: emp,
                                                      date,
                                                      dayName,
                                                      shiftSchedule,
                                                      role: role
                                                    });
                                                  }
                                                }}
                                                className={`bg-blue-50 border border-blue-200 rounded px-2 py-1.5 text-xs ${
                                                  isEditMode ? 'cursor-move hover:shadow-md transition-shadow' : 'cursor-pointer hover:shadow-lg transition-shadow'
                                                }`}
                                              >
                                                <div className="font-semibold text-blue-900">{shift.name}</div>
                                                {(startTime && endTime) && (
                                                  <div className="text-blue-700 text-xs">
                                                    {startTime}-{endTime}
                                                  </div>
                                                )}
                                                {(() => {
                                                  const key = `${emp.id}-${date}-${shift.id}`;
                                                  const record = attendance[key];
                                                  if (record) {
                                                    return (
                                                      <div className="mt-1 space-y-0.5">
                                                        {record.inTime && (
                                                          <div className={`text-xs font-semibold ${
                                                            record.status === 'onTime' ? 'text-green-600' :
                                                            record.status === 'slightlyLate' ? 'text-orange-500' :
                                                            'text-red-600'
                                                          }`}>
                                                            ✓ In: {record.inTime}
                                                          </div>
                                                        )}
                                                        {record.outTime && (
                                                          <div className={`text-xs font-semibold ${
                                                            record.outStatus === 'onTime' ? 'text-green-600' :
                                                            record.outStatus === 'slightlyLate' ? 'text-orange-500' :
                                                            'text-red-600'
                                                          }`}>
                                                            ⏱ Out: {record.outTime}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  }
                                                  return null;
                                                })()}
                                                {isEditMode && (
                                                  <div className="text-xs text-blue-500 mt-1">
                                                    <Clock size={10} className="inline mr-1" />
                                                    Edit
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                          {isEditMode && !onLeave && !unavail && empShifts.length === 0 && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openAddShift(date, emp.id);
                                              }}
                                              className="w-full px-2 py-1 rounded border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-xs text-gray-600 hover:text-blue-600 transition-colors flex items-center justify-center gap-1"
                                            >
                                              <Plus size={12} />
                                              {t('addShift')}
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <Calendar size={64} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg">{t('noSchedule')}</p>
                <p className="text-sm">{t('generateScheduleBtn')}</p>
              </div>
            )}
          </div>
        )}

        {activeView === 'daily' && (
          <DailyScheduleView
            schedule={schedule}
            employees={getSortedEmployees()}
            roles={roles}
            shifts={shifts}
            currentWeek={currentWeek}
            daysOfWeek={daysOfWeek}
            setSchedule={setSchedule}
            leaveRequests={leaveRequests}
            unavailability={unavailability}
            validateSchedule={scheduleLogic.validateSchedule}
            saveScheduleToFile={scheduleLogic.saveScheduleToFile}
            attendance={attendance}
            setAttendance={setAttendance}
            overtimeHours={overtimeHours}
            setOvertimeHours={setOvertimeHours}
            loading={loading}
            setLoading={setLoading}
            t={t}
          />
        )}

        {activeView === 'attendance' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">{t('attendanceManagement')}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => exportLogic.downloadAttendanceExcel(attendance, schedule, currentWeek, employees, roles, language, t)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 text-sm font-medium"
                  title={t('downloadWeeklyAttendance')}
                >
                  <Download size={16} />
                  {t('downloadWeeklyAttendance')}
                </button>
                <button
                  onClick={() => exportLogic.downloadMonthlyAttendanceExcel(attendance, schedule, currentWeek, employees, roles, language, t)}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 text-sm font-medium"
                  title={t('downloadMonthlyAttendance')}
                >
                  <Download size={16} />
                  {t('downloadMonthlyAttendance')}
                </button>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">{t('selectDate')}</label>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                {currentWeek.map((date, idx) => (
                  <button
                    key={date}
                    onClick={() => setSelectedDay(date)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedDay === date
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-900 border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="text-xs font-semibold">{t(daysOfWeek[idx]).substring(0, 3)}</div>
                    <div className="text-sm font-bold">{date.split('-')[2]}</div>
                  </button>
                ))}
              </div>
            </div>

            {selectedDay && (
              (() => {
                const dayIdx = currentWeek.indexOf(selectedDay);
                const dayName = daysOfWeek[dayIdx];
                const dayEmployees = getSortedEmployees().filter(emp => {
                  const empShifts = schedule[selectedDay]?.[emp.id] || [];
                  const onLeave = isOnLeave(emp.id, selectedDay);
                  const unavail = isUnavailable(emp.id, selectedDay);
                  return empShifts.length > 0 && !onLeave && !unavail;
                });

                // Group employees by role
                const employeesByRole = {};
                dayEmployees.forEach(emp => {
                  const role = roles.find(r => r.id === emp.roleId);
                  const roleName = role?.name || 'Unassigned';
                  if (!employeesByRole[roleName]) {
                    employeesByRole[roleName] = [];
                  }
                  employeesByRole[roleName].push(emp);
                });

                const toggleRole = (roleName) => {
                  setExpandedRoles(prev => ({
                    ...prev,
                    [roleName]: !prev[roleName]
                  }));
                };

                return (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                      <h3 className="text-2xl font-bold text-gray-900">{dayName}</h3>
                      <p className="text-gray-600 mt-1">{selectedDay}</p>
                      <p className="text-sm text-gray-700 mt-2">
                        <span className="font-semibold">{dayEmployees.length}</span> employee{dayEmployees.length !== 1 ? 's' : ''} scheduled for this day
                      </p>
                    </div>

                    {dayEmployees.length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(employeesByRole).map(([roleName, roleEmployees]) => (
                          <div key={roleName} className="border border-gray-200 rounded-lg overflow-hidden">
                            <button
                              onClick={() => toggleRole(roleName)}
                              className="w-full bg-white hover:bg-gray-50 p-4 flex justify-between items-center transition-colors border-b border-gray-200"
                            >
                              <div className="flex items-center gap-3">
                                <Settings size={18} className="text-gray-600" />
                                <div className="text-left">
                                  <h4 className="font-semibold text-gray-900">{roleName}</h4>
                                  <p className="text-xs text-gray-600 mt-0.5">{roleEmployees.length} employee{roleEmployees.length !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                              <ChevronDown
                                size={20}
                                className={`text-gray-600 transition-transform ${
                                  expandedRoles[roleName] ? 'rotate-180' : ''
                                }`}
                              />
                            </button>

                            {expandedRoles[roleName] && (
                              <div className="bg-gray-50 p-4 space-y-4">
                                {roleEmployees.map(emp => {
                                  const empShifts = schedule[selectedDay]?.[emp.id] || [];
                                  return (
                                    <div key={emp.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                      <div className="mb-3">
                                        <h5 className="font-semibold text-gray-900">{emp.name}</h5>
                                      </div>

                                      <div className="space-y-3">
                                        {empShifts.map(shift => {
                                          const key = `${emp.id}-${selectedDay}-${shift.id}`;
                                          const record = attendance[key];
                                          const timeValue = attendanceTimes[key] || '';
                                          const shiftSchedule = shift.schedule?.[dayName];
                                          // Times can be either directly on shift (from DB) or in shiftSchedule (from generation)
                                          const startTime = shift.startTime || shiftSchedule?.startTime;
                                          const endTime = shift.endTime || shiftSchedule?.endTime;

                                          return (
                                            <div key={shift.id} className="bg-gray-50 rounded p-3 border border-gray-200">
                                              <div className="flex justify-between items-center mb-2">
                                                <div>
                                                  <div className="text-sm font-medium text-gray-900">{shift.name}</div>
                                                  {(startTime && endTime) && (
                                                    <div className="text-xs text-gray-600 mt-1">
                                                      {startTime} - {endTime}
                                                    </div>
                                                  )}
                                                </div>
                                                {record && (
                                                  <div className="text-right">
                                                    {record.status === 'onTime' && (
                                                      <div className="flex items-center gap-1 text-green-600">
                                                        <Check size={16} />
                                                        <span className="text-xs font-semibold">{t('onTime')}</span>
                                                      </div>
                                                    )}
                                                    {record.status === 'slightlyLate' && (
                                                      <div className="flex items-center gap-1 text-yellow-600">
                                                        <AlertCircle size={16} />
                                                        <span className="text-xs font-semibold">{t('slightlyLate')}</span>
                                                      </div>
                                                    )}
                                                    {record.status === 'late' && (
                                                      <div className="flex items-center gap-1 text-red-600">
                                                        <X size={16} />
                                                        <span className="text-xs font-semibold">{t('late')}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>

                                              {!record ? (
                                                <div className="space-y-2 mt-2">
                                                  <div className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                      <label className="text-xs text-gray-600 block mb-1">{t('inTimeLabel')}</label>
                                                      <input
                                                        type="time"
                                                        value={attendanceInTimes[key] || ''}
                                                        onChange={e => setAttendanceInTimes(prev => ({ ...prev, [key]: e.target.value }))}
                                                        className="border border-gray-300 rounded px-2 py-1 text-xs w-full"
                                                        placeholder={t('inTimeLabel')}
                                                      />
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                      <label className="text-xs text-gray-600 block mb-1">{t('outTimeLabel')}</label>
                                                      <input
                                                        type="time"
                                                        value={attendanceOutTimes[key] || ''}
                                                        onChange={e => handleOutTimeChange(key, e.target.value)}
                                                        className="border border-gray-300 rounded px-2 py-1 text-xs w-full"
                                                        placeholder={t('outTimeLabel')}
                                                      />
                                                    </div>
                                                  </div>
                                                  <button
                                                    onClick={() => {
                                                      markAttendance(emp.id, selectedDay, shift.id, attendanceInTimes[key]).catch(err => console.error('Error recording attendance:', err));
                                                    }}
                                                    className="w-full px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium text-xs"
                                                  >
                                                    {t('recordBtn')}
                                                  </button>
                                                </div>
                                              ) : (
                                                <div className="mt-2 space-y-2">
                                                  {/* Display with color coding and edit option */}
                                                  <div className={`text-xs font-semibold ${
                                                    record.status === 'onTime' ? 'text-green-600' :
                                                    record.status === 'slightlyLate' ? 'text-orange-500' :
                                                    'text-red-600'
                                                  }`}>
                                                    ✓ In: {record.inTime}
                                                  </div>
                                                  {record.outTime && (
                                                    <div className={`text-xs font-semibold ${
                                                      record.outStatus === 'onTime' ? 'text-green-600' :
                                                      record.outStatus === 'slightlyLate' ? 'text-orange-500' :
                                                      'text-red-600'
                                                    }`}>
                                                      ⏱ Out: {record.outTime}
                                                    </div>
                                                  )}

                                                  {/* Edit functionality */}
                                                  <button
                                                    onClick={() => {
                                                      // Pre-fill the inputs with existing times for editing
                                                      setAttendanceInTimes(prev => ({ ...prev, [key]: record.inTime }));
                                                      setAttendanceOutTimes(prev => ({ ...prev, [key]: record.outTime || '' }));

                                                      // Remove the record so it shows the input fields again
                                                      const newAttendance = { ...attendance };
                                                      delete newAttendance[key];
                                                      setAttendance(newAttendance);
                                                    }}
                                                    className="w-full px-2 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 font-medium text-xs mt-1"
                                                  >
                                                    <Edit2 size={10} className="inline mr-1" />
                                                    {t('edit')}
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                        <Calendar size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="text-lg">{t('noShiftsScheduled')}</p>
                        <p className="text-sm mt-1">No employees scheduled for this date</p>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* Manager Notifications View */}
        {activeView === 'notifications' && currentUser?.role === 'manager' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{t('notifications')}</h2>
                <button
                  onClick={() => setShowManagerNotificationForm(!showManagerNotificationForm)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 text-sm font-medium"
                >
                  <Plus size={16} />
                  Send to Employee
                </button>
              </div>

              {/* Send Notification Form */}
              {showManagerNotificationForm && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Notification to Employee</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee</label>
                      <select
                        id="notif-employee-select"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Choose an employee...</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                      <textarea
                        id="notif-message-input"
                        placeholder="Type your message..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="3"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const empSelect = document.getElementById('notif-employee-select');
                          const msgInput = document.getElementById('notif-message-input');
                          if (empSelect.value && msgInput.value) {
                            await sendManagerNotification(empSelect.value, msgInput.value);
                            empSelect.value = '';
                            msgInput.value = '';
                            setShowManagerNotificationForm(false);
                            alert(t('notificationSentSuccess'));
                          } else {
                            alert(t('selectEmployeeAndMessage'));
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                      >
                        Send Message
                      </button>
                      <button
                        onClick={() => setShowManagerNotificationForm(false)}
                        className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('messages')}</h3>
                {notifications.messages.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.messages.map(message => (
                      <div key={message.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-gray-900">{t('from')}: {message.from}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(message.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-700">{message.message}</p>
                          </div>
                          <button
                            onClick={() => deleteMessage(message.id)}
                            className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-sm ml-4"
                          >
                            <Trash2 size={14} className="inline" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">{t('noMessages')}</p>
                )}
              </div>

              {/* Leave Requests Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('leaveRequests')}</h3>
                {notifications.leaveRequests.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.leaveRequests.map(request => (
                      <div key={request.id} className={`border rounded-lg p-4 ${
                        request.status === 'pending' ? 'bg-yellow-50 border-yellow-300' :
                        request.status === 'approved' ? 'bg-green-50 border-green-300' :
                        'bg-red-50 border-red-300'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-gray-900">{request.employeeName}</span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                request.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                                request.status === 'approved' ? 'bg-green-200 text-green-800' :
                                'bg-red-200 text-red-800'
                              }`}>
                                {t(request.status)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-700 mb-1">
                              <strong>{t('startDate')}:</strong> {request.startDate} | <strong>{t('endDate')}:</strong> {request.endDate}
                            </div>
                            <p className="text-gray-600 text-sm"><strong>{t('reason')}:</strong> {request.reason}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(request.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4 flex-col">
                            {request.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => approveLeaveRequest(request.id)}
                                  className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-sm whitespace-nowrap"
                                >
                                  {t('approve')}
                                </button>
                                <button
                                  onClick={() => rejectLeaveRequest(request.id)}
                                  className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-sm whitespace-nowrap"
                                >
                                  {t('reject')}
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => deleteLeaveRequest(request.id)}
                              className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 text-sm whitespace-nowrap flex items-center justify-center gap-1"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">{t('noLeaveRequests')}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Employee Schedule View */}
        {activeView === 'mySchedule' && currentUser?.role === 'employee' && (
          <div className="space-y-6">
            {/* Employee Info Card with Current Time */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-lg p-6 border border-blue-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('mySchedule')}</h2>
                  <p className="text-gray-700">{currentUser.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {roles.find(r => r.id === currentUser.roleId)?.name || 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-sm text-gray-600 mt-1">{currentTime.toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setEmployeeViewTab('schedule')}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  employeeViewTab === 'schedule'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                {t('weeklySchedule')}
              </button>
              <button
                onClick={() => setEmployeeViewTab('messages')}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  employeeViewTab === 'messages'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                {t('notifications')}
                {notifications.messages.filter(m => !m.to || m.to === currentUser?.id).length > 0 && (
                  <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-sm font-bold">
                    {notifications.messages.filter(m => !m.to || m.to === currentUser?.id).length}
                  </span>
                )}
              </button>
            </div>

            {/* Schedule Tab */}
            {employeeViewTab === 'schedule' && (
              <div className="space-y-6">
                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowEmployeeMessageForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Bell size={18} />
                    {t('sendMessage')}
                  </button>
                  <button
                    onClick={() => setShowLeaveRequestForm(true)}
                    className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Calendar size={18} />
                    {t('requestLeave')}
                  </button>
                </div>

                {/* Weekly Schedule */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{t('weeklySchedule')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                    {currentWeek.map((date, idx) => {
                      const dayName = daysOfWeek[idx];
                      const empShifts = schedule[date]?.[currentUser.id] || [];
                      const onLeave = isOnLeave(currentUser.id, date);
                      const unavail = isUnavailable(currentUser.id, date);
                      const isToday = date === new Date().toISOString().split('T')[0];

                      return (
                        <div key={date} className={`border-2 rounded-lg p-3 ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                          <div className="text-xs font-semibold text-gray-600 mb-1">{t(dayName)}</div>
                          <div className="text-sm font-bold text-gray-900 mb-2">{date.split('-')[2]}</div>

                          {onLeave ? (
                            <div className="text-xs text-yellow-600 font-medium">{t('leave')}</div>
                          ) : unavail ? (
                            <div className="text-xs text-orange-600 font-medium">{t('unavailable')}</div>
                          ) : empShifts.length > 0 ? (
                            <div className="space-y-2">
                              {empShifts.map(shift => {
                                const key = `${currentUser.id}-${date}-${shift.id}`;
                                const record = attendance[key];
                                const shiftSchedule = shift.schedule?.[dayName];

                                return (
                                  <div key={shift.id} className="bg-gray-50 rounded p-2 border border-gray-200">
                                    <div className="text-xs font-medium text-gray-900">{shift.name}</div>
                                    {shiftSchedule && (
                                      <div className="text-xs text-gray-600 mt-1">
                                        {shiftSchedule.startTime} - {shiftSchedule.endTime}
                                      </div>
                                    )}

                                    {/* Attendance Status */}
                                    {record && (
                                      <div className="mt-2 space-y-1">
                                        <div className={`text-xs font-semibold ${
                                          record.status === 'onTime' ? 'text-green-600' :
                                          record.status === 'slightlyLate' ? 'text-orange-500' :
                                          'text-red-600'
                                        }`}>
                                          {record.inTime ? `✓ ${record.inTime}` : ''}
                                        </div>
                                        {record.outTime && (
                                          <div className={`text-xs font-semibold ${
                                            record.outStatus === 'onTime' ? 'text-green-600' :
                                            'text-orange-500'
                                          }`}>
                                            {`⏱ ${record.outTime}`}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Check-in/Check-out buttons for today only */}
                                    {isToday && (
                                      <div className="mt-3 space-y-2">
                                        {!record?.inTime ? (
                                          <button
                                            onClick={() => {
                                              openCheckInPopup(date, shift);
                                              confirmCheckInOut();
                                            }}
                                            className="w-full px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-semibold text-sm transition-colors"
                                          >
                                            ✓ {t('checkIn')}
                                          </button>
                                        ) : !record?.outTime ? (
                                          <button
                                            onClick={() => {
                                              openCheckOutPopup(date, shift);
                                              confirmCheckInOut();
                                            }}
                                            className="w-full px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold text-sm transition-colors"
                                          >
                                            ⏱ {t('checkOut')}
                                          </button>
                                        ) : (
                                          <div className="w-full px-3 py-2 rounded-lg bg-green-100 text-green-700 font-semibold text-sm text-center">
                                            ✓ {t('checkedOut')}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">No shift</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Messages Tab */}
            {employeeViewTab === 'messages' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">{t('notifications')}</h3>
                {notifications.messages.filter(m => !m.to || m.to === currentUser?.id).length > 0 ? (
                  <div className="space-y-3">
                    {notifications.messages.filter(m => !m.to || m.to === currentUser?.id).map(message => (
                      <div key={message.id} className={`border-l-4 rounded-lg p-4 flex items-start justify-between ${
                        message.type === 'leave_approval' ? 'bg-green-50 border-green-500' :
                        message.type === 'leave_rejection' ? 'bg-red-50 border-red-500' :
                        'bg-blue-50 border-blue-500'
                      }`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-900">{message.from}</span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              message.type === 'leave_approval' ? 'bg-green-200 text-green-800' :
                              message.type === 'leave_rejection' ? 'bg-red-200 text-red-800' :
                              'bg-blue-200 text-blue-800'
                            }`}>
                              {message.type === 'leave_approval' ? 'APPROVED' :
                               message.type === 'leave_rejection' ? 'REJECTED' :
                               'MESSAGE'}
                            </span>
                          </div>
                          <p className="text-gray-700">{message.message}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(message.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteMessage(message.id)}
                          className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 text-sm ml-4"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bell size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">{t('noNotifications')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shift Details Popup */}
      {selectedShiftDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedShiftDetails.shift.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedShiftDetails.employee.name}</p>
              </div>
              <button
                onClick={() => setSelectedShiftDetails(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Shift Details Content */}
            <div className="space-y-4">
              {/* Date and Day */}
              <div className="border-b border-gray-200 pb-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">{t('dateAndDay')}</div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">{selectedShiftDetails.dayName}</span>
                  <span className="text-gray-600 text-sm">{selectedShiftDetails.date}</span>
                </div>
              </div>

              {/* Shift Timings */}
              {(() => {
                // Times can be either directly on shift (from DB) or in shiftSchedule (from generation)
                const startTime = selectedShiftDetails.shift.startTime || selectedShiftDetails.shiftSchedule?.startTime;
                const endTime = selectedShiftDetails.shift.endTime || selectedShiftDetails.shiftSchedule?.endTime;
                
                if (startTime && endTime) {
                  return (
                    <div className="border-b border-gray-200 pb-4">
                      <div className="text-sm font-semibold text-gray-700 mb-2">{t('shiftTimings')}</div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">
                          {startTime} - {endTime}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Work Hours Calculation */}
              {(() => {
                // Times can be either directly on shift (from DB) or in shiftSchedule (from generation)
                const startTime = selectedShiftDetails.shift.startTime || selectedShiftDetails.shiftSchedule?.startTime;
                const endTime = selectedShiftDetails.shift.endTime || selectedShiftDetails.shiftSchedule?.endTime;
                
                if (startTime && endTime) {
                  const [startH, startM] = startTime.split(':').map(Number);
                  const [endH, endM] = endTime.split(':').map(Number);
                  let startMin = startH * 60 + startM;
                  let endMin = endH * 60 + endM;
                  if (endMin < startMin) endMin += 24 * 60;
                  const totalHours = (endMin - startMin) / 60;
                  const breakHours = (selectedShiftDetails.role?.breakMinutes || 0) / 60;
                  const workHours = Math.max(0, totalHours - breakHours);

                  return (
                    <div className="border-b border-gray-200 pb-4">
                      <div className="text-sm font-semibold text-gray-700 mb-3">{t('hours')}</div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">{t('totalShiftTime')}</span>
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded font-semibold text-sm">{totalHours.toFixed(1)}h</span>
                        </div>
                        {selectedShiftDetails.role?.breakMinutes > 0 && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">{t('breakTime')}</span>
                              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded font-semibold text-sm">{breakHours.toFixed(1)}h</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700 font-medium">{t('workHours')}</span>
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded font-semibold text-sm">{workHours.toFixed(1)}h</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Role Information */}
              {selectedShiftDetails.role && (
                <div className="border-b border-gray-200 pb-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">{t('role')}</div>
                  <div className="text-gray-700">{selectedShiftDetails.role.name}</div>
                  {selectedShiftDetails.role.breakMinutes > 0 && (
                    <div className="text-xs text-gray-600 mt-1">{t('break')}: {selectedShiftDetails.role.breakMinutes} {t('minutes')}</div>
                  )}
                </div>
              )}

              {/* Attendance Status */}
              {(() => {
                const key = `${selectedShiftDetails.employee.id}-${selectedShiftDetails.date}-${selectedShiftDetails.shift.id}`;
                const record = attendance[key];
                if (record) {
                  return (
                    <div className="border-b border-gray-200 pb-4">
                      <div className="text-sm font-semibold text-gray-700 mb-2">{t('attendance')}</div>
                      <div className="space-y-2">
                        {record.inTime && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">{t('checkIn')}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${
                                record.status === 'onTime' ? 'text-green-600' :
                                record.status === 'slightlyLate' ? 'text-orange-500' :
                                'text-red-600'
                              }`}>
                                {record.inTime}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                record.status === 'onTime' ? 'bg-green-100 text-green-700' :
                                record.status === 'slightlyLate' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {record.status === 'onTime' ? t('onTime') :
                                 record.status === 'slightlyLate' ? t('late') :
                                 t('veryLate')}
                              </span>
                            </div>
                          </div>
                        )}
                        {record.outTime && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">{t('checkOut')}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${
                                record.outStatus === 'onTime' ? 'text-green-600' :
                                'text-orange-500'
                              }`}>
                                {record.outTime}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                record.outStatus === 'onTime' ? 'bg-green-100 text-green-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {record.outStatus === 'onTime' ? t('onTime') : t('late')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Close Button */}
            <div className="mt-6">
              <button
                onClick={() => setSelectedShiftDetails(null)}
                className="w-full px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Send Message Form */}
      {showEmployeeMessageForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Bell size={24} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('messageToManager')}</h3>
            </div>

            <div className="mb-4">
              <textarea
                value={notificationForm.message}
                onChange={(e) => setNotificationForm({ message: e.target.value })}
                placeholder={t('typeMessage')}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEmployeeMessageForm(false);
                  setNotificationForm({ message: '' });
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
              >
                {t('cancel')}
              </button>
              <button
                onClick={sendMessageToManager}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {t('send')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Leave Request Form */}
      {showLeaveRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Calendar size={24} className="text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('leaveRequest')}</h3>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('startDate')}
                </label>
                <input
                  type="date"
                  value={leaveRequestForm.startDate}
                  onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endDate')}
                </label>
                <input
                  type="date"
                  value={leaveRequestForm.endDate}
                  onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reason')}
                </label>
                <textarea
                  value={leaveRequestForm.reason}
                  onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, reason: e.target.value })}
                  placeholder={t('requestReason')}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLeaveRequestForm(false);
                  setLeaveRequestForm({ startDate: '', endDate: '', reason: '' });
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
              >
                {t('cancel')}
              </button>
              <button
                onClick={sendLeaveRequest}
                className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium"
              >
                {t('submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Early Check-in Warning Modal */}
      {earlyCheckInWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertCircle size={24} className="text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t('earlyCheckInTitle')}</h3>
                <p className="text-sm text-gray-600">{t('earlyCheckInMsg')}</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-semibold">{t('checkInTimeLabel')}:</span> {earlyCheckInWarning.inTime}
              </p>
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-semibold">{t('shiftStartTimeLabel')}:</span> {earlyCheckInWarning.shiftStartTime}
              </p>
              <p className="text-sm text-yellow-800 font-semibold">
                ⚠️ {earlyCheckInWarning.minutesEarly} {t('minutesEarlyLabel')}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  recordAttendance(
                    earlyCheckInWarning.key,
                    earlyCheckInWarning.employeeId,
                    earlyCheckInWarning.date,
                    earlyCheckInWarning.shiftId,
                    earlyCheckInWarning.inTime,
                    earlyCheckInWarning.shiftStartTime
                  );
                }}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm"
              >
                <Check size={16} className="inline mr-2" />
                {t('goAheadBtn')}
              </button>
              <button
                onClick={() => setEarlyCheckInWarning(null)}
                className="w-full px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium text-sm"
              >
                <X size={16} className="inline mr-2" />
                {t('cancelBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Editing Modal */}
      {editingShiftTime && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">{t('editShiftTime')}</h3>
              <button
                onClick={() => setEditingShiftTime(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  {employees.find(e => e.id === editingShiftTime.employeeId)?.name}
                </div>
                <div className="text-xs text-gray-500">
                  {editingShiftTime.dayName} - {editingShiftTime.date}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('changeShiftType')}</label>
                <select
                  value={editingShiftTime.selectedShiftId}
                  onChange={e => setEditingShiftTime({ ...editingShiftTime, selectedShiftId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {(() => {
                    const emp = employees.find(e => e.id === editingShiftTime.employeeId);
                    const empShifts = shifts.filter(s => s.roleId === emp?.roleId);
                    return empShifts.map(shift => (
                      <option key={shift.id} value={shift.id}>{shift.name}</option>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('startTime')}</label>
                <input
                  type="time"
                  value={editingShiftTime.startTime}
                  onChange={e => setEditingShiftTime({ ...editingShiftTime, startTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('endTime')}</label>
                <input
                  type="time"
                  value={editingShiftTime.endTime}
                  onChange={e => setEditingShiftTime({ ...editingShiftTime, endTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={saveShiftTime}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {t('save')}
              </button>
              <button
                onClick={deleteShiftFromSchedule}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                <Trash2 size={16} className="inline" />
              </button>
              <button
                onClick={() => setEditingShiftTime(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Shift Modal */}
      {addingShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">{t('addShift')}</h3>
              <button
                onClick={() => setAddingShift(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  {employees.find(e => e.id === addingShift.employeeId)?.name}
                </div>
                <div className="text-xs text-gray-500">
                  {addingShift.dayName} - {addingShift.date}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={addingShift.isCustom}
                    onChange={e => setAddingShift({ ...addingShift, isCustom: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('customTime')}</span>
                </label>
              </div>

              {!addingShift.isCustom && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('selectShift')}</label>
                  <select
                    value={addingShift.selectedShiftId}
                    onChange={e => setAddingShift({ ...addingShift, selectedShiftId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {addingShift.availableShifts.map(shift => (
                      <option key={shift.id} value={shift.id}>{shift.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('startTime')}</label>
                <input
                  type="time"
                  value={addingShift.startTime}
                  onChange={e => setAddingShift({ ...addingShift, startTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('endTime')}</label>
                <input
                  type="time"
                  value={addingShift.endTime}
                  onChange={e => setAddingShift({ ...addingShift, endTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  <AlertCircle size={14} className="inline mr-1" />
                  {t('addingShiftMsg')}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={saveAddedShift}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {t('save')}
              </button>
              <button
                onClick={() => setAddingShift(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overtime Warning Modal */}
      {overtimeWarnings.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertCircle size={24} className="text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t('overtimeDetected')}</h3>
                <p className="text-sm text-gray-600">{t('overtimeWarning')}</p>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm font-medium text-gray-700 border-b border-orange-200">
                    <th className="pb-2">{t('employees')}</th>
                    <th className="pb-2">{t('plannedHours')}</th>
                    <th className="pb-2">{t('dailyMax')}</th>
                    <th className="pb-2">{t('overtimeHours')}</th>
                  </tr>
                </thead>
                <tbody>
                  {overtimeWarnings.map(warning => {
                    const emp = employees.find(e => e.id === warning.employeeId);
                    return (
                      <tr key={warning.employeeId} className="text-sm border-b border-orange-100 last:border-0">
                        <td className="py-2 font-medium text-gray-900">{emp?.name}</td>
                        <td className="py-2 text-gray-700">{warning.plannedHours}h</td>
                        <td className="py-2 text-gray-700">{warning.maxHours}h</td>
                        <td className="py-2 font-bold text-orange-600">+{warning.overtime}h</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-900">
                <strong>{t('noteLabel')}:</strong> {t('continueWithOvertime')}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmOvertime}
                className="flex-1 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium"
              >
                <Check size={16} className="inline mr-2" />
                {t('recordOvertimeBtn')}
              </button>
              <button
                onClick={() => {
                  setOvertimeWarnings([]);
                  setLoading(false);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
              >
                <X size={16} className="inline mr-2" />
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DailyScheduleView = ({
  schedule, employees, roles, shifts, currentWeek, daysOfWeek, setSchedule,
  leaveRequests, unavailability, validateSchedule, saveScheduleToFile,
  attendance, setAttendance, overtimeHours, setOvertimeHours, loading, setLoading, t
}) => {
  const [selectedDate, setSelectedDate] = useState(currentWeek[0]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedSchedule, setEditedSchedule] = useState({});
  const [editingShift, setEditingShift] = useState(null);
  const [addingShift, setAddingShift] = useState(null);
  const [overtimeWarnings, setOvertimeWarnings] = useState([]);

  const daySchedule = (isEditMode ? editedSchedule : schedule)[selectedDate] || {};

  const enterEditMode = () => {
    setIsEditMode(true);
    setEditedSchedule(JSON.parse(JSON.stringify(schedule)));
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditedSchedule({});
    setOvertimeWarnings([]);
  };

  const saveChanges = async () => {
    setLoading(true);
    try {
      const validation = await scheduleLogic.validateSchedule(editedSchedule, employees, roles, shifts, currentWeek, language);

      if (!validation.valid) {
        alert(`${t('constraintViolation')}:\n\n${validation.errors.join('\n')}`);
        setLoading(false);
        return;
      }

      if (validation.overtime && validation.overtime.length > 0) {
        setOvertimeWarnings(validation.overtime);
        return;
      }

      setSchedule(editedSchedule);
      await scheduleLogic.saveScheduleToFile(editedSchedule);
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

  const confirmOvertime = async () => {
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

      const response = await fetch('http://localhost:5000/api/save-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: newAttendance })
      });

      if (response.ok) {
        setAttendance(newAttendance);
        setOvertimeHours(updatedOvertimeHours);
        setSchedule(editedSchedule);
        await scheduleLogic.saveScheduleToFile(editedSchedule);
        setIsEditMode(false);
        setEditedSchedule({});
        setOvertimeWarnings([]);
        alert(t('scheduleUpdateWithOvertimeSuccess'));
      }
    } catch (error) {
      console.error('Error saving with overtime:', error);
      alert(t('failedToSaveSchedule'));
    }
  };

  const openShiftEditor = (employeeId, shift) => {
    if (!isEditMode) return;

    const dayIdx = currentWeek.indexOf(selectedDate);
    const dayName = daysOfWeek[dayIdx];
    const shiftSchedule = shift.schedule?.[dayName];

    setEditingShift({
      employeeId,
      shift,
      dayName,
      startTime: shiftSchedule?.startTime || '09:00',
      endTime: shiftSchedule?.endTime || '17:00',
      selectedShiftId: shift.id
    });
  };

  const saveShiftEdits = () => {
    if (!editingShift) return;

    const { employeeId, dayName, startTime, endTime, selectedShiftId } = editingShift;

    // Calculate shift hours and check daily max
    const startParts = startTime.split(':');
    const endParts = endTime.split(':');
    let startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    let endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    if (endMinutes < startMinutes) endMinutes += 24 * 60;
    const shiftHours = (endMinutes - startMinutes) / 60.0;

    const emp = employees.find(e => e.id === employeeId);
    const dailyMax = emp?.dailyMaxHours || 8;
    const role = roles.find(r => r.id === emp?.roleId);
    const breakMinutes = role?.breakMinutes || 0;
    const actualHours = shiftHours - (breakMinutes / 60.0);

    // Check if exceeds daily max
    if (actualHours > dailyMax) {
      const confirmed = window.confirm(
        `${t('dailyMaxWarning')}\n\n` +
        `${t('shiftHours')}: ${actualHours.toFixed(1)}h\n` +
        `${t('dailyMax')}: ${dailyMax}h\n\n` +
        `${t('dailyMaxExceeded')}\n${t('continueAnyway')}`
      );
      if (!confirmed) return;
    }

    const newSchedule = JSON.parse(JSON.stringify(editedSchedule));

    if (newSchedule[selectedDate] && newSchedule[selectedDate][employeeId]) {
      const shiftIndex = newSchedule[selectedDate][employeeId].findIndex(s => s.id === editingShift.shift.id);
      if (shiftIndex !== -1) {
        if (selectedShiftId !== editingShift.shift.id) {
          const newShift = shifts.find(s => s.id === selectedShiftId);
          if (newShift) {
            newSchedule[selectedDate][employeeId][shiftIndex] = { ...newShift };
          }
        }

        if (!newSchedule[selectedDate][employeeId][shiftIndex].schedule) {
          newSchedule[selectedDate][employeeId][shiftIndex].schedule = {};
        }
        if (!newSchedule[selectedDate][employeeId][shiftIndex].schedule[dayName]) {
          newSchedule[selectedDate][employeeId][shiftIndex].schedule[dayName] = {};
        }
        newSchedule[selectedDate][employeeId][shiftIndex].schedule[dayName].startTime = startTime;
        newSchedule[selectedDate][employeeId][shiftIndex].schedule[dayName].endTime = endTime;
      }
    }

    setEditedSchedule(newSchedule);
    setEditingShift(null);
  };

  const deleteShift = () => {
    if (!editingShift) return;
    if (!window.confirm('Delete this shift?')) return;

    const { employeeId, shift } = editingShift;
    const newSchedule = JSON.parse(JSON.stringify(editedSchedule));

    if (newSchedule[selectedDate] && newSchedule[selectedDate][employeeId]) {
      newSchedule[selectedDate][employeeId] = newSchedule[selectedDate][employeeId].filter(s => s.id !== shift.id);
      if (newSchedule[selectedDate][employeeId].length === 0) {
        delete newSchedule[selectedDate][employeeId];
      }
    }

    setEditedSchedule(newSchedule);
    setEditingShift(null);
  };

  const openAddShift = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    const dayIdx = currentWeek.indexOf(selectedDate);
    const dayName = daysOfWeek[dayIdx];
    const empShifts = shifts.filter(s => s.roleId === emp.roleId);

    setAddingShift({
      employeeId,
      dayName,
      availableShifts: empShifts,
      selectedShiftId: empShifts[0]?.id || '',
      startTime: '09:00',
      endTime: '17:00',
      isCustom: false
    });
  };

  const saveAddedShift = () => {
    if (!addingShift) return;

    const { employeeId, dayName, selectedShiftId, startTime, endTime, isCustom } = addingShift;

    // Calculate shift hours and check daily max
    const startParts = startTime.split(':');
    const endParts = endTime.split(':');
    let startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    let endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    if (endMinutes < startMinutes) endMinutes += 24 * 60;
    const shiftHours = (endMinutes - startMinutes) / 60.0;

    const emp = employees.find(e => e.id === employeeId);
    const dailyMax = emp?.dailyMaxHours || 8;
    const role = roles.find(r => r.id === emp?.roleId);
    const breakMinutes = role?.breakMinutes || 0;
    const actualHours = shiftHours - (breakMinutes / 60.0);

    // Check if exceeds daily max
    if (actualHours > dailyMax) {
      const confirmed = window.confirm(
        `${t('dailyMaxWarning')}\n\n` +
        `${t('shiftHours')}: ${actualHours.toFixed(1)}h\n` +
        `${t('dailyMax')}: ${dailyMax}h\n\n` +
        `${t('dailyMaxExceeded')}\n${t('continueAnyway')}`
      );
      if (!confirmed) return;
    }

    const newSchedule = JSON.parse(JSON.stringify(editedSchedule));

    if (!newSchedule[selectedDate]) newSchedule[selectedDate] = {};
    if (!newSchedule[selectedDate][employeeId]) newSchedule[selectedDate][employeeId] = [];

    if (isCustom) {
      const customShift = {
        id: `custom-${Date.now()}`,
        name: 'Custom',
        roleId: employees.find(e => e.id === employeeId)?.roleId,
        priority: 50,
        schedule: {
          [dayName]: {
            enabled: true,
            startTime,
            endTime
          }
        }
      };
      newSchedule[selectedDate][employeeId].push(customShift);
    } else {
      const shift = shifts.find(s => s.id === selectedShiftId);
      if (shift) {
        const shiftCopy = { ...shift };
        if (!shiftCopy.schedule) shiftCopy.schedule = {};
        if (!shiftCopy.schedule[dayName]) shiftCopy.schedule[dayName] = {};
        shiftCopy.schedule[dayName].startTime = startTime;
        shiftCopy.schedule[dayName].endTime = endTime;
        shiftCopy.schedule[dayName].enabled = true;
        newSchedule[selectedDate][employeeId].push(shiftCopy);
      }
    }

    setEditedSchedule(newSchedule);
    setAddingShift(null);
  };

  const handleDragStart = (e, employeeId, shift) => {
    if (!isEditMode) return;
    setDraggedItem({ employeeId, shift });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetEmployeeId) => {
    e.preventDefault();

    if (!draggedItem) return;

    const { employeeId: sourceEmployeeId, shift } = draggedItem;

    const targetEmployee = employees.find(e => e.id === targetEmployeeId);
    const sourceEmployee = employees.find(e => e.id === sourceEmployeeId);

    if (!targetEmployee || !sourceEmployee) return;

    if (targetEmployee.roleId !== shift.roleId) {
      alert(t('roleDoesNotMatch'));
      return;
    }

    const newSchedule = JSON.parse(JSON.stringify(editedSchedule));
    if (!newSchedule[selectedDate]) newSchedule[selectedDate] = {};

    if (newSchedule[selectedDate][sourceEmployeeId]) {
      newSchedule[selectedDate][sourceEmployeeId] = newSchedule[selectedDate][sourceEmployeeId].filter(
        s => s.id !== shift.id
      );
    }

    if (!newSchedule[selectedDate][targetEmployeeId]) {
      newSchedule[selectedDate][targetEmployeeId] = [];
    }
    newSchedule[selectedDate][targetEmployeeId].push(shift);

    setEditedSchedule(newSchedule);
    setDraggedItem(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('dailyScheduleView')}</h2>
          {isEditMode && (
            <p className="text-sm text-blue-600 mt-1">
              {t('dragToReassign')} • {t('clickToEditTime')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditMode ? (
            <>
              <button
                onClick={() => {
                  const currentIdx = currentWeek.indexOf(selectedDate);
                  if (currentIdx > 0) setSelectedDate(currentWeek[currentIdx - 1]);
                }}
                disabled={currentWeek.indexOf(selectedDate) === 0}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 disabled:opacity-50"
              >
                ←
              </button>
              <select
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium min-w-[200px]"
              >
                {currentWeek.map((date, idx) => (
                  <option key={date} value={date}>
                    {t(daysOfWeek[idx])} - {date}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const currentIdx = currentWeek.indexOf(selectedDate);
                  if (currentIdx < currentWeek.length - 1) setSelectedDate(currentWeek[currentIdx + 1]);
                }}
                disabled={currentWeek.indexOf(selectedDate) === currentWeek.length - 1}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 disabled:opacity-50"
              >
                →
              </button>
              <button
                onClick={enterEditMode}
                disabled={Object.keys(daySchedule).length === 0}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 text-sm font-medium disabled:opacity-50"
              >
                <Edit2 size={16} />
                {t('editSchedule')}
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white flex items-center gap-2 text-sm font-medium"
              >
                <Printer size={16} />
                {t('printSchedule')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={saveChanges}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 text-sm font-medium disabled:opacity-50"
              >
                <Save size={16} />
                {t('saveChanges')}
              </button>
              <button
                onClick={exitEditMode}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center gap-2 text-sm font-medium disabled:opacity-50"
              >
                <X size={16} />
                {t('discardChanges')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {roles.map(role => {
          const roleEmployees = employees.filter(e => e.roleId === role.id);
          if (roleEmployees.length === 0) return null;

          return (
            <div key={role.id} id={`role-schedule-pdf-${role.id}-${selectedDate}`} className="border-2 border-gray-300 rounded-lg overflow-hidden">
              {/* Role Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users size={18} />
                  {role.name}
                </h3>
                <button
                  onClick={() => exportLogic.downloadRoleSchedulePDF(role.name, role.id, selectedDate, t)}
                  className="px-3 py-1 rounded-lg bg-white hover:bg-purple-100 text-purple-600 flex items-center gap-1 text-sm font-medium transition-colors"
                >
                  <Download size={14} />
                  {t('downloadPDF')}
                </button>
                <button
                  onClick={() => exportLogic.downloadDailyScheduleExcel(daysOfWeek[currentWeek.indexOf(selectedDate)], selectedDate, schedule, currentWeek, employees, roles, language, t)}
                  className="px-3 py-1 rounded-lg bg-white hover:bg-green-100 text-green-600 flex items-center gap-1 text-sm font-medium transition-colors"
                >
                  <Download size={14} />
                  Excel
                </button>
              </div>

              {/* Employee Cards in Grid */}
              <div className="p-4 grid grid-cols-4 gap-4">
                {roleEmployees.map(emp => {
                  const empShifts = daySchedule[emp.id] || [];
                  const dayIdx = currentWeek.indexOf(selectedDate);
                  const onLeave = leaveRequests[`${emp.id}-${selectedDate}`];
                  const unavail = unavailability[`${emp.id}-${selectedDate}`];

                  return (
                    <div
                      key={emp.id}
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, emp.id)}
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow relative ${
                        onLeave ? 'bg-red-50 border-red-300' : unavail ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {(onLeave || unavail) && (
                        <div className="absolute top-2 right-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            onLeave ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                          }`}>
                            {onLeave ? 'LEAVE' : 'UNAVAILABLE'}
                          </span>
                        </div>
                      )}

                      <div className="mb-4 pb-3 border-b border-gray-200">
                        <div className="font-semibold text-gray-900 text-sm">{emp.name}</div>
                        <div className="text-xs text-gray-500">{role?.name}</div>
                      </div>

                      {empShifts.length > 0 ? (
                        <div className="space-y-2">
                          {empShifts.map((shift, idx) => {
                            const dayName = daysOfWeek[dayIdx];
                            const shiftSchedule = shift.schedule?.[dayName];
                            return (
                              <div
                                key={`${shift.id}-${idx}`}
                                draggable={isEditMode}
                                onDragStart={e => {
                                  if (isEditMode) {
                                    e.stopPropagation();
                                    handleDragStart(e, emp.id, shift);
                                  }
                                }}
                                onClick={(e) => {
                                  if (isEditMode) {
                                    e.stopPropagation();
                                    openShiftEditor(emp.id, shift);
                                  }
                                }}
                                className={`bg-blue-50 border border-blue-200 rounded p-2 hover:shadow-md transition-shadow ${
                                  isEditMode ? 'cursor-pointer' : ''
                                }`}
                              >
                                <div className="text-xs font-semibold text-blue-900">{shift.name}</div>
                                {shiftSchedule && (
                                  <div className="text-xs text-blue-700 mt-1">
                                    {shiftSchedule.startTime}-{shiftSchedule.endTime}
                                  </div>
                                )}
                                {(() => {
                                  const key = `${emp.id}-${selectedDate}-${shift.id}`;
                                  const record = attendance[key];
                                  if (record) {
                                    return (
                                      <div className="mt-2 space-y-0.5">
                                        {record.inTime && (
                                          <div className={`text-xs font-semibold ${
                                            record.status === 'onTime' ? 'text-green-600' :
                                            record.status === 'slightlyLate' ? 'text-orange-500' :
                                            'text-red-600'
                                          }`}>
                                            ✓ In: {record.inTime}
                                          </div>
                                        )}
                                        {record.outTime && (
                                          <div className={`text-xs font-semibold ${
                                            record.outStatus === 'onTime' ? 'text-green-600' :
                                            record.outStatus === 'slightlyLate' ? 'text-orange-500' :
                                            'text-red-600'
                                          }`}>
                                            ⏱ Out: {record.outTime}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                {isEditMode && (
                                  <div className="text-xs text-blue-500 mt-1">
                                    <Clock size={10} className="inline mr-1" />
                                    Click to Edit
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div>
                          {isEditMode && !onLeave && !unavail ? (
                            <button
                              onClick={() => openAddShift(emp.id)}
                              className="w-full px-3 py-2 rounded border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-xs text-gray-600 hover:text-blue-600 transition-colors flex items-center justify-center gap-1"
                            >
                              <Plus size={14} />
                              {t('addShift')}
                            </button>
                          ) : (
                            <div className="text-xs text-gray-400 text-center py-6">
                              {t('noShiftsScheduled')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Shift Modal - Daily View */}
      {editingShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">{t('editShiftTime')}</h3>
              <button onClick={() => setEditingShift(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  {employees.find(e => e.id === editingShift.employeeId)?.name}
                </div>
                <div className="text-xs text-gray-500">
                  {editingShift.dayName} - {selectedDate}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('changeShiftType')}</label>
                <select
                  value={editingShift.selectedShiftId}
                  onChange={e => setEditingShift({ ...editingShift, selectedShiftId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {(() => {
                    const emp = employees.find(e => e.id === editingShift.employeeId);
                    const empShifts = shifts.filter(s => s.roleId === emp?.roleId);
                    return empShifts.map(shift => (
                      <option key={shift.id} value={shift.id}>{shift.name}</option>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('startTime')}</label>
                <input
                  type="time"
                  value={editingShift.startTime}
                  onChange={e => setEditingShift({ ...editingShift, startTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('endTime')}</label>
                <input
                  type="time"
                  value={editingShift.endTime}
                  onChange={e => setEditingShift({ ...editingShift, endTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={saveShiftEdits}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {t('save')}
              </button>
              <button
                onClick={deleteShift}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                <Trash2 size={16} className="inline" />
              </button>
              <button
                onClick={() => setEditingShift(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Shift Modal - Daily View */}
      {addingShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">{t('addShift')}</h3>
              <button onClick={() => setAddingShift(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  {employees.find(e => e.id === addingShift.employeeId)?.name}
                </div>
                <div className="text-xs text-gray-500">
                  {addingShift.dayName} - {selectedDate}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={addingShift.isCustom}
                    onChange={e => setAddingShift({ ...addingShift, isCustom: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('customTime')}</span>
                </label>
              </div>

              {!addingShift.isCustom && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('selectShift')}</label>
                  <select
                    value={addingShift.selectedShiftId}
                    onChange={e => setAddingShift({ ...addingShift, selectedShiftId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {addingShift.availableShifts.map(shift => (
                      <option key={shift.id} value={shift.id}>{shift.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('startTime')}</label>
                <input
                  type="time"
                  value={addingShift.startTime}
                  onChange={e => setAddingShift({ ...addingShift, startTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('endTime')}</label>
                <input
                  type="time"
                  value={addingShift.endTime}
                  onChange={e => setAddingShift({ ...addingShift, endTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  <AlertCircle size={14} className="inline mr-1" />
                  {t('addingShiftMsg')}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={saveAddedShift}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {t('save')}
              </button>
              <button
                onClick={() => setAddingShift(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overtime Warning Modal - Daily View */}
      {overtimeWarnings.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertCircle size={24} className="text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t('overtimeDetected')}</h3>
                <p className="text-sm text-gray-600">{t('overtimeWarning')}</p>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm font-medium text-gray-700 border-b border-orange-200">
                    <th className="pb-2">Employee</th>
                    <th className="pb-2">Planned Hours</th>
                    <th className="pb-2">Max Hours</th>
                    <th className="pb-2">Overtime</th>
                  </tr>
                </thead>
                <tbody>
                  {overtimeWarnings.map(warning => {
                    const emp = employees.find(e => e.id === warning.employeeId);
                    return (
                      <tr key={warning.employeeId} className="text-sm border-b border-orange-100 last:border-0">
                        <td className="py-2 font-medium text-gray-900">{emp?.name}</td>
                        <td className="py-2 text-gray-700">{warning.plannedHours}h</td>
                        <td className="py-2 text-gray-700">{warning.maxHours}h</td>
                        <td className="py-2 font-bold text-orange-600">+{warning.overtime}h</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-900">
                <strong>{t('noteLabel')}:</strong> {t('continueWithOvertime')}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmOvertime}
                className="flex-1 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium"
              >
                <Check size={16} className="inline mr-2" />
                {t('recordOvertimeBtn')}
              </button>
              <button
                onClick={() => {
                  setOvertimeWarnings([]);
                  setLoading(false);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
              >
                <X size={16} className="inline mr-2" />
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, onClick }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200'
  };

  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg hover:border-gray-300 transition-all text-left cursor-pointer"
    >
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3 border`}>
        <Icon size={20} />
      </div>
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </button>
  );
};

export default ShiftSchedulerApp;