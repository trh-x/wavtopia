import { InputHTMLAttributes } from "react";
import { FormFieldProps, FormFieldWrapper } from "./FormField";
import { cn } from "../../../utils/cn";

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
