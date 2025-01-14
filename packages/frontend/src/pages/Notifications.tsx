import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAuthToken } from "../hooks/useAuthToken";
import { api } from "../api/client";
import { Prisma } from "@wavtopia/core-storage";
import { LoadingState } from "../components/ui/LoadingState";
import { ErrorState } from "../components/ui/ErrorState";
import { Button } from "../components/ui/Button";

type Notification = Prisma.NotificationGetPayload<{}>;

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [includeRead, setIncludeRead] = useState(false);
  const { user } = useAuth();
  const { getToken } = useAuthToken();
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadNotifications();
  }, [page, includeRead]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) return;

      const { notifications: newNotifications } =
        await api.notifications.getNotifications(token, {
          limit: ITEMS_PER_PAGE,
          offset: (page - 1) * ITEMS_PER_PAGE,
          includeRead,
        });

      setNotifications(newNotifications);
      setHasMore(newNotifications.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Failed to load notifications:", error);
      setError("Failed to load notifications. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const token = getToken();
      if (!token) return;
      await api.notifications.markAsRead(token, notificationId);
      // Update the notification in the list
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = getToken();
      if (!token) return;
      await api.notifications.markAllAsRead(token);
      // Update all notifications in the list
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  if (!user) {
    return <ErrorState message="Please log in to view notifications" />;
  }

  if (loading && page === 1) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const hasUnreadNotifications = notifications.some((n) => !n.isRead);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeRead}
              onChange={(e) => {
                setIncludeRead(e.target.checked);
                setPage(1);
              }}
              className="form-checkbox h-4 w-4 text-primary-600"
            />
            <span>Show read notifications</span>
          </label>
          {hasUnreadNotifications && (
            <Button onClick={handleMarkAllAsRead}>Mark all as read</Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No notifications found
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-6 ${
                  !notification.isRead ? "bg-blue-50" : ""
                } hover:bg-gray-50 transition-colors duration-150`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold mb-1">
                      {notification.title}
                    </h3>
                    <p className="text-gray-600 mb-2">{notification.message}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <Button
                      onClick={() => handleMarkAsRead(notification.id)}
                      variant="outline"
                      size="sm"
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between items-center">
        <Button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          variant="outline"
        >
          Previous
        </Button>
        <span className="text-gray-600">Page {page}</span>
        <Button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore}
          variant="outline"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
