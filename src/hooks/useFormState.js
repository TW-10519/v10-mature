import { useState } from 'react';

/**
 * Consolidates all form-related state into organized groups
 * Returns form state objects for Employee, Role, Shift, and Notification forms
 */
export const useFormState = () => {
  // ============================================
  // EMPLOYEE FORM STATE
  // ============================================
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    roleId: '',
    weeklyHours: 40,
    dailyMaxHours: 8,
    shiftsPerWeek: 5,
    skills: '',
  });

  const employeeFormState = {
    showForm: showEmployeeForm,
    editingItem: editingEmployee,
    formData: employeeForm,
  };

  const employeeFormSetters = {
    setShowForm: setShowEmployeeForm,
    setEditingItem: setEditingEmployee,
    setFormData: setEmployeeForm,
  };

  // ============================================
  // ROLE FORM STATE
  // ============================================
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    weekendRequired: false,
    requiredSkills: '',
    breakMinutes: 60,
  });

  const roleFormState = {
    showForm: showRoleForm,
    editingItem: editingRole,
    formData: roleForm,
  };

  const roleFormSetters = {
    setShowForm: setShowRoleForm,
    setEditingItem: setEditingRole,
    setFormData: setRoleForm,
  };

  // ============================================
  // SHIFT FORM STATE
  // ============================================
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    roleId: '',
    priority: 50,
    schedule: {
      Monday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [], dayPriority: 1 },
      Tuesday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [], dayPriority: 1 },
      Wednesday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [], dayPriority: 1 },
      Thursday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [], dayPriority: 1 },
      Friday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [], dayPriority: 1 },
      Saturday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [], dayPriority: 1 },
      Sunday: { enabled: false, startTime: '09:00', endTime: '17:00', multiple: [], dayPriority: 1 },
    },
  });

  const shiftFormState = {
    showForm: showShiftForm,
    editingItem: editingShift,
    formData: shiftForm,
  };

  const shiftFormSetters = {
    setShowForm: setShowShiftForm,
    setEditingItem: setEditingShift,
    setFormData: setShiftForm,
  };

  // ============================================
  // NOTIFICATION FORM STATE
  // ============================================
  const [notificationForm, setNotificationForm] = useState({ message: '' });
  const [leaveRequestForm, setLeaveRequestForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });

  const notificationFormState = {
    messageForm: notificationForm,
    leaveForm: leaveRequestForm,
  };

  const notificationFormSetters = {
    setMessageForm: setNotificationForm,
    setLeaveForm: setLeaveRequestForm,
  };

  // ============================================
  // CONSOLIDATED STATE OBJECT
  // ============================================
  return {
    // State groups
    employeeFormState,
    roleFormState,
    shiftFormState,
    notificationFormState,

    // Setter groups
    employeeFormSetters,
    roleFormSetters,
    shiftFormSetters,
    notificationFormSetters,

    // Convenience getters
    showEmployeeForm,
    editingEmployee,
    employeeForm,
    showRoleForm,
    editingRole,
    roleForm,
    showShiftForm,
    editingShift,
    shiftForm,
    notificationForm,
    leaveRequestForm,
  };
};
