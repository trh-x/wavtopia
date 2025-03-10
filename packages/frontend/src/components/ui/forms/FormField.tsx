import { ReactNode } from "react";
import { cn } from "../../../utils/cn";

export interface FormFieldProps {
  label: string;
  error?: string;
  id?: string;
}

interface FormFieldWrapperProps extends FormFieldProps {
  children: ReactNode;
  className?: string;
}

export function FormFieldWrapper({
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
