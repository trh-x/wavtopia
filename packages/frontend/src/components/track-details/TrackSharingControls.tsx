import { useState } from "react";
import { Track } from "@/types";
import { api } from "../../api/client";
import { useAuthToken } from "../../hooks/useAuthToken";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Switch } from "../ui/Switch";
import { useAuth } from "@/contexts/AuthContext";

interface TrackSharingControlsProps {
  track: Track;
}

export function TrackSharingControls({ track }: TrackSharingControlsProps) {
  const [userEmail, setUserEmail] = useState("");
  const { getToken } = useAuthToken();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // If the current user doesn't own the track, don't render anything
  if (track.userId !== user?.id) {
    return null;
  }

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.users.list(getToken()!),
  });

  const shareTrackMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const response = await fetch(`/api/tracks/${track.id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ userIds }),
      });
      if (!response.ok) throw new Error("Failed to share track");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["track", track.id] });
      setUserEmail("");
    },
  });

  const unshareTrackMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const response = await fetch(`/api/tracks/${track.id}/share`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ userIds }),
      });
      if (!response.ok) throw new Error("Failed to remove track sharing");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["track", track.id] });
    },
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      const response = await fetch(`/api/tracks/${track.id}/visibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ isPublic }),
      });
      if (!response.ok) throw new Error("Failed to update track visibility");
      return response.json();
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
