import { FormFieldProps, FormFieldWrapper } from "./FormField";
import { Switch } from "../Switch";

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
  disabled,
  ...props
}: FormSwitchProps) {
  return (
    <FormFieldWrapper label={label} error={error} id={props.id}>
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
