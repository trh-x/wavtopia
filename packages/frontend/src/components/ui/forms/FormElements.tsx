export function FormError({ message }: { message: string }) {
  return (
    <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
      {message}
    </div>
  );
}

export function FormButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
    >
      {children}
    </button>
  );
}
