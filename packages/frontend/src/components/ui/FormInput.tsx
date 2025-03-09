import {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
  KeyboardEvent,
  useState,
} from "react";
import { Switch } from "./Switch";
import { cn } from "../../utils/cn";

interface FormFieldProps {
  label: string;
  error?: string;
  id?: string;
}

interface FormFieldWrapperProps extends FormFieldProps {
  children: ReactNode;
  className?: string;
}

function FormFieldWrapper({
  label,
  error,
  id,
  children,
  className,
}: FormFieldWrapperProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface FormInputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    FormFieldProps {}

export function FormInput({
  label,
  error,
  className = "",
  ...props
}: FormInputProps) {
  return (
    <FormFieldWrapper label={label} error={error} id={props.id}>
      <input
        {...props}
        className={cn(
          "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent",
          error && "border-red-500",
          className
        )}
      />
    </FormFieldWrapper>
  );
}

interface FormTextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    FormFieldProps {}

export function FormTextArea({
  label,
  error,
  className = "",
  ...props
}: FormTextAreaProps) {
  return (
    <FormFieldWrapper label={label} error={error} id={props.id}>
      <textarea
        {...props}
        className={cn(
          "block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm",
          error && "border-red-500",
          className
        )}
      />
    </FormFieldWrapper>
  );
}

interface FormSwitchProps extends FormFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  description?: string;
}

export function FormSwitch({
  label,
  error,
  checked,
  onCheckedChange,
  description,
  ...props
}: FormSwitchProps) {
  return (
    <FormFieldWrapper label={label} error={error} id={props.id}>
      <div className="flex items-center h-[38px]">
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          {...props}
        />
        {description && (
          <span className="text-sm text-gray-600 ml-2">{description}</span>
        )}
      </div>
    </FormFieldWrapper>
  );
}

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

interface FormTagInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  label: string;
  error?: string;
  value: string[];
  onChange: (value: string[]) => void;
}

export function FormTagInput({
  label,
  error,
  value,
  onChange,
  className = "",
  placeholder,
  ...props
}: FormTagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      if (inputValue.trim()) {
        onChange([...value, inputValue.trim()]);
        setInputValue("");
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      // Remove the last tag when backspace is pressed on empty input
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <FormFieldWrapper label={label} error={error} id={props.id}>
      <div
        className={cn(
          "flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent",
          error && "border-red-500",
          className
        )}
      >
        {value.map((tag, index) => (
          <span
            key={index}
            className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </span>
        ))}
        <input
          {...props}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue.trim()) {
              onChange([...value, inputValue.trim()]);
              setInputValue("");
            }
          }}
          className="flex-1 min-w-[100px] outline-none border-none p-1 text-sm focus:ring-0"
          placeholder={value.length === 0 ? placeholder : undefined}
        />
      </div>
    </FormFieldWrapper>
  );
}
