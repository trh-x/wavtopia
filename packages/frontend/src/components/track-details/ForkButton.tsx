import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Checkbox } from "../ui/Checkbox";
import {
  DocumentDuplicateIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { Track } from "@/types";
import { useNavigate } from "react-router-dom";

interface ForkButtonProps {
  track: Track;
  variant?: "button" | "icon";
  size?: "sm" | "md" | "lg";
}

interface ForkFormData {
  title: string;
  description: string;
  isPublic: boolean;
}

export function ForkButton({
  track,
  variant = "button",
  size = "md",
}: ForkButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState<ForkFormData>({
    title: `${track.title} (Fork)`,
    description: track.description || "",
    isPublic: false,
  });

  const { getToken } = useAuthToken();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const forkMutation = useMutation({
    mutationFn: async (data: ForkFormData) => {
      const token = getToken();
      if (!token) throw new Error("Authentication required");

      return api.track.fork(track.id, data, token);
    },
    onSuccess: (forkedTrack) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      queryClient.invalidateQueries({ queryKey: ["track", track.id] });

      setShowDialog(false);

      // Navigate to the forked track
      navigate(`/track/${forkedTrack.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forkMutation.mutate(formData);
  };

  const handleInputChange = (
    field: keyof ForkFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Don't show fork button if user is not logged in
  if (!user) {
    return null;
  }

  // Don't show fork button on own tracks
  if (track.userId === user.id) {
    return null;
  }

  const buttonContent = (
    <>
      <DocumentDuplicateIcon className="w-4 h-4" />
      {variant === "button" && <span>Fork</span>}
    </>
  );

  return (
    <>
      <Button
        variant="outline"
        size={size === "md" ? "default" : size}
        onClick={() => setShowDialog(true)}
        className="flex items-center gap-2"
      >
        {buttonContent}
      </Button>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowDialog(false)}
          />
          <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <DocumentDuplicateIcon className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Fork Track</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Title
                </label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("title", e.target.value)
                  }
                  placeholder="Enter fork title"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Describe your fork..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublic"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) =>
                    handleInputChange("isPublic", !!checked)
                  }
                />
                <label htmlFor="isPublic" className="text-sm font-medium">
                  Make fork public
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  disabled={forkMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={forkMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  Create Fork
                </Button>
              </div>

              {forkMutation.error && (
                <div className="text-red-600 text-sm">
                  Error: {(forkMutation.error as Error).message}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
