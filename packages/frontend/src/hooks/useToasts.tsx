// TODO: Rename these toast notifications to avoid confusion with the DB-based notifications
import { create, StateCreator } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
}

type Middlewares = [["zustand/devtools", never], ["zustand/immer", never]];

interface ToastsSlice {
  toasts: {
    items: Toast[];
    addToast: (toast: Omit<Toast, "id">) => void;
    removeToast: (id: string) => void;
  };
}

type StoreState = ToastsSlice;

const createToastsSlice: StateCreator<
  StoreState,
  Middlewares,
  [],
  ToastsSlice
> = (set) => ({
  toasts: {
    items: [],
    addToast: (toast) => {
      const id = Math.random().toString(36).substr(2, 9);
      set((state) => {
        state.toasts.items.push({ ...toast, id });
      });

      // Automatically remove notification after 5 seconds
      setTimeout(() => {
        set((state) => {
          state.toasts.items = state.toasts.items.filter((n) => n.id !== id);
        });
      }, 5000);
    },
    removeToast: (id) =>
      set((state) => {
        state.toasts.items = state.toasts.items.filter((n) => n.id !== id);
      }),
  },
});

export const useToastsStore = create<StoreState>()(
  devtools(
    immer((...a) => ({
      ...createToastsSlice(...a),
    }))
  )
);

// Hook for consuming toasts
export function useToasts() {
  const { items, addToast, removeToast } = useToastsStore(
    (state) => state.toasts
  );

  return {
    toasts: items,
    addToast,
    removeToast,
  };
}

// Toasts UI Component
export function ToastsContainer() {
  const { toasts, removeToast } = useToasts();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded-lg shadow-lg max-w-sm ${
            toast.type === "success"
              ? "bg-green-100 text-green-800"
              : toast.type === "error"
              ? "bg-red-100 text-red-800"
              : toast.type === "warning"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{toast.title}</h3>
              <p className="text-sm mt-1">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
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
