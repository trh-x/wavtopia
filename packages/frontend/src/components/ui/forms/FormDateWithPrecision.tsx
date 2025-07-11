import { ChangeEvent } from "react";
import { FormFieldProps, FormFieldWrapper } from "./FormField";
import { FormInput } from "./FormInput";
import { Toggle } from "../Toggle";

// TODO: Retrieve from core-storage
export type DatePrecision = "YEAR" | "MONTH" | "DAY";

interface FormDateWithPrecisionProps extends Omit<FormFieldProps, "label"> {
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  precision: DatePrecision;
  onPrecisionChange: (precision: DatePrecision) => void;
  label?: string;
  dateLabel?: string;
  precisionLabel?: string;
  max?: string;
}

// Note: Date rounding based on precision is handled at the API level.
// This component only handles display and input collection.
export function FormDateWithPrecision({
  value,
  onChange,
  precision,
  onPrecisionChange,
  label = "Release Date",
  dateLabel,
  precisionLabel,
  error,
  max,
  id,
  disabled,
}: FormDateWithPrecisionProps) {
  const getDateInputType = () => {
    switch (precision) {
      case "YEAR":
        return "number";
      case "MONTH":
        return "month";
      case "DAY":
      default:
        return "date";
    }
  };

  const formatDateValue = () => {
    if (!value) return "";
    const date = new Date(value);
    switch (precision) {
      case "YEAR":
        return date.getFullYear().toString();
      case "MONTH":
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
      case "DAY":
      default:
        return date.toISOString().split("T")[0];
    }
  };

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (!inputValue) {
      onChange(undefined);
      return;
    }

    let date: Date;
    switch (precision) {
      case "YEAR":
        // We can't use new Date(parseInt(inputValue, 10)) because it
        // prevents the user from deleting from a 3 digit year.
        date = new Date();
        date.setFullYear(parseInt(inputValue, 10));
        date.setMonth(0);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        break;
      case "MONTH":
        const [year, month] = inputValue.split("-").map(Number);
        date = new Date(year, month - 1, 1);
        break;
      case "DAY":
      default:
        date = new Date(inputValue);
        break;
    }

    // Don't allow future dates if max is provided
    if (max && date > new Date(max)) {
      return;
    }

    onChange(date);
  };

  const formatMaxDate = () => {
    if (!max) return undefined;
    const maxDate = new Date(max);
    switch (precision) {
      case "YEAR":
        return maxDate.getFullYear().toString();
      case "MONTH":
        return `${maxDate.getFullYear()}-${String(
          maxDate.getMonth() + 1
        ).padStart(2, "0")}`;
      case "DAY":
      default:
        return max;
    }
  };

  return (
    <FormFieldWrapper label={label} error={error} id={id}>
      <div className="flex gap-4 items-start">
        <div className="flex-1">
          <FormInput
            id={id ? `${id}-date` : undefined}
            type={getDateInputType()}
            value={formatDateValue()}
            max={formatMaxDate()}
            onChange={handleDateChange}
            onWheel={(e) => {
              // Prevent scroll wheel from changing number input value
              if (precision === "YEAR") {
                e.currentTarget.blur();
              }
            }}
            label={dateLabel}
            disabled={disabled}
            placeholder={precision === "YEAR" ? "yyyy" : undefined}
          />
        </div>
        <div className="flex-1">
          <FormFieldWrapper label={precisionLabel}>
            <Toggle
              value={precision}
              options={[
                { value: "DAY", label: "Day" },
                { value: "MONTH", label: "Month" },
                { value: "YEAR", label: "Year" },
              ]}
              onChange={onPrecisionChange}
              disabled={disabled}
            />
          </FormFieldWrapper>
        </div>
      </div>
    </FormFieldWrapper>
  );
}
