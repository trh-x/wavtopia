import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useToasts } from "@/hooks/useToasts";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { DropZone } from "../ui/DropZone";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Track } from "@/types";

interface AddStemButtonProps {
  track: Track;
  canEdit: boolean;
}

interface StemCreateFormData {
  name: string;
  type: string;
  file: File | null;
}

export function AddStemButton({ track, canEdit }: AddStemButtonProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<StemCreateFormData>({
    name: "",
    type: "",
    file: null,
  });

  const { getToken } = useAuthToken();
  const queryClient = useQueryClient();
  const { addToast } = useToasts();

  const createMutation = useMutation({
    mutationFn: async (data: StemCreateFormData) => {
      const token = getToken();
      if (!token) throw new Error("Authentication required");

      if (!data.file) throw new Error("Audio file is required");

      const formDataObj = new FormData();
      formDataObj.append(
        "data",
        JSON.stringify({
          name: data.name,
          type: data.type,
        })
      );
      formDataObj.append("stemFile", data.file);

      return api.stem.create(track.id, formDataObj, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["track", track.id] });
      addToast({
        type: "success",
        title: "Stem Added",
        message: `${formData.name} has been added and is being processed.`,
      });
      setShowCreateDialog(false);
      setFormData({
        name: "",
        type: "",
        file: null,
      });
    },
    onError: (error) => {
      addToast({
        type: "error",
        title: "Failed to Add Stem",
        message: (error as Error).message,
      });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file) {
      addToast({
        type: "error",
        title: "File Required",
        message: "Please select an audio file for the stem.",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleInputChange = (
    field: keyof Omit<StemCreateFormData, "file">,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (files: File[]) => {
    const file = files[0];
    setFormData((prev) => ({
      ...prev,
      file: file || null,
      // Auto-populate name from filename if not already set
      name: prev.name || (file ? file.name.replace(/\.[^/.]+$/, "") : ""),
    }));
  };

  // Only show for forks that the user owns
  if (!canEdit || !track.isFork) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowCreateDialog(true)}
        className="flex items-center gap-2"
      >
        <PlusIcon className="w-4 h-4" />
        Add Stem
      </Button>

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowCreateDialog(false)}
          />
          <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <PlusIcon className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Add New Stem</h2>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Audio File *</label>
                <DropZone
                  onFileSelect={handleFileChange}
                  accept=".mp3,.wav,.flac"
                  multiple={false}
                  className="h-32"
                  label="Drop audio file or click to browse"
                  sublabel="MP3, WAV, or FLAC files"
                />
                {formData.file && (
                  <p className="text-sm text-green-600">
                    Selected: {formData.file.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="stemName" className="text-sm font-medium">
                  Name *
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

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || !formData.file}
                  className="flex items-center gap-2"
                >
                  {createMutation.isPending ? "Adding..." : "Add Stem"}
                </Button>
              </div>

              {createMutation.error && (
                <div className="text-red-600 text-sm">
                  Error: {(createMutation.error as Error).message}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
