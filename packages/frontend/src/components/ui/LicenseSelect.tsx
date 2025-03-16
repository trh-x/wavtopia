import React from "react";
import type { License } from "@wavtopia/core-storage";
import { LicenseGrid } from "./license/LicenseGrid";

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
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <label className="block text-sm font-medium text-gray-700">
          License {required && <span className="text-red-500">*</span>}
        </label>
        {!value && (
          <span className="text-sm text-gray-500">
            Please select a license for your track
          </span>
        )}
      </div>

      <LicenseGrid
        licenses={licenses}
        selectedLicenseId={value}
        onLicenseSelect={onChange}
        className={disabled ? "opacity-50 pointer-events-none" : ""}
      />

      {selectedLicense ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-600">{selectedLicense.description}</p>
          {selectedLicense.usageRestrictions && (
            <p className="text-sm text-blue-600">
              {selectedLicense.usageRestrictions}
            </p>
          )}
          {selectedLicense.customTerms && (
            <p className="text-sm text-gray-600">
              {selectedLicense.customTerms}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
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
