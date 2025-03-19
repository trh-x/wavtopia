import { useState } from "react";
import {
  ShieldCheckIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";
import { cn } from "../../utils/cn";
import { api } from "../../api/client";
import { License } from "/Users/snarf/git-public/trh-x/wavtopia/packages/frontend/src/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/Tooltip";

interface LicenseInfoProps {
  licenseType: string | null;
  licenseId: string | null;
}

export function LicenseInfo({ licenseType, licenseId }: LicenseInfoProps) {
  const [license, setLicense] = useState<License | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadLicenseDetails = async () => {
    if (licenseId && !license && !isLoading) {
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
  };

  if (!licenseType) return null;

  // Convert license type to more readable format
  const displayType =
    licenseType === "ALL_RIGHTS_RESERVED"
      ? "All Rights Reserved"
      : "Creative Commons";

  const getLicenseUrl = (type: string) => {
    // Convert CC_BY_NC_SA to by-nc-sa
    const urlPath = type.toLowerCase().replace(/_/g, "-").substring(3);
    return `https://creativecommons.org/licenses/${urlPath}/4.0/`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild onMouseEnter={loadLicenseDetails}>
          <button className="text-sm flex items-center gap-1.5 text-gray-400 hover:text-gray-300 transition-colors">
            <ShieldCheckIcon className="w-4 h-4 flex-shrink-0" />
            <span>{displayType}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {isLoading ? (
            <div className="animate-pulse">Loading...</div>
          ) : license ? (
            <div className="space-y-2 text-sm">
              {licenseType !== "ALL_RIGHTS_RESERVED" && (
                <>
                  <p className="font-medium">{license.name}</p>
                  <a
                    href={getLicenseUrl(license.type)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View full license text
                  </a>
                </>
              )}
              <p>{license.usageDescription}</p>
            </div>
          ) : (
            <div>License details unavailable</div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
