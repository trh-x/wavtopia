import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "../ui/Switch";
import { useTrack } from "@/pages/TrackDetails/contexts/TrackContext";
import { api } from "@/api/client";
import { cn } from "@/utils/cn";
import { useAuthToken } from "@/hooks/useAuthToken";

interface TrackVisibilityToggleProps {
  size?: "sm" | "md";
  className?: string;
}

export function TrackVisibilityToggle({
  size = "md",
  className,
}: TrackVisibilityToggleProps) {
  const { getToken } = useAuthToken();
  const token = getToken();

  if (!token) {
    return null;
  }

  return <VisibilityToggle token={token} size={size} className={className} />;
}

interface VisibilityToggleProps {
  token: string;
  size?: "sm" | "md";
  className?: string;
}

function VisibilityToggle({
  token,
  size = "md",
  className,
}: VisibilityToggleProps) {
  const { track } = useTrack();
  const queryClient = useQueryClient();

  const updateVisibilityMutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      return api.track.updateVisibility(track.id, isPublic, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["track", track.id] });
    },
  });

  const handleVisibilityChange = async (checked: boolean) => {
    await updateVisibilityMutation.mutateAsync(checked);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 border rounded-md px-2 py-1",
        className
      )}
    >
      <span
        className={cn(
          "text-gray-600 whitespace-nowrap",
          size === "sm" ? "text-sm" : "text-base"
        )}
      >
        {track.isPublic ? "Public" : "Private"}
      </span>
      <Switch
        checked={track.isPublic}
        onCheckedChange={handleVisibilityChange}
        className="data-[state=checked]:bg-primary-600"
      />
    </div>
  );
}
