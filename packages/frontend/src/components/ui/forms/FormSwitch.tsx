import { FormFieldProps, FormFieldWrapper } from "./FormField";
import { Switch } from "../Switch";
import { ReactNode } from "react";

interface FormSwitchProps extends FormFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  description?: string;
  tooltipContent?: ReactNode;
}

export function FormSwitch({
  label,
  error,
  checked,
  onCheckedChange,
  description,
  disabled,
  tooltipContent,
  ...props
}: FormSwitchProps) {
  return (
    <FormFieldWrapper
      label={label}
      error={error}
      id={props.id}
      tooltipContent={tooltipContent}
    >
      <div className="flex items-center h-[38px]">
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          {...props}
        />
        {description && (
          <span className="text-sm text-gray-600 ml-2">{description}</span>
        )}
      </div>
    </FormFieldWrapper>
  );
}
