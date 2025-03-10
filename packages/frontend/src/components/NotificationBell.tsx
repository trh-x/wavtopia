import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAuthToken } from "../hooks/useAuthToken";
import { api } from "../api/client";
import { Prisma } from "@wavtopia/core-storage";
import { useNavigate } from "react-router-dom";

type Notification = Prisma.NotificationGetPayload<{}>;

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { getToken } = useAuthToken();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  const loadUnreadCount = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const { count } = await api.notifications.getUnreadCount(token);
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to load unread count:", error);
    }
  };

  const loadNotifications = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const { notifications } = await api.notifications.getNotifications(
        token,
        {
          limit: 5,
          includeRead: false,
        }
      );
      setNotifications(notifications);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  const handleBellClick = async () => {
    if (!isOpen) {
      await loadNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const token = getToken();
      if (!token) return;
      await api.notifications.markAsRead(token, notificationId);
      await loadUnreadCount();
      await loadNotifications();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = getToken();
      if (!token) return;
      await api.notifications.markAllAsRead(token);
      setUnreadCount(0);
      setNotifications([]);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const handleViewAll = () => {
    navigate("/notifications");
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={handleBellClick}
        // className="p-2 hover:bg-primary-500 rounded-full relative transition-colors duration-150"
        className="p-2 hover:text-primary-200 rounded-full relative"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50">
          {unreadCount > 0 && (
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Notifications</h3>
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Mark all as read
                </button>
              </div>
            </div>
          )}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No new notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border-b hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{notification.title}</h4>
                      <p className="text-sm text-gray-600">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t">
            <button
              onClick={handleViewAll}
              className="text-sm text-primary-600 hover:text-primary-700 w-full text-center"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
