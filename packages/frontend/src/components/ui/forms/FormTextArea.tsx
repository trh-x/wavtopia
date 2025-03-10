import { TextareaHTMLAttributes } from "react";
import { FormFieldProps, FormFieldWrapper } from "./FormField";
import { cn } from "../../../utils/cn";

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
