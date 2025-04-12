// TODO: Rename these toast notifications to avoid confusion with the DB-based notifications
import { create, StateCreator } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
}

type Middlewares = [["zustand/devtools", never], ["zustand/immer", never]];

interface NotificationsSlice {
  notifications: {
    items: Notification[];
    addNotification: (notification: Omit<Notification, "id">) => void;
    removeNotification: (id: string) => void;
  };
}

type StoreState = NotificationsSlice;

const createNotificationsSlice: StateCreator<
  StoreState,
  Middlewares,
  [],
  NotificationsSlice
> = (set) => ({
  notifications: {
    items: [],
    addNotification: (notification) => {
      const id = Math.random().toString(36).substr(2, 9);
      set((state) => {
        state.notifications.items.push({ ...notification, id });
      });

      // Automatically remove notification after 5 seconds
      setTimeout(() => {
        set((state) => {
          state.notifications.items = state.notifications.items.filter(
            (n) => n.id !== id
          );
        });
      }, 5000);
    },
    removeNotification: (id) =>
      set((state) => {
        state.notifications.items = state.notifications.items.filter(
          (n) => n.id !== id
        );
      }),
  },
});

export const useNotificationsStore = create<StoreState>()(
  devtools(
    immer((...a) => ({
      ...createNotificationsSlice(...a),
    }))
  )
);

// Hook for consuming notifications
export function useNotifications() {
  const { items, addNotification, removeNotification } = useNotificationsStore(
    (state) => state.notifications
  );

  return {
    notifications: items,
    addNotification,
    removeNotification,
  };
}

// Notifications UI Component
export function NotificationsContainer() {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg shadow-lg max-w-sm ${
            notification.type === "success"
              ? "bg-green-100 text-green-800"
              : notification.type === "error"
              ? "bg-red-100 text-red-800"
              : notification.type === "warning"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{notification.title}</h3>
              <p className="text-sm mt-1">{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
