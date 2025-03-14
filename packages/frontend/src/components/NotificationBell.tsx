import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthToken } from "@/hooks/useAuthToken";
import { api } from "@/api/client";
import { Prisma } from "@wavtopia/core-storage";
import {
  HeaderDropdownTrigger,
  HeaderDropdownMenu,
  HeaderDropdownItem,
} from "./ui/HeaderDropdown";
import { useHeaderDropdown } from "@/contexts/HeaderDropdownContext";

type Notification = Prisma.NotificationGetPayload<{}>;

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();
  const { getToken } = useAuthToken();
  const navigate = useNavigate();
  const { openDropdownId } = useHeaderDropdown();
  const isOpen = openDropdownId === "notifications";

  useEffect(() => {
    if (!user) return;
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

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
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const handleViewAll = () => {
    navigate("/notifications");
  };

  if (!user) return null;

  return (
    <>
      <HeaderDropdownTrigger
        id="notifications"
        trigger={
          <button className="relative p-2 hover:text-primary-200 rounded-full">
            <span className="sr-only">View notifications</span>
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
        }
      />
      <HeaderDropdownMenu id="notifications">
        <div className="w-full max-w-[380px] max-h-[calc(100vh-80px)] flex flex-col">
          {unreadCount > 0 && (
            <div className="p-3 sm:p-4 border-b border-primary-700 flex-none">
              <div className="flex justify-between items-center">
                <h3 className="text-sm sm:text-base font-semibold">
                  Notifications
                </h3>
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-primary-200 hover:text-primary-100"
                >
                  Mark all as read
                </button>
              </div>
            </div>
          )}
          <div className="overflow-y-auto min-h-0 flex-1">
            {notifications.length === 0 ? (
              <div className="p-3 sm:p-4 text-center text-gray-300 text-xs">
                No new notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 sm:p-4 border-b border-primary-700"
                >
                  <div className="flex justify-between items-start gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium">
                        {notification.title}
                      </h4>
                      <p className="text-xs text-gray-300 break-words">
                        {notification.message}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-primary-200 hover:text-primary-100 p-1 rounded-full hover:bg-primary-700/50"
                        title="Mark as read"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <HeaderDropdownItem onClick={handleViewAll}>
            View all notifications
          </HeaderDropdownItem>
        </div>
      </HeaderDropdownMenu>
    </>
  );
}
