import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useToasts } from "@/hooks/useToasts";
import { useStemProcessingSimple } from "@/hooks/useStemProcessingSimple";
import { useTrackRegeneration } from "@/pages/TrackDetails/contexts/TrackRegenerationContext";
import { Button } from "../ui/Button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/AlertDialog";
import { Input } from "../ui/Input";
import { DropZone } from "../ui/DropZone";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Track, Stem } from "@/types";

interface StemManagementProps {
  track: Track;
  stem: Stem;
  canEdit: boolean;
}

interface StemUpdateFormData {
  name: string;
  type: string;
  file: File | null;
}

export function StemManagement({ track, stem, canEdit }: StemManagementProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState<StemUpdateFormData>({
    name: stem.name,
    type: stem.type,
    file: null,
  });

  const { startTrackRegeneration } = useTrackRegeneration();

  const { getToken } = useAuthToken();
  const queryClient = useQueryClient();
  const { addToast } = useToasts();

  useStemProcessingSimple({
    track,
    stem,
    isProcessing,
    onProcessingComplete: () => {
      setIsProcessing(false);

      // Show success toast
      addToast({
        type: "success",
        title: "Stem Processing Complete",
        message: `${stem.name} has been processed successfully. The waveform has been updated.`,
      });

      // Trigger a targeted update by invalidating the track query
      // The key-based approach in TrackStem should handle the waveform update
      queryClient.invalidateQueries({
        queryKey: ["track", track.id],
        refetchType: "active", // Only refetch if the query is currently being observed
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: StemUpdateFormData) => {
      const token = getToken();
      if (!token) throw new Error("Authentication required");

      const formDataObj = new FormData();
      formDataObj.append(
        "data",
        JSON.stringify({
          name: data.name,
          type: data.type,
        })
      );

      if (data.file) {
        formDataObj.append("stemFile", data.file);
      }

      return api.stem.update(track.id, stem.id, formDataObj, token);
    },
    onSuccess: (_, variables) => {
      // If a file was uploaded, start processing detection
      if (variables.file) {
        setIsProcessing(true);
        addToast({
          type: "info",
          title: "Processing Stem",
          message: `${stem.name} is being processed. You'll be notified when it's complete.`,
        });
      } else {
        // If only metadata was updated, invalidate immediately
        queryClient.invalidateQueries({ queryKey: ["track", track.id] });
        addToast({
          type: "success",
          title: "Stem Updated",
          message: `${stem.name} has been updated successfully.`,
        });
      }

      setShowEditDialog(false);
      setFormData({
        name: stem.name,
        type: stem.type,
        file: null,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Authentication required");

      return api.stem.delete(track.id, stem.id, token);
    },
    onSuccess: () => {
      // Start track regeneration through context
      startTrackRegeneration();
      queryClient.invalidateQueries({ queryKey: ["track", track.id] });
    },
    onError: (error) => {
      console.error(
        `❌ [StemManagement] Error deleting stem ${stem.id} from track ${track.id}:`,
        error
      );
    },
  });

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleInputChange = (
    field: keyof Omit<StemUpdateFormData, "file">,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (files: File[]) => {
    setFormData((prev) => ({
      ...prev,
      file: files[0] || null,
    }));
  };

  // Only show management options for forks that the user owns
  if (!canEdit || !track.isFork) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowEditDialog(true)}
          className="flex items-center gap-1"
        >
          <PencilIcon className="w-3 h-3" />
          Edit
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-red-600 hover:text-red-700"
            >
              <TrashIcon className="w-3 h-3" />
              Remove
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Stem</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove the stem "{stem.name}"? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? "Removing..." : "Remove Stem"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Edit Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowEditDialog(false)}
          />
          <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <PencilIcon className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Edit Stem</h2>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="stemName" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="stemName"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("name", e.target.value)
                  }
                  placeholder="Enter stem name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="stemType" className="text-sm font-medium">
                  Type
                </label>
                <Input
                  id="stemType"
                  value={formData.type}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("type", e.target.value)
                  }
                  placeholder="e.g., vocals, drums, bass"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Replace Audio File (optional)
                </label>
                <DropZone
                  onFileSelect={handleFileChange}
                  accept=".wav,.flac"
                  multiple={false}
                  className="h-32"
                  label="Drop audio file or click to browse"
                  sublabel=".wav or .flac files"
                />
                {formData.file && (
                  <p className="text-sm text-green-600">
                    Selected: {formData.file.name}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {updateMutation.isPending ? "Updating..." : "Save Changes"}
                </Button>
              </div>

              {updateMutation.error && (
                <div className="text-red-600 text-sm">
                  Error: {(updateMutation.error as Error).message}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
