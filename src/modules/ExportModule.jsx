// Export and Reporting Module
import * as XLSX from 'xlsx';

export const useExportLogic = () => {
  
  const downloadSchedulePDF = async (schedule, currentWeek, daysOfWeek, employees, roles, shifts, t) => {
    const element = document.getElementById('schedule-table-for-pdf');
    if (!element) {
      alert(t('scheduleTableNotFound'));
      return;
    }

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

  const downloadScheduleExcel = async (schedule, currentWeek, daysOfWeek, employees, roles, shifts, language, t) => {
    try {
      const workbook = XLSX.utils.book_new();
      const weeklyData = [];
      const days = daysOfWeek;
      
      const header = ['Employee'];
      currentWeek.forEach((date, idx) => {
        header.push(`${days[idx]} (${date})`);
      });
      
      weeklyData.push(header);
      
      const sortedEmployees = [...employees].sort((a, b) => {
        const roleA = roles.find(r => r.id === a.roleId);
        const roleB = roles.find(r => r.id === b.roleId);
        const roleNameA = roleA?.name || '';
        const roleNameB = roleB?.name || '';
        if (roleNameA !== roleNameB) return roleNameA.localeCompare(roleNameB);
        return a.name.localeCompare(b.name);
      });

      sortedEmployees.forEach(emp => {
        const row = [emp.name];
        currentWeek.forEach(date => {
          const empShifts = schedule[date]?.[emp.id] || [];
          if (empShifts.length > 0) {
            const shiftInfo = empShifts.map(shift => {
              const dayIdx = currentWeek.indexOf(date);
              const dayName = days[dayIdx];
              const shiftSchedule = shift.schedule?.[dayName];
              if (shiftSchedule) {
                return `${shift.name} (${shiftSchedule.startTime}-${shiftSchedule.endTime})`;
              }
              return shift.name;
            }).join(', ');
            row.push(shiftInfo);
          } else {
            row.push('');
          }
        });
        weeklyData.push(row);
      });
      
      const worksheet = XLSX.utils.aoa_to_sheet(weeklyData);
      worksheet['!cols'] = [{ wch: 20 }, ...Array(7).fill({ wch: 25 })];
      XLSX.utils.book_append_sheet(workbook, worksheet, language === 'ja' ? '週間スケジュール' : 'Weekly Schedule');
      
      const fileName = language === 'ja' 
        ? `週間スケジュール_${currentWeek[0]}_to_${currentWeek[6]}.xlsx`
        : `schedule-${currentWeek[0]}-to-${currentWeek[6]}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error downloading schedule Excel:', error);
      alert(t('failedToDownloadSchedule'));
    }
  };

  const downloadAttendanceExcel = async (attendance, currentWeek, daysOfWeek, employees, roles, schedule, language, t) => {
    try {
      const workbook = XLSX.utils.book_new();
      const attendanceData = [];
      
      const employeeLabel = language === 'ja' ? '従業員' : 'Employee';
      const roleLabel = language === 'ja' ? 'ロール' : 'Role';
      const dateLabel = language === 'ja' ? '日付' : 'Date';
      const shiftLabel = language === 'ja' ? 'シフト' : 'Shift';
      const inTimeLabel = language === 'ja' ? '入勤時間' : 'In Time';
      const outTimeLabel = language === 'ja' ? '退勤時間' : 'Out Time';
      const statusLabel = language === 'ja' ? 'ステータス' : 'Status';
      const workedHoursLabel = language === 'ja' ? '勤務時間' : 'Worked Hours';
      const weekLabel = language === 'ja' ? '週間出勤記録' : 'Weekly Attendance';
      
      attendanceData.push([weekLabel]);
      attendanceData.push([`${dateLabel}: ${currentWeek[0]} to ${currentWeek[6]}`]);
      attendanceData.push([]);
      
      attendanceData.push([employeeLabel, roleLabel, dateLabel, shiftLabel, inTimeLabel, outTimeLabel, workedHoursLabel, statusLabel]);
      
      const days = daysOfWeek;
      
      const sortedEmployees = [...employees].sort((a, b) => {
        const roleA = roles.find(r => r.id === a.roleId);
        const roleB = roles.find(r => r.id === b.roleId);
        const roleNameA = roleA?.name || '';
        const roleNameB = roleB?.name || '';
        if (roleNameA !== roleNameB) return roleNameA.localeCompare(roleNameB);
        return a.name.localeCompare(b.name);
      });

      sortedEmployees.forEach(emp => {
        const role = roles.find(r => r.id === emp.roleId)?.name || '';
        
        currentWeek.forEach((date, idx) => {
          const dayName = days[idx];
          const empShifts = schedule[date]?.[emp.id] || [];
          
          empShifts.forEach(shift => {
            const key = `${emp.id}-${date}-${shift.id}`;
            const record = attendance[key];
            
            if (record) {
              let workedHours = '';
              if (record.inTime && record.outTime) {
                const [inH, inM] = record.inTime.split(':').map(Number);
                const [outH, outM] = record.outTime.split(':').map(Number);
                let inMin = inH * 60 + inM;
                let outMin = outH * 60 + outM;
                
                if (outMin < inMin) outMin += 24 * 60;
                
                const totalMinutes = outMin - inMin;
                const breakMinutes = role ? (roles.find(r => r.id === emp.roleId)?.breakMinutes || 0) : 0;
                const actualWorkedMinutes = Math.max(0, totalMinutes - breakMinutes);
                const hours = actualWorkedMinutes / 60;
                
                workedHours = hours.toFixed(2);
              }
              
              attendanceData.push([
                emp.name,
                role,
                date,
                shift.name,
                record.inTime || '',
                record.outTime || '',
                workedHours,
                record.status || ''
              ]);
            }
          });
        });
      });
      
      const worksheet = XLSX.utils.aoa_to_sheet(attendanceData);
      worksheet['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, worksheet, language === 'ja' ? '出勤記録' : 'Attendance');
      
      const fileName = language === 'ja' 
        ? `出勤記録_${currentWeek[0]}_to_${currentWeek[6]}.xlsx`
        : `attendance-${currentWeek[0]}-to-${currentWeek[6]}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error downloading attendance Excel:', error);
      alert(t('failedToDownloadAttendance'));
    }
  };

  const downloadDailySchedulePDF = async (dayName, date, t) => {
    const element = document.getElementById(`daily-schedule-pdf-${date}`);
    if (!element) {
      alert(t('dailyScheduleNotFound'));
      return;
    }

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
      filename: `daily-schedule-${date}-${dayName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    window.html2pdf().set(opt).from(element).save();
  };

  const downloadRoleSchedulePDF = async (roleName, roleId, date, t) => {
    const element = document.getElementById(`role-schedule-pdf-${roleId}-${date}`);
    if (!element) {
      alert(t('roleScheduleNotFound'));
      return;
    }

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
      filename: `${roleName}-schedule-${date}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    window.html2pdf().set(opt).from(element).save();
  };

  const downloadDailyScheduleExcel = async (dayName, date, schedule, currentWeek, employees, roles, language, t) => {
    try {
      const workbook = XLSX.utils.book_new();
      const dailyData = [];
      
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dateLabel = language === 'ja' ? '日付' : 'Date';
      const employeeLabel = language === 'ja' ? '従業員' : 'Employee';
      const shiftLabel = language === 'ja' ? 'シフト' : 'Shift';
      const startTimeLabel = language === 'ja' ? '開始時刻' : 'Start Time';
      const endTimeLabel = language === 'ja' ? '終了時刻' : 'End Time';
      const roleLabel = language === 'ja' ? 'ロール' : 'Role';
      
      dailyData.push([dateLabel, date]);
      dailyData.push([dayName, '']);
      dailyData.push([]);
      
      dailyData.push([employeeLabel, roleLabel, shiftLabel, startTimeLabel, endTimeLabel]);
      
      const dayIdx = currentWeek.indexOf(date);
      const sortedEmployees = [...employees].sort((a, b) => {
        const roleA = roles.find(r => r.id === a.roleId);
        const roleB = roles.find(r => r.id === b.roleId);
        const roleNameA = roleA?.name || '';
        const roleNameB = roleB?.name || '';
        if (roleNameA !== roleNameB) return roleNameA.localeCompare(roleNameB);
        return a.name.localeCompare(b.name);
      });
      
      sortedEmployees.forEach(emp => {
        const empShifts = schedule[date]?.[emp.id] || [];
        const role = roles.find(r => r.id === emp.roleId)?.name || '';
        
        empShifts.forEach(shift => {
          const shiftSchedule = shift.schedule?.[dayName];
          const startTime = shiftSchedule?.startTime || '';
          const endTime = shiftSchedule?.endTime || '';
          dailyData.push([emp.name, role, shift.name, startTime, endTime]);
        });
      });
      
      const worksheet = XLSX.utils.aoa_to_sheet(dailyData);
      worksheet['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, worksheet, language === 'ja' ? '日別スケジュール' : 'Daily Schedule');
      
      const fileName = language === 'ja' 
        ? `日別スケジュール_${date}_${dayName}.xlsx`
        : `daily-schedule-${date}-${dayName}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error downloading daily schedule Excel:', error);
      alert(t('failedToDownloadDailySchedule'));
    }
  };

  const downloadMonthlyAttendanceExcel = async (attendance, schedule, currentWeek, employees, roles, language, t) => {
    try {
      const workbook = XLSX.utils.book_new();
      
      const employeeLabel = language === 'ja' ? '従業員' : 'Employee';
      const roleLabel = language === 'ja' ? 'ロール' : 'Role';
      const dateLabel = language === 'ja' ? '日付' : 'Date';
      const shiftLabel = language === 'ja' ? 'シフト' : 'Shift';
      const inTimeLabel = language === 'ja' ? '入勤時間' : 'In Time';
      const outTimeLabel = language === 'ja' ? '退勤時間' : 'Out Time';
      const statusLabel = language === 'ja' ? 'ステータス' : 'Status';
      const workedHoursLabel = language === 'ja' ? '勤務時間' : 'Worked Hours';
      const weekLabel = language === 'ja' ? '週' : 'Week';
      
      let attendanceHistory = {};
      try {
        const response = await fetch('/attendance_history.json');
        attendanceHistory = await response.json();
      } catch (e) {
        console.warn('Could not load attendance history');
      }
      
      const weeks = Object.keys(attendanceHistory).sort();
      
      weeks.forEach(weekKey => {
        const attendanceData = [];
        const weekData = attendanceHistory[weekKey];
        
        attendanceData.push([`${weekLabel}: ${weekKey}`]);
        attendanceData.push([]);
        
        attendanceData.push([employeeLabel, roleLabel, dateLabel, shiftLabel, inTimeLabel, outTimeLabel, workedHoursLabel, statusLabel]);
        
        const sortedEmployees = [...employees].sort((a, b) => {
          const roleA = roles.find(r => r.id === a.roleId);
          const roleB = roles.find(r => r.id === b.roleId);
          const roleNameA = roleA?.name || '';
          const roleNameB = roleB?.name || '';
          if (roleNameA !== roleNameB) return roleNameA.localeCompare(roleNameB);
          return a.name.localeCompare(b.name);
        });
        
        sortedEmployees.forEach(emp => {
          const role = roles.find(r => r.id === emp.roleId)?.name || '';
          
          if (weekData[emp.id]) {
            const dates = Object.keys(weekData[emp.id]).sort();
            dates.forEach(date => {
              const record = weekData[emp.id][date];
              
              let workedHours = '';
              if (record.inTime && record.outTime) {
                const [inH, inM] = record.inTime.split(':').map(Number);
                const [outH, outM] = record.outTime.split(':').map(Number);
                let inMin = inH * 60 + inM;
                let outMin = outH * 60 + outM;
                
                if (outMin < inMin) outMin += 24 * 60;
                
                const totalMinutes = outMin - inMin;
                const breakMinutes = role ? (roles.find(r => r.id === emp.roleId)?.breakMinutes || 0) : 0;
                const actualWorkedMinutes = Math.max(0, totalMinutes - breakMinutes);
                const hours = actualWorkedMinutes / 60;
                
                workedHours = hours.toFixed(2);
              }
              
              const shiftName = record.shiftName || 'N/A';
              
              attendanceData.push([
                emp.name,
                role,
                date,
                shiftName,
                record.inTime || '',
                record.outTime || '',
                workedHours,
                record.status || ''
              ]);
            });
          }
        });
        
        attendanceData.push([]);
        const worksheet = XLSX.utils.aoa_to_sheet(attendanceData);
        worksheet['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, worksheet, `${weekLabel} ${weekKey.split('_')[0]}`);
      });
      
      const currentAttendanceData = [];
      currentAttendanceData.push([`${weekLabel}: ${currentWeek[0]} to ${currentWeek[6]}`]);
      currentAttendanceData.push([]);
      currentAttendanceData.push([employeeLabel, roleLabel, dateLabel, shiftLabel, inTimeLabel, outTimeLabel, workedHoursLabel, statusLabel]);
      
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      const sortedEmployees = [...employees].sort((a, b) => {
        const roleA = roles.find(r => r.id === a.roleId);
        const roleB = roles.find(r => r.id === b.roleId);
        const roleNameA = roleA?.name || '';
        const roleNameB = roleB?.name || '';
        if (roleNameA !== roleNameB) return roleNameA.localeCompare(roleNameB);
        return a.name.localeCompare(b.name);
      });
      
      sortedEmployees.forEach(emp => {
        const role = roles.find(r => r.id === emp.roleId)?.name || '';
        
        currentWeek.forEach((date, idx) => {
          const dayName = days[idx];
          const empShifts = schedule[date]?.[emp.id] || [];
          
          empShifts.forEach(shift => {
            const key = `${emp.id}-${date}-${shift.id}`;
            const record = attendance[key];
            
            if (record) {
              let workedHours = '';
              if (record.inTime && record.outTime) {
                const [inH, inM] = record.inTime.split(':').map(Number);
                const [outH, outM] = record.outTime.split(':').map(Number);
                let inMin = inH * 60 + inM;
                let outMin = outH * 60 + outM;
                
                if (outMin < inMin) outMin += 24 * 60;
                
                const totalMinutes = outMin - inMin;
                const breakMinutes = role ? (roles.find(r => r.id === emp.roleId)?.breakMinutes || 0) : 0;
                const actualWorkedMinutes = Math.max(0, totalMinutes - breakMinutes);
                const hours = actualWorkedMinutes / 60;
                
                workedHours = hours.toFixed(2);
              }
              
              currentAttendanceData.push([
                emp.name,
                role,
                date,
                shift.name,
                record.inTime || '',
                record.outTime || '',
                workedHours,
                record.status || ''
              ]);
            }
          });
        });
      });
      
      const currentWorksheet = XLSX.utils.aoa_to_sheet(currentAttendanceData);
      currentWorksheet['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, currentWorksheet, `${weekLabel} ${currentWeek[0].split('-')[0]}`);
      
      const fileName = language === 'ja' 
        ? `月間出勤記録_${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}.xlsx`
        : `monthly-attendance_${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error downloading monthly attendance Excel:', error);
      alert(t('failedToDownloadAttendance'));
    }
  };

  return {
    downloadSchedulePDF,
    downloadScheduleExcel,
    downloadAttendanceExcel,
    downloadDailySchedulePDF,
    downloadRoleSchedulePDF,
    downloadDailyScheduleExcel,
    downloadMonthlyAttendanceExcel
  };
};
