-- ============================================================================
-- Shift Scheduler Database Schema
-- ============================================================================

-- Enable JSON extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- EMPLOYEES TABLE
-- ============================================================================
CREATE TABLE employees (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role_id VARCHAR(255) NOT NULL,
    weekly_hours INTEGER DEFAULT 40,
    daily_max_hours INTEGER DEFAULT 8,
    shifts_per_week INTEGER DEFAULT 5,
    skills JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ROLES TABLE
-- ============================================================================
CREATE TABLE roles (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    weekend_required BOOLEAN DEFAULT false,
    required_skills JSONB DEFAULT '[]',
    break_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SHIFTS TABLE
-- ============================================================================
CREATE TABLE shifts (
    id VARCHAR(255) PRIMARY KEY,
    role_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    priority INTEGER DEFAULT 50,
    days_of_week JSONB DEFAULT '[]',
    schedule JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- ============================================================================
-- SCHEDULE TABLE (Date-based schedule)
-- ============================================================================
CREATE TABLE schedule (
    id SERIAL PRIMARY KEY,
    schedule_date DATE NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    shift_id VARCHAR(255) NOT NULL,
    role_id VARCHAR(255) NOT NULL,
    shift_name VARCHAR(255),
    start_time VARCHAR(10),
    end_time VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schedule_date, employee_id, shift_id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (shift_id) REFERENCES shifts(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- ============================================================================
-- ATTENDANCE TABLE
-- ============================================================================
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    attendance_date DATE NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'present', -- present, absent, late, early_leave
    check_in_time VARCHAR(10),
    check_out_time VARCHAR(10),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(attendance_date, employee_id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- ============================================================================
-- ATTENDANCE HISTORY TABLE
-- ============================================================================
CREATE TABLE attendance_history (
    id SERIAL PRIMARY KEY,
    history_date DATE NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    status VARCHAR(50),
    check_in_time VARCHAR(10),
    check_out_time VARCHAR(10),
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- ============================================================================
-- SCHEDULE HISTORY TABLE
-- ============================================================================
CREATE TABLE schedule_history (
    id SERIAL PRIMARY KEY,
    history_date DATE NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    shift_id VARCHAR(255),
    shift_name VARCHAR(255),
    role_id VARCHAR(255),
    start_time VARCHAR(10),
    end_time VARCHAR(10),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- ============================================================================
-- LEAVE REQUESTS TABLE
-- ============================================================================
CREATE TABLE leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(255) NOT NULL,
    leave_date DATE NOT NULL,
    reason VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, leave_date),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- ============================================================================
-- UNAVAILABILITY TABLE
-- ============================================================================
CREATE TABLE unavailability (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(255) NOT NULL,
    unavailable_date DATE NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, unavailable_date),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    notification_key VARCHAR(255) UNIQUE,
    notification_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- OVERTIME TABLE
-- ============================================================================
CREATE TABLE overtime (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(255) NOT NULL,
    overtime_date DATE NOT NULL,
    hours DECIMAL(5, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, overtime_date),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- ============================================================================
-- DEMAND FORECAST TABLE
-- ============================================================================
CREATE TABLE demand_forecast (
    id SERIAL PRIMARY KEY,
    forecast_date DATE NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    forecast_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(forecast_date)
);

-- ============================================================================
-- LOGIN TABLE
-- ============================================================================
CREATE TABLE login (
    id SERIAL PRIMARY KEY,
    login_key VARCHAR(255) UNIQUE,
    login_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Schedule indexes
CREATE INDEX idx_schedule_date ON schedule(schedule_date);
CREATE INDEX idx_schedule_employee ON schedule(employee_id);
CREATE INDEX idx_schedule_role ON schedule(role_id);
CREATE INDEX idx_schedule_date_employee ON schedule(schedule_date, employee_id);

-- Attendance indexes
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date_employee ON attendance(attendance_date, employee_id);

-- Attendance history indexes
CREATE INDEX idx_attendance_history_date ON attendance_history(history_date);
CREATE INDEX idx_attendance_history_employee ON attendance_history(employee_id);

-- Schedule history indexes
CREATE INDEX idx_schedule_history_date ON schedule_history(history_date);
CREATE INDEX idx_schedule_history_employee ON schedule_history(employee_id);

-- Leave requests indexes
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_date ON leave_requests(leave_date);
CREATE INDEX idx_leave_requests_employee_date ON leave_requests(employee_id, leave_date);

-- Unavailability indexes
CREATE INDEX idx_unavailability_employee ON unavailability(employee_id);
CREATE INDEX idx_unavailability_date ON unavailability(unavailable_date);

-- Overtime indexes
CREATE INDEX idx_overtime_employee ON overtime(employee_id);
CREATE INDEX idx_overtime_date ON overtime(overtime_date);

-- Shifts indexes
CREATE INDEX idx_shifts_role ON shifts(role_id);

-- Employees indexes
CREATE INDEX idx_employees_role ON employees(role_id);

-- ============================================================================
-- COMMENT ON TABLES AND COLUMNS
-- ============================================================================

COMMENT ON TABLE employees IS 'Stores employee information including hours and skills';
COMMENT ON TABLE roles IS 'Stores role/department information';
COMMENT ON TABLE shifts IS 'Stores shift definitions with schedules and priorities';
COMMENT ON TABLE schedule IS 'Current schedule assignments';
COMMENT ON TABLE attendance IS 'Current attendance records';
COMMENT ON TABLE attendance_history IS 'Historical attendance records';
COMMENT ON TABLE schedule_history IS 'Historical schedule records';
COMMENT ON TABLE leave_requests IS 'Employee leave requests';
COMMENT ON TABLE unavailability IS 'Employee unavailability periods';
COMMENT ON TABLE notifications IS 'System notifications';
COMMENT ON TABLE overtime IS 'Overtime records';
COMMENT ON TABLE demand_forecast IS 'Demand forecasts';
COMMENT ON TABLE login IS 'Login configuration';
