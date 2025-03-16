import React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./Select";
import type { License } from "@wavtopia/core-storage";

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
  const selectedLicense = licenses?.find((l) => l.id === value);

  return (
    <div className="space-y-2">
      <label
        htmlFor="license"
        className="block text-sm font-medium text-gray-700"
      >
        License
      </label>
      <Select
        value={value}
        required={required}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a license">
            {selectedLicense && (
              <div className="font-medium text-gray-900">
                {selectedLicense.name}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[min(500px,60vh)] w-[min(calc(100vw-32px),672px)] overflow-y-auto">
          {licenses?.map((license) => (
            <SelectItem
              key={license.id}
              value={license.id}
              className="focus:bg-gray-50"
            >
              <div className="py-2">
                <div className="font-medium text-gray-900">{license.name}</div>
                {license.description && (
                  <div className="text-sm text-gray-500 mt-1.5">
                    {license.description}
                  </div>
                )}
                {(license.usageRestrictions || license.customTerms) && (
                  <div className="text-xs text-blue-600 mt-1.5">
                    {license.usageRestrictions || license.customTerms}
                  </div>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedLicense ? (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-gray-600">{selectedLicense.description}</p>
          {selectedLicense.usageRestrictions && (
            <p className="text-sm text-blue-600">
              {selectedLicense.usageRestrictions}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-gray-600">
            Consider choosing a Creative Commons license to allow others to
            remix and build upon your work. This helps foster collaboration and
            enables other artists to legally use your stems in their projects
            while ensuring you get proper credit.
          </p>
        </div>
      )}
    </div>
  );
}
