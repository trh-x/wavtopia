import React, { useState } from "react";
import type { License } from "@wavtopia/core-storage";
import { cn } from "@/utils/cn";

interface LicensePermissionBadgeProps {
  label: string;
  allowed: boolean;
  className?: string;
}

function LicensePermissionBadge({
  label,
  allowed,
  className,
}: LicensePermissionBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center px-2 py-1 rounded text-xs font-medium",
        allowed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
        className
      )}
    >
      <span className="mr-1">{allowed ? "✓" : "×"}</span>
      {label}
    </div>
  );
}

interface LicenseCardProps {
  license: License;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function LicenseCard({
  license,
  selected,
  onClick,
  className,
}: LicenseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get credit format example with placeholder values
  const creditExample = license.creditFormat
    ?.replace("{title}", "My Track")
    .replace("{artist}", "Artist Name");

  // Essential permissions that are always shown
  const essentialPermissions = [
    { label: "Commercial Use", allowed: license.allowsCommercialUse },
    { label: "Remixing", allowed: license.allowsRemixing },
    { label: "Sharing", allowed: license.allowsSharing },
  ];

  // Additional permissions shown when expanded
  const additionalPermissions = [
    { label: "Stem Separation", allowed: license.allowsStemSeparation },
    { label: "Stem Sharing", allowed: license.allowsStemSharing },
  ];

  const handleClick = (e: React.MouseEvent) => {
    // If clicking the expand button, don't trigger card selection
    if ((e.target as HTMLElement).closest(".expand-button")) {
      e.stopPropagation();
      return;
    }
    onClick?.();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative p-4 rounded-lg border cursor-pointer transition-all",
        "hover:border-blue-500 hover:shadow-md",
        selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white",
        className
      )}
    >
      {/* License Name and Recommended Badge */}
      <div className="relative">
        {license.type === "CC_BY_NC_SA" && (
          <div className="absolute -top-4 right-0 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Recommended
          </div>
        )}
        <h3 className="text-lg font-semibold text-gray-900 pr-8">
          {license.name}
        </h3>
      </div>

      {/* Selected Checkmark */}
      {selected && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">✓</span>
          </div>
        </div>
      )}

      {/* Description */}
      <p className="text-sm text-gray-600 mt-2 mb-3">{license.description}</p>

      {/* Essential Permission Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        {essentialPermissions.map((permission) => (
          <LicensePermissionBadge
            key={permission.label}
            label={permission.label}
            allowed={permission.allowed}
          />
        ))}
      </div>

      {/* Expandable Section */}
      <div
        className={cn(
          "overflow-hidden transition-all",
          isExpanded ? "max-h-[500px]" : "max-h-0"
        )}
      >
        {/* Additional Permission Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {additionalPermissions.map((permission) => (
            <LicensePermissionBadge
              key={permission.label}
              label={permission.label}
              allowed={permission.allowed}
            />
          ))}
        </div>

        {/* Additional Information */}
        <div className="space-y-2 text-sm">
          {/* Credit Format Example */}
          {creditExample && (
            <div className="p-2 bg-gray-50 rounded border border-gray-200">
              <div className="text-xs font-medium text-gray-500 mb-1">
                Required Attribution Format:
              </div>
              <div className="text-gray-700 font-mono text-xs">
                {creditExample}
              </div>
            </div>
          )}

          {/* Usage Restrictions */}
          {license.usageRestrictions && (
            <div className="text-blue-600 text-xs">
              <span className="font-medium">Important: </span>
              {license.usageRestrictions}
            </div>
          )}

          {/* Custom Terms */}
          {license.customTerms && (
            <div className="text-gray-600 text-xs">
              <span className="font-medium">Additional Terms: </span>
              {license.customTerms}
            </div>
          )}

          {/* Royalty Terms */}
          {license.royaltyTerms && (
            <div className="text-gray-600 text-xs">
              <span className="font-medium">Royalty Terms: </span>
              {license.royaltyTerms}
            </div>
          )}
        </div>
      </div>

      {/* Expand/Collapse Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="expand-button mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
      >
        {isExpanded ? (
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
    </div>
  );
}
