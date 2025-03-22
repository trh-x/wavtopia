import { ReactNode } from "react";
import { cn } from "../../../utils/cn";
import { ControlledTooltip, TooltipContent } from "../Tooltip";

export interface FormFieldProps {
  label?: string;
  error?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
}

interface FormFieldWrapperProps extends FormFieldProps {
  children: ReactNode;
  className?: string;
  tooltipContent?: ReactNode;
}

export function FormFieldWrapper({
  label,
  error,
  id,
  children,
  className,
  required,
  tooltipContent,
}: FormFieldWrapperProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
            {required && (
              <>
                {" "}
                <span className="text-red-500 font-normal">*</span>
              </>
            )}
          </label>
        )}
        {tooltipContent && (
          <ControlledTooltip>
            <button
              type="button"
              className="inline-flex items-center justify-center text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
            <TooltipContent>{tooltipContent}</TooltipContent>
          </ControlledTooltip>
        )}
      </div>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
