import { useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
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

  return (
    <div className="text-sm flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
      <span>License: {displayType}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild onMouseEnter={loadLicenseDetails}>
            <button className="inline-flex items-center hover:text-gray-900 dark:hover:text-gray-200">
              <InformationCircleIcon className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {isLoading ? (
              <div className="animate-pulse">Loading...</div>
            ) : license ? (
              <div className="space-y-2 text-sm">
                {licenseType !== "ALL_RIGHTS_RESERVED" && (
                  <p className="font-medium">{license.name}</p>
                )}
                <p>{license.description}</p>
                <div className="text-xs">
                  Commercial use:{" "}
                  {license.allowsCommercialUse ? "Allowed" : "Not allowed"}
                </div>
              </div>
            ) : (
              <div>License details unavailable</div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
