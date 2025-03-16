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
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-lg border cursor-pointer transition-all",
        "hover:border-blue-500 hover:shadow-md",
        selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white",
        className
      )}
    >
      {/* License Name */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{license.name}</h3>
        {selected && (
          <div className="absolute top-2 right-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
          </div>
        )}
      </div>

      {/* Permission Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <LicensePermissionBadge
          label="Commercial"
          allowed={license.allowsCommercialUse}
        />
        <LicensePermissionBadge
          label="Remixing"
          allowed={license.allowsRemixing}
        />
        <LicensePermissionBadge
          label="Sharing"
          allowed={license.allowsSharing}
        />
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-3">{license.description}</p>

      {/* Usage Restrictions */}
      {license.usageRestrictions && (
        <div className="text-xs text-blue-600">{license.usageRestrictions}</div>
      )}

      {/* Recommended Badge */}
      {license.type === "CC_BY_NC_SA" && (
        <div className="absolute top-0 right-0 -translate-y-1/2 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
          Recommended
        </div>
      )}
    </div>
  );
}
