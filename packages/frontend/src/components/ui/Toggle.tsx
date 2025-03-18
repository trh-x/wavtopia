import { cn } from "@/utils/cn";

interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface ToggleProps<T extends string> {
  value: T;
  options: ToggleOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
}

export function Toggle<T extends string>({
  value,
  options,
  onChange,
  className = "",
  disabled,
}: ToggleProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border p-1 text-sm",
        disabled ? "border-gray-100 bg-gray-50" : "border-gray-200",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={(e) => {
            e.preventDefault();
            if (!disabled) {
              onChange(option.value);
            }
          }}
          disabled={disabled}
          className={cn(
            "relative rounded-md px-3 py-1.5 transition-colors duration-200",

            // Selected state styles
            value === option.value && {
              // Selected + Disabled
              "bg-gray-200 text-gray-500": disabled,
              // Selected + Enabled
              "bg-primary-600 text-white": !disabled,
            },

            // Unselected state styles
            value !== option.value && {
              // Unselected + Disabled
              "text-gray-400": disabled,
              // Unselected + Enabled
              "text-gray-600 hover:text-gray-900": !disabled,
            },

            // Disabled cursor
            disabled && "cursor-not-allowed"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
