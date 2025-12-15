// Role Management Module
import { API_BASE_URL, daysOfWeek } from '../utils/constants';

export const useRoleLogic = () => {
  
  const saveRole = (roleForm, editingRole, roles, setRoles, setEditingRole) => {
    if (!roleForm.name) {
      alert('Please enter role name');
      return;
    }

    const roleData = {
      ...roleForm,
      requiredSkills: roleForm.requiredSkills.split(',').map(s => s.trim()).filter(s => s)
    };

    if (editingRole) {
      setRoles(roles.map(r => r.id === editingRole.id ? { ...roleData, id: editingRole.id } : r));
      setEditingRole(null);
    } else {
      setRoles([...roles, { ...roleData, id: Date.now().toString() }]);
    }
  };

  const deleteRole = (id, roles, setRoles, shifts, setShifts) => {
    if (window.confirm('Delete this role and all its shifts?')) {
      setRoles(roles.filter(r => r.id !== id));
      setShifts(shifts.filter(s => s.roleId !== id));
    }
  };

  return {
    saveRole,
    deleteRole
  };
};
