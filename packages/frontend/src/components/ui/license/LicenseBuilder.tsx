import React, { useState, useEffect, useRef } from "react";
import type { License, LicenseType } from "@wavtopia/core-storage";
import { cn } from "@/utils/cn";

interface LicenseOptionProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  recommended?: boolean;
  children?: React.ReactNode;
}

function LicenseOption({
  selected,
  onClick,
  title,
  description,
  recommended,
  children,
}: LicenseOptionProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-lg border cursor-pointer transition-all overflow-hidden",
        selected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-colors",
                selected
                  ? "border-blue-500 bg-blue-500"
                  : "border-gray-300 bg-white"
              )}
            >
              {selected && (
                <div className="w-full h-full rounded-full bg-white scale-[0.4]" />
              )}
            </div>
          </div>
          <div className="flex-grow">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-gray-900">{title}</h3>
              {recommended && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Recommended
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">{description}</p>
          </div>
        </div>
      </div>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200",
          children ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: ToggleProps) {
  return (
    <div
      className="flex items-start gap-3"
      onClick={() => !disabled && onChange(!checked)}
    >
      <div className="flex-shrink-0 mt-1">
        <div
          className={cn(
            "relative w-8 h-4 rounded-full transition-colors",
            checked ? "bg-blue-500" : "bg-gray-200",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform",
              checked && "translate-x-4"
            )}
          />
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-600">{description}</div>
      </div>
    </div>
  );
}

interface LicenseBuilderProps {
  licenses?: License[];
  value?: string;
  onChange: (licenseId: string) => void;
  disabled?: boolean;
}

// Helper function to find a license by ID or type
function findLicense(licenses: License[] | undefined, idOrType: string) {
  if (!licenses) return undefined;
  return licenses.find((l) => l.id === idOrType || l.type === idOrType);
}

export function LicenseBuilder({
  licenses,
  value,
  onChange,
  disabled,
}: LicenseBuilderProps) {
  const isInternalUpdate = useRef(false);

  const license = value ? findLicense(licenses, value) : null;

  console.log(license?.name);

  const [licenseType, setLicenseType] = useState<"cc" | "reserved" | null>(
    () => {
      if (!license) return null;
      return license.type === "ALL_RIGHTS_RESERVED" ? "reserved" : "cc";
    }
  );
  const [allowCommercial, setAllowCommercial] = useState(false);
  const [requireShareAlike, setRequireShareAlike] = useState(true);

  // Initialize state from value prop
  useEffect(() => {
    if (!licenses || !value || isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    if (!license) return;

    if (license.type === "ALL_RIGHTS_RESERVED") {
      setLicenseType("reserved");
    } else {
      setLicenseType("cc");
      setAllowCommercial(license.allowsCommercialUse);
      setRequireShareAlike(license.type.includes("SA"));
    }
  }, [value, licenses]);

  // Handle internal state changes
  const updateLicense = () => {
    if (!licenses) return;

    let targetType: LicenseType;
    if (licenseType === "reserved") {
      targetType = "ALL_RIGHTS_RESERVED";
    } else if (allowCommercial) {
      targetType = requireShareAlike ? "CC_BY_SA" : "CC_BY";
    } else {
      targetType = requireShareAlike ? "CC_BY_NC_SA" : "CC_BY_NC";
    }

    const license = findLicense(licenses, targetType);
    if (license) {
      isInternalUpdate.current = true;
      onChange(license.id);
    }
  };

  // Custom handlers for state changes
  const handleLicenseTypeChange = (type: "cc" | "reserved") => {
    setLicenseType(type);
    // Update immediately for better UX
    if (type === "reserved") {
      const reservedLicense = findLicense(licenses, "ALL_RIGHTS_RESERVED");
      if (reservedLicense) {
        isInternalUpdate.current = true;
        onChange(reservedLicense.id);
      }
    } else {
      updateLicense();
    }
  };

  const handleAllowCommercialChange = (checked: boolean) => {
    setAllowCommercial(checked);
    setTimeout(updateLicense, 0);
  };

  const handleRequireShareAlikeChange = (checked: boolean) => {
    setRequireShareAlike(checked);
    setTimeout(updateLicense, 0);
  };

  return (
    <>
      <div className="space-y-3">
        <LicenseOption
          selected={licenseType === "cc"}
          onClick={() => !disabled && handleLicenseTypeChange("cc")}
          title="Creative Commons"
          description="Allow others to use your work under certain conditions"
          recommended
        >
          {licenseType === "cc" && (
            <div className="space-y-3">
              <Toggle
                label="Require attribution"
                description="Others must give you credit when using your work"
                checked={true}
                onChange={() => {}}
                disabled={true}
              />
              <Toggle
                label="Require share-alike"
                description="Others must share their work under the same terms"
                checked={requireShareAlike}
                onChange={handleRequireShareAlikeChange}
                disabled={disabled}
              />
              <Toggle
                label="Allow commercial use"
                description="Others can use your work for commercial purposes"
                checked={allowCommercial}
                onChange={handleAllowCommercialChange}
                disabled={disabled}
              />
            </div>
          )}
        </LicenseOption>

        <LicenseOption
          selected={licenseType === "reserved"}
          onClick={() => !disabled && handleLicenseTypeChange("reserved")}
          title="All Rights Reserved"
          description="Retain all rights to your work. Others must ask for permission to use it."
        />
      </div>

      {license && (
        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="font-medium mb-1">Selected License:</div>
          {license.description}
        </div>
      )}
    </>
  );
}
