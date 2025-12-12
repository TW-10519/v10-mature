
const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Load all data from database
 */
export const loadAllData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/load-all-data`);
    const data = await response.json();
    return {
      employees: data.employees || [],
      roles: data.roles || [],
      shifts: data.shifts || [],
      schedule: data.schedule || {},
      leaveRequests: data.leaveRequests || {},
      notifications: data.notifications || { messages: [], leaveRequests: [] }
    };
  } catch (error) {
    console.error('Error loading data:', error);
    return null;
  }
};

/**
 * Save employees and roles to database
 */
export const saveData = async (employees, roles) => {
  try {
    const response = await fetch(`${API_BASE_URL}/save-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employees, roles })
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save schedule to database
 */
export const saveSchedule = async (schedule) => {
  try {
    const response = await fetch(`${API_BASE_URL}/save-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule })
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving schedule:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save attendance to database
 */
export const saveAttendance = async (attendance) => {
  try {
    const response = await fetch(`${API_BASE_URL}/save-attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendance })
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving attendance:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate schedule using backend algorithm
 */
export const generateSchedule = async (employees, roles, shifts, leaveRequests, unavailability, currentWeek) => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employees,
        roles,
        shifts,
        leaveRequests,
        unavailability,
        currentWeek
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Error generating schedule:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Validate schedule
 */
export const validateSchedule = async (schedule, employees, roles, shifts, currentWeek, language = 'en') => {
  try {
    const response = await fetch(`${API_BASE_URL}/validate-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schedule,
        employees,
        roles,
        shifts,
        currentWeek,
        language
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Error validating schedule:', error);
    return { valid: false, errors: [error.message] };
  }
};

/**
 * Save overtime records
 */
export const saveOvertime = async (overtime) => {
  try {
    const response = await fetch(`${API_BASE_URL}/save-overtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overtime })
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving overtime:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get demand forecast
 */
export const getDemandForecast = async (currentWeek, language = 'en') => {
  try {
    const response = await fetch(`${API_BASE_URL}/demand-forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentWeek, language })
    });
    return await response.json();
  } catch (error) {
    console.error('Error getting forecast:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save notifications
 */
export const saveNotifications = async (notifications) => {
  try {
    const response = await fetch(`${API_BASE_URL}/save-notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications })
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving notifications:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check service health
 */
export const checkHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  } catch (error) {
    console.error('Error checking health:', error);
    return { status: 'unhealthy' };
  }
};
