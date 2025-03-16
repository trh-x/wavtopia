import React from "react";
import { FormInput } from "@/components/ui/forms";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useFileProcessing } from "./hooks/useFileProcessing";
import { DropZone } from "./components/DropZone";
import { UploadList } from "./components/UploadList";
import { UnmatchedArt } from "./components/UnmatchedArt";
import { UploadProgress } from "./components/UploadProgress";
import { LicenseSelect } from "@/components/ui/LicenseSelect";
import { useQuery } from "@tanstack/react-query";
import type { License } from "@wavtopia/core-storage";

export function BulkUploadTrack() {
  const { getToken } = useAuthToken();
  const {
    state,
    draggedCoverArt,
    setDraggedCoverArt,
    handlers: {
      handleFileSelect,
      handleRemoveTrack,
      handleUnmatchCoverArt,
      handleCoverArtDrop,
      handleUnmatchedDrop,
      uploadTracks,
      handleClearAll,
      removeUnmatchedArt,
      setDefaultArtist,
      setDefaultLicense,
    },
  } = useFileProcessing(getToken);

  const { data: licenses } = useQuery<License[]>({
    queryKey: ["licenses"],
    queryFn: async () => {
      const response = await fetch("/api/licenses", {
        headers: {
          Authorization: `Bearer ${getToken()!}`,
        },
      });
      return response.json();
    },
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (state.matches.length === 0) return;
    if (!state.defaultLicenseId) {
      // The license input is required, so we shouldn't get here
      return;
    }

    const pendingUploads = state.matches.filter((m) => !m.uploaded);
    if (pendingUploads.length === 0) return;

    console.log("Starting upload process");
    try {
      await uploadTracks();
    } catch (error) {
      console.error("Upload process failed:", error);
    }
  };

  const pendingUploads = state.matches.filter((m) => !m.uploaded);
  const isUploadInProgress =
    state.currentUploadIndex >= 0 &&
    state.currentUploadIndex < pendingUploads.length;
  const isUploadComplete =
    pendingUploads.length === 0 && state.matches.length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Bulk Upload Tracks</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <DropZone
          onFileSelect={handleFileSelect}
          disabled={isUploadInProgress}
        />

        <FormInput
          id="defaultArtistName"
          type="text"
          label="Default Artist (optional)"
          value={state.defaultArtistName}
          onChange={(e) => setDefaultArtist(e.target.value)}
          disabled={isUploadInProgress}
        />

        <LicenseSelect
          value={state.defaultLicenseId}
          onChange={setDefaultLicense}
          licenses={licenses}
          disabled={isUploadInProgress}
          required
        />

        <UploadList
          matches={state.matches}
          currentUploadIndex={state.currentUploadIndex}
          draggedCoverArt={draggedCoverArt}
          onRemoveTrack={handleRemoveTrack}
          onUnmatchCoverArt={handleUnmatchCoverArt}
          onCoverArtDragStart={(path, file) =>
            setDraggedCoverArt({ sourceId: path, file })
          }
          onCoverArtDragEnd={() => setDraggedCoverArt(null)}
          onCoverArtDrop={handleCoverArtDrop}
        />

        <UnmatchedArt
          unmatchedCoverArt={state.unmatchedCoverArt}
          draggedCoverArt={draggedCoverArt}
          onRemoveArt={removeUnmatchedArt}
          onDragStart={(sourceId, file) =>
            setDraggedCoverArt({ sourceId, file })
          }
          onDragEnd={() => setDraggedCoverArt(null)}
          onDrop={handleUnmatchedDrop}
        />

        <UploadProgress
          matches={state.matches}
          currentUploadIndex={state.currentUploadIndex}
          isUploadInProgress={isUploadInProgress}
          isUploadComplete={isUploadComplete}
          error={state.error}
          onClearAll={handleClearAll}
          onAddMoreFiles={() => {
            const dropZone = document.getElementById("drop-zone");
            const input =
              dropZone?.querySelector<HTMLInputElement>("input[type=file]");
            if (input) {
              input.click();
            }
          }}
        />
      </form>
    </div>
  );
}
