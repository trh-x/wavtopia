import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Switch } from "./Switch";

interface FormFieldProps {
  label: string;
  error?: string;
}

interface FormInputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    FormFieldProps {}

interface FormTextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    FormFieldProps {}

interface FormSwitchProps extends FormFieldProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  description?: string;
}

export function FormInput({
  label,
  error,
  className = "",
  ...props
}: FormInputProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={props.id}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <input
        {...props}
        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
          error ? "border-red-500" : ""
        } ${className}`}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function FormTextArea({
  label,
  error,
  className = "",
  ...props
}: FormTextAreaProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={props.id}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <textarea
        {...props}
        className={`block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
          error ? "border-red-500" : ""
        } ${className}`}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
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
    <div className="space-y-1">
      <label
        htmlFor={props.id}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
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
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
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
