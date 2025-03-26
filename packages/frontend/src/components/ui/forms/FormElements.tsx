export function FormError({ message }: { message: string }) {
  return (
    <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
      {message}
    </div>
  );
}

export function FormButton({
  children,
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`w-full py-2 px-4 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
        disabled
          ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
          : "bg-primary-600 text-white hover:bg-primary-700"
      } ${className || ""}`}
    >
      {children}
    </button>
  );
}
