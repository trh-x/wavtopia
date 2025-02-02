interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface ToggleProps<T extends string> {
  value: T;
  options: [ToggleOption<T>, ToggleOption<T>];
  onChange: (value: T) => void;
  className?: string;
}

export function Toggle<T extends string>({
  value,
  options,
  onChange,
  className = "",
}: ToggleProps<T>) {
  return (
    <div
      className={`inline-flex rounded-lg border border-gray-200 p-1 text-sm ${className}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`relative rounded-md px-3 py-1.5 transition-colors duration-200 ${
            value === option.value
              ? "bg-primary-600 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
