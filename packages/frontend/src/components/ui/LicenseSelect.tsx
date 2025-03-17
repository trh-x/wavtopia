import React, { useState } from "react";
import type { License } from "@wavtopia/core-storage";
import { LicenseGrid } from "./license/LicenseGrid";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./Tooltip";
import { cn } from "@/utils/cn";

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
  const [showAllDetails, setShowAllDetails] = useState(false);
  const selectedLicense = licenses?.find((l) => l.id === value);
  const recommendedLicense = licenses?.find((l) => l.type === "CC_BY_NC_SA");

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-gray-700">
              License {required && <span className="text-red-500">*</span>}
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center"
                >
                  <svg
                    className="w-4 h-4 text-gray-400 hover:text-gray-600"
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
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-900 text-white p-3 rounded-lg shadow-lg">
                <p className="font-medium mb-1">Why choose a license?</p>
                <p className="text-sm">
                  A license determines how others can use your music. The
                  recommended Creative Commons license (CC BY-NC-SA) allows
                  sharing and remixing while protecting your commercial rights.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {!value && recommendedLicense && (
            <button
              type="button"
              onClick={() => onChange(recommendedLicense.id)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Use recommended license
            </button>
          )}
        </div>

        <LicenseGrid
          licenses={licenses}
          selectedLicenseId={value}
          onLicenseSelect={onChange}
          className={disabled ? "opacity-50 pointer-events-none" : ""}
        />

        {selectedLicense ? (
          <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">License Details</h4>
              <p className="text-sm text-gray-600">
                {selectedLicense.description}
              </p>
            </div>

            {selectedLicense.usageRestrictions && (
              <div className="space-y-1">
                <h4 className="font-medium text-gray-900">
                  Usage Restrictions
                </h4>
                <p className="text-sm text-blue-600">
                  {selectedLicense.usageRestrictions}
                </p>
              </div>
            )}

            <div
              className={cn(
                "space-y-3 overflow-hidden transition-all duration-200",
                showAllDetails
                  ? "max-h-[500px] opacity-100"
                  : "max-h-0 opacity-0"
              )}
            >
              {selectedLicense.customTerms && (
                <div className="space-y-1">
                  <h4 className="font-medium text-gray-900">
                    Additional Terms
                  </h4>
                  <p className="text-sm text-gray-600">
                    {selectedLicense.customTerms}
                  </p>
                </div>
              )}

              {selectedLicense.creditFormat && (
                <div className="space-y-1">
                  <h4 className="font-medium text-gray-900">
                    Required Attribution
                  </h4>
                  <div className="text-sm text-gray-600 font-mono bg-white p-2 rounded border border-gray-200">
                    {selectedLicense.creditFormat
                      .replace("{title}", "<your track title>")
                      .replace("{artist}", "<your name>")}
                  </div>
                </div>
              )}
            </div>

            {(selectedLicense.customTerms || selectedLicense.creditFormat) && (
              <button
                type="button"
                onClick={() => setShowAllDetails(!showAllDetails)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                {showAllDetails ? (
                  <>
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
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                    Show less
                  </>
                ) : (
                  <>
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
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    Show more details
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-blue-800 font-medium mb-1">
                  Choose how others can use your music
                </p>
                <p className="text-sm text-blue-600">
                  Consider choosing a Creative Commons license to allow others
                  to remix and build upon your work. This helps foster
                  collaboration and enables other artists to legally use your
                  stems in their projects while ensuring you get proper credit.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
