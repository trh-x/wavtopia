import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "../ui/Switch";
import { useTrack } from "@/pages/TrackDetails/contexts/TrackContext";
import { api } from "@/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/utils/cn";

interface TrackVisibilityToggleProps {
  token: string;
  size?: "sm" | "md";
  className?: string;
}

export function TrackVisibilityToggle({
  token,
  size = "md",
  className,
}: TrackVisibilityToggleProps) {
  const { track } = useTrack();
  const { user } = useAuth();
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

  // Only show the toggle if the user owns the track
  if (!user || track.userId !== user.id) {
    return null;
  }

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
