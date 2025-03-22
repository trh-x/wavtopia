import { useState } from "react";
import { api } from "../../api/client";
import { ControlledTooltip, TooltipContent, TooltipLink } from "../ui/Tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/utils/cn";
import { Track } from "@/types";

interface LicenseInfoProps {
  track: Track;
  showText?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function LicenseInfo({
  track,
  showText = true,
  size = "md",
  className,
}: LicenseInfoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const isOwner = user?.id === track.userId;

  const { data: license, isLoading } = useQuery({
    queryKey: ["license", track.licenseId],
    queryFn: () => api.licenses.get(track.licenseId!),
    enabled: isOpen && !!track.licenseId,
  });

  if (!track.licenseType) return null;

  const isCreativeCommons = track.licenseType.startsWith("CC_");

  // Convert license type to more readable format
  const displayType =
    track.licenseType === "ALL_RIGHTS_RESERVED"
      ? "All Rights Reserved"
      : "Creative Commons";

  const getLicenseUrl = (type: string) => {
    // Convert CC_BY_NC_SA to by-nc-sa
    const urlPath = type.toLowerCase().replace(/_/g, "-").substring(3);
    return `https://creativecommons.org/licenses/${urlPath}/4.0/`;
  };

  return (
    <ControlledTooltip onOpenChange={setIsOpen}>
      <button
        type="button"
        className={cn(
          "flex items-center gap-1.5 text-gray-400 hover:text-gray-300 transition-colors",
          showText ? "text-sm" : "",
          className
        )}
      >
        {isCreativeCommons ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={cn(
              "flex-shrink-0",
              size === "sm" ? "w-3 h-3" : "w-4 h-4"
            )}
          >
            <path
              fillRule="evenodd"
              d="M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l4.122 4.12A1.5 1.5 0 0117 7.622V16.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 16.5v-13zm10.857 5.691a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={cn(
              "flex-shrink-0",
              size === "sm" ? "w-3 h-3" : "w-4 h-4"
            )}
          >
            <path
              fillRule="evenodd"
              d="M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.5.5 0 01.479.425c.069.52.104 1.05.104 1.59 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 01-.332 0C5.26 16.564 2 12.163 2 7c0-.538.035-1.069.104-1.589a.5.5 0 01.48-.425 11.947 11.947 0 007.077-2.75zm4.196 5.954a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {showText && <span>{displayType}</span>}
      </button>
      <TooltipContent side="top" className="max-w-xs">
        {isLoading ? (
          <div className="animate-pulse">Loading...</div>
        ) : license ? (
          <div className="space-y-2 text-sm">
            {track.licenseType !== "ALL_RIGHTS_RESERVED" && (
              <>
                <p className="font-medium">{license.name}</p>
                <TooltipLink
                  to={getLicenseUrl(track.licenseType)}
                  external
                  className="text-xs"
                >
                  View full license text
                </TooltipLink>
              </>
            )}
            <p>{isOwner ? license.description : license.usageDescription}</p>
          </div>
        ) : (
          <div>License details unavailable</div>
        )}
      </TooltipContent>
    </ControlledTooltip>
  );
}
