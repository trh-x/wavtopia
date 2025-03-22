import { useState } from "react";
import { ShieldCheckIcon } from "@heroicons/react/24/solid";
import { api } from "../../api/client";
import { ControlledTooltip, TooltipContent, TooltipLink } from "../ui/Tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useTrack } from "@/pages/TrackDetails/contexts/TrackContext";
import { useQuery } from "@tanstack/react-query";

export function LicenseInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { track } = useTrack();

  const isOwner = user?.id === track.userId;

  const { data: license, isLoading } = useQuery({
    queryKey: ["license", track.licenseId],
    queryFn: () => api.licenses.get(track.licenseId!),
    enabled: isOpen,
  });

  if (!track.licenseType) return null;

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
        className="text-sm flex items-center gap-1.5 text-gray-400 hover:text-gray-300 transition-colors"
      >
        <ShieldCheckIcon className="w-4 h-4 flex-shrink-0" />
        <span>{displayType}</span>
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
                  to={getLicenseUrl(license.type)}
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
