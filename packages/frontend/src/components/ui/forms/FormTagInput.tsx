import { InputHTMLAttributes, KeyboardEvent, useState } from "react";
import { FormFieldProps, FormFieldWrapper } from "./FormField";
import { cn } from "../../../utils/cn";

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
