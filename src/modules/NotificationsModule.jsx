// Notifications & Messaging Module
import { API_BASE_URL } from '../utils/constants';

export const useNotificationsLogic = () => {
  
  const loadNotifications = async (setNotifications) => {
    try {
      const response = await fetch('/notifications.json');
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.log('No notifications.json found');
    }
  };

  const saveNotifications = async (notificationsData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/save-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: notificationsData })
      });
      if (response.ok) {
        console.log('✅ Notifications saved');
      }
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  };

  const sendMessageToManager = async (notificationForm, currentUser, notifications, setNotifications) => {
    if (!notificationForm.message.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      from: currentUser.name,
      employeeId: currentUser.id,
      message: notificationForm.message,
      timestamp: new Date().toISOString(),
      read: false
    };

    const updatedNotifications = {
      ...notifications,
      messages: [...(notifications.messages || []), newMessage]
    };

    setNotifications(updatedNotifications);
    await saveNotifications(updatedNotifications);
    alert('Message sent successfully!');
  };

  const sendLeaveRequest = async (leaveRequestForm, currentUser, notifications, setNotifications) => {
    const { startDate, endDate, reason } = leaveRequestForm;
    if (!startDate || !endDate || !reason.trim()) {
      alert('Please fill all fields');
      return;
    }

    const newLeaveRequest = {
      id: Date.now().toString(),
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      startDate,
      endDate,
      reason,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    const updatedNotifications = {
      ...notifications,
      leaveRequests: [...(notifications.leaveRequests || []), newLeaveRequest]
    };

    setNotifications(updatedNotifications);
    await saveNotifications(updatedNotifications);
    alert('Leave request submitted!');
  };

  const approveLeaveRequest = async (requestId, notifications, setNotifications, setLeaveRequests) => {
    const request = notifications.leaveRequests.find(r => r.id === requestId);
    if (!request) return;

    const updatedLeaveRequests = notifications.leaveRequests.map(r =>
      r.id === requestId ? { ...r, status: 'approved' } : r
    );

    const updatedNotifications = {
      ...notifications,
      leaveRequests: updatedLeaveRequests
    };

    setNotifications(updatedNotifications);
    await saveNotifications(updatedNotifications);

    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const newLeaveRequests = {};

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const key = `${request.employeeId}-${dateStr}`;
      newLeaveRequests[key] = true;
    }

    setLeaveRequests(newLeaveRequests);

    const approvalNotification = {
      id: `notif-${Date.now()}`,
      from: 'Manager',
      to: request.employeeId,
      message: `Your leave request for ${request.startDate} to ${request.endDate} has been APPROVED.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'leave_approval'
    };
    
    const updatedWithNotif = {
      ...updatedNotifications,
      messages: [...(updatedNotifications.messages || []), approvalNotification]
    };
    setNotifications(updatedWithNotif);
    await saveNotifications(updatedWithNotif);
    
    alert('Leave request approved');
  };

  const rejectLeaveRequest = async (requestId, notifications, setNotifications) => {
    const request = notifications.leaveRequests.find(r => r.id === requestId);
    
    const updatedLeaveRequests = notifications.leaveRequests.map(r =>
      r.id === requestId ? { ...r, status: 'rejected' } : r
    );

    const updatedNotifications = {
      ...notifications,
      leaveRequests: updatedLeaveRequests
    };

    setNotifications(updatedNotifications);
    await saveNotifications(updatedNotifications);
    
    const rejectionNotification = {
      id: `notif-${Date.now()}`,
      from: 'Manager',
      to: request?.employeeId,
      message: `Your leave request for ${request?.startDate} to ${request?.endDate} has been REJECTED.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'leave_rejection'
    };
    
    const updatedWithNotif = {
      ...updatedNotifications,
      messages: [...(updatedNotifications.messages || []), rejectionNotification]
    };
    setNotifications(updatedWithNotif);
    await saveNotifications(updatedWithNotif);
    
    alert('Leave request rejected');
  };

  const deleteMessage = async (messageId, notifications, setNotifications) => {
    const updatedMessages = notifications.messages.filter(m => m.id !== messageId);
    const updatedNotifications = {
      ...notifications,
      messages: updatedMessages
    };

    setNotifications(updatedNotifications);
    await saveNotifications(updatedNotifications);
  };

  const deleteLeaveRequest = async (requestId, notifications, setNotifications) => {
    const updatedLeaveRequests = notifications.leaveRequests.filter(r => r.id !== requestId);
    const updatedNotifications = {
      ...notifications,
      leaveRequests: updatedLeaveRequests
    };

    setNotifications(updatedNotifications);
    await saveNotifications(updatedNotifications);
  };

  const sendManagerNotification = async (employeeId, message, notifications, setNotifications) => {
    const notification = {
      id: `notif-${Date.now()}`,
      from: 'Manager',
      to: employeeId,
      message: message,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'manager_message'
    };
    
    const updatedNotifications = {
      ...notifications,
      messages: [...(notifications.messages || []), notification]
    };
    setNotifications(updatedNotifications);
    await saveNotifications(updatedNotifications);
  };

  return {
    loadNotifications,
    saveNotifications,
    sendMessageToManager,
    sendLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    deleteMessage,
    deleteLeaveRequest,
    sendManagerNotification
  };
};
