import { useState } from "react";
import { api } from "../../api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Switch } from "../ui/Switch";
import { useTrack } from "@/pages/TrackDetails/contexts/TrackContext";

interface TrackSharingControlsProps {
  token: string;
}

export function TrackSharingControls({ token }: TrackSharingControlsProps) {
  const { track } = useTrack();
  const [userEmail, setUserEmail] = useState("");
  const queryClient = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.users.list(token),
  });

  const shareTrackMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      return api.track.share(track.id, userIds, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["track", track.id] });
      setUserEmail("");
    },
  });

  const unshareTrackMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      return api.track.unshare(track.id, userIds, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["track", track.id] });
    },
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      return api.track.updateVisibility(track.id, isPublic, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["track", track.id] });
    },
  });

  const handleShare = async () => {
    const userToShare = users?.find((u) => u.email === userEmail);
    if (userToShare) {
      await shareTrackMutation.mutateAsync([userToShare.id]);
    }
  };

  const handleUnshare = async (userId: string) => {
    await unshareTrackMutation.mutateAsync([userId]);
  };

  const handleVisibilityChange = async (checked: boolean) => {
    await updateVisibilityMutation.mutateAsync(checked);
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Track Sharing</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm">Make Public</span>
          <Switch
            checked={track.isPublic}
            onCheckedChange={handleVisibilityChange}
          />
        </div>
      </div>

      <div className="flex space-x-2">
        <Input
          type="email"
          placeholder="Enter user email to share with"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleShare} disabled={!userEmail}>
          Share
        </Button>
      </div>

      {track.sharedWith && track.sharedWith.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Shared with:</h4>
          <ul className="space-y-2">
            {track.sharedWith.map((share) => (
              <li
                key={share.userId}
                className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded"
              >
                <span className="text-gray-900">{share.user.email}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnshare(share.userId)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
