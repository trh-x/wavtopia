interface ErrorStateProps {
  message?: string;
  fullPage?: boolean;
  retry?: () => void;
}

export function ErrorState({
  message = "An error occurred",
  fullPage = false,
  retry,
}: ErrorStateProps) {
  const containerClass = fullPage
    ? "min-h-screen flex items-center justify-center"
    : "flex items-center justify-center py-8";

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-4 text-center">
        <svg
          className="w-12 h-12 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="text-gray-600">{message}</div>
        {retry && (
          <button
            onClick={retry}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
