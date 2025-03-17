import React from "react";
import type { License } from "@wavtopia/core-storage";
import { LicenseBuilder } from "./license/LicenseBuilder";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./Tooltip";
import { FormFieldWrapper } from "./forms/FormField";

interface LicenseSelectProps {
  value?: string;
  onChange: (value: string) => void;
  licenses?: License[];
  disabled?: boolean;
  required?: boolean;
}

export function LicenseSelect({
  value,
  onChange,
  licenses,
  disabled,
  required,
}: LicenseSelectProps) {
  return (
    <FormFieldWrapper
      label="License"
      required={required}
      tooltipContent={
        <>
          <p className="font-medium mb-1">Why choose a license?</p>
          <p className="text-sm">
            A license determines how others can use your music. The recommended
            Creative Commons license allows sharing and remixing while
            protecting your commercial rights.
          </p>
        </>
      }
    >
      <div className="space-y-4">
        <LicenseBuilder
          licenses={licenses}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    </FormFieldWrapper>
  );
}
