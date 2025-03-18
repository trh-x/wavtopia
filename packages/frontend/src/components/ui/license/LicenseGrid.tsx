import type { License } from "@wavtopia/core-storage";
import { LicenseCard } from "./LicenseCard";
import { cn } from "@/utils/cn";

interface LicenseGridProps {
  licenses?: License[];
  selectedLicenseId?: string;
  onLicenseSelect: (licenseId: string) => void;
  className?: string;
}

export function LicenseGrid({
  licenses,
  selectedLicenseId,
  onLicenseSelect,
  className,
}: LicenseGridProps) {
  if (!licenses?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
        className
      )}
    >
      {licenses.map((license) => (
        <LicenseCard
          key={license.id}
          license={license}
          selected={license.id === selectedLicenseId}
          onClick={() => onLicenseSelect(license.id)}
        />
      ))}
    </div>
  );
}
