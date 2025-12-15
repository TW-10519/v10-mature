// Shift Configuration Module
import { daysOfWeek } from '../utils/constants';

export const useShiftLogic = () => {
  
  const saveShift = (shiftForm, editingShift, shifts, setShifts, setEditingShift, roles = []) => {
    if (!shiftForm.name || !shiftForm.roleId) {
      alert('Please fill required fields');
      return;
    }

    const selectedRole = roles.find(r => r.id === shiftForm.roleId);

    // Check break time constraint
    for (const day of daysOfWeek) {
      if (shiftForm.schedule[day] && shiftForm.schedule[day].enabled) {
        const [startH, startM] = shiftForm.schedule[day].startTime.split(':').map(Number);
        const [endH, endM] = shiftForm.schedule[day].endTime.split(':').map(Number);
        let startMin = startH * 60 + startM;
        let endMin = endH * 60 + endM;
        if (endMin < startMin) endMin += 24 * 60;
        const shiftHours = (endMin - startMin) / 60;

        if (shiftHours > 4 && (!selectedRole || selectedRole.breakMinutes === 0)) {
          alert('Shifts longer than 4 hours require a break time to be configured for the role');
          return;
        }
      }
    }

    const shiftData = {
      name: shiftForm.name,
      roleId: shiftForm.roleId,
      priority: shiftForm.priority,
      schedule: shiftForm.schedule
    };

    if (editingShift) {
      setShifts(shifts.map(s => s.id === editingShift.id ? { ...shiftData, id: editingShift.id } : s));
      setEditingShift(null);
    } else {
      setShifts([...shifts, { ...shiftData, id: Date.now().toString() }]);
    }
  };

  const deleteShift = (id, shifts, setShifts) => {
    if (window.confirm('Delete this shift?')) {
      setShifts(shifts.filter(s => s.id !== id));
    }
  };

  return {
    saveShift,
    deleteShift
  };
};
