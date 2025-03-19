import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { cn } from "../../utils/cn";
import { api } from "../../api/client";
import { License } from "/Users/snarf/git-public/trh-x/wavtopia/packages/frontend/src/types";

interface LicenseInfoProps {
  licenseType: string | null;
  licenseId: string | null;
}

export function LicenseInfo({ licenseType, licenseId }: LicenseInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [license, setLicense] = useState<License | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (!isExpanded && licenseId && !license) {
      setIsLoading(true);
      try {
        const details = await api.licenses.get(licenseId);
        setLicense(details);
      } catch (error) {
        console.error("Failed to load license details:", error);
      } finally {
        setIsLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  if (!licenseType) return null;

  return (
    <div className="border-t border-b border-gray-200 dark:border-gray-800">
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{licenseType}</span>
        </div>
        <ChevronDownIcon
          className={cn(
            "w-5 h-5 transition-transform",
            isExpanded ? "transform rotate-180" : ""
          )}
        />
      </button>

      {isExpanded && (
        <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/50">
          {isLoading ? (
            <div className="animate-pulse">Loading license details...</div>
          ) : license ? (
            <div className="space-y-2">
              <p>{license.description}</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Commercial use:{" "}
                  {license.allowsCommercialUse ? "Allowed" : "Not allowed"}
                </li>
              </ul>
            </div>
          ) : (
            <div>Failed to load license details.</div>
          )}
        </div>
      )}
    </div>
  );
}
