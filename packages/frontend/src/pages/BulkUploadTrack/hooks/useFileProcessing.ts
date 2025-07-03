import { useCallback, useState } from "react";
import { api, NotificationType } from "@/api/client";
import { BulkUploadState, DraggedCoverArt } from "../utils/types";
import { processFiles } from "../utils/fileMatching";

export function useFileProcessing(getToken: () => string | null) {
  const [state, setState] = useState<BulkUploadState>({
    defaultArtistName: "",
    defaultLicenseId: undefined,
    matches: [],
    currentUploadIndex: -1,
    uploadedTracks: [],
    unmatchedCoverArt: [],
  });
  const [draggedCoverArt, setDraggedCoverArt] =
    useState<DraggedCoverArt | null>(null);

  const handleFileSelect = useCallback(
    (files: File[]) => {
      const existingArtPaths = new Set(
        state.unmatchedCoverArt.map((f) => f.name)
      );
      const { newMatches, unmatchedArt } = processFiles(
        files,
        state.matches,
        existingArtPaths
      );

      setState((prev) => ({
        ...prev,
        matches: [...prev.matches, ...newMatches],
        unmatchedCoverArt: [...prev.unmatchedCoverArt, ...unmatchedArt],
        currentUploadIndex: -1,
        uploadedTracks: [],
      }));
    },
    [state.matches, state.unmatchedCoverArt]
  );

  const handleRemoveTrack = useCallback((path: string) => {
    setState((prev) => {
      const match = prev.matches.find((m) => m.path === path);
      return {
        ...prev,
        matches: prev.matches.filter((m) => m.path !== path),
        unmatchedCoverArt: match?.coverArt
          ? [...prev.unmatchedCoverArt, match.coverArt]
          : prev.unmatchedCoverArt,
      };
    });
  }, []);

  const handleUnmatchCoverArt = useCallback((path: string) => {
    setState((prev) => {
      const match = prev.matches.find((m) => m.path === path);
      if (!match?.coverArt) return prev;

      return {
        ...prev,
        matches: prev.matches.map((m) =>
          m.path === path ? { ...m, coverArt: undefined } : m
        ),
        unmatchedCoverArt: [...prev.unmatchedCoverArt, match.coverArt],
      };
    });
  }, []);

  const handleCoverArtDrop = useCallback(
    (targetPath: string) => {
      if (!draggedCoverArt) return;

      setState((prev) => {
        // If dragging from unmatched art, remove from unmatched
        const newUnmatchedArt = draggedCoverArt.sourceId.startsWith(
          "unmatched-"
        )
          ? prev.unmatchedCoverArt.filter((f) => f !== draggedCoverArt.file)
          : prev.unmatchedCoverArt;

        // If dragging from another track, remove from that track
        const newMatches = prev.matches.map((match) => {
          if (match.path === draggedCoverArt.sourceId) {
            return { ...match, coverArt: undefined };
          }
          if (match.path === targetPath) {
            return { ...match, coverArt: draggedCoverArt.file };
          }
          return match;
        });

        return {
          ...prev,
          matches: newMatches,
          unmatchedCoverArt: newUnmatchedArt,
        };
      });

      setDraggedCoverArt(null);
    },
    [draggedCoverArt]
  );

  const handleUnmatchedDrop = useCallback(() => {
    if (!draggedCoverArt || draggedCoverArt.sourceId.startsWith("unmatched-"))
      return;

    setState((prev) => ({
      ...prev,
      matches: prev.matches.map((match) => {
        if (match.path === draggedCoverArt.sourceId) {
          return { ...match, coverArt: undefined };
        }
        return match;
      }),
      unmatchedCoverArt: [...prev.unmatchedCoverArt, draggedCoverArt.file],
    }));
    setDraggedCoverArt(null);
  }, [draggedCoverArt]);

  const uploadTracks = useCallback(async () => {
    const pendingUploads = state.matches.filter((m) => !m.uploaded);

    for (let i = 0; i < pendingUploads.length; i++) {
      const match = pendingUploads[i];
      console.log(
        `Uploading track ${i + 1}/${pendingUploads.length}: ${match.title}`
      );

      const originalFormat = match.track.name.split(".").pop()?.toLowerCase();
      if (!originalFormat) {
        console.error(`No original format found for ${match.title}`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append(
          "data",
          JSON.stringify({
            title: match.title,
            primaryArtistName:
              state.defaultArtistName.trim() || "Unknown Artist",
            originalFormat,
            licenseId: state.defaultLicenseId,
          })
        );

        formData.append("original", match.track);
        if (match.coverArt) {
          formData.append("coverArt", match.coverArt);
        }

        // If a storage quota warning notification is returned, it will be automatically
        // shown as a toast. See apiRequest.
        const data = await api.track.upload(formData, getToken()!);
        console.log("Upload successful for", match.title);

        setState((prev) => ({
          ...prev,
          uploadedTracks: [...prev.uploadedTracks, data.track.id],
          currentUploadIndex: i + 1,
          matches: prev.matches.map((m) =>
            m.path === match.path ? { ...m, uploaded: true } : m
          ),
        }));

        // TODO: Provide a clearer return value to indicate the quota has been exceeded, also
        // show a notice in the UI that informs the user about being over quota (in addition
        // to the toast)
        if (
          data.notification?.type === NotificationType.STORAGE_QUOTA_WARNING
        ) {
          console.warn(
            `User ${data.notification.userId} has exceeded their storage quota. Quota warning: ${data.notification.message}`
          );
          return;
        }
      } catch (error) {
        console.error(`Failed to upload ${match.title}:`, error);
        setState((prev) => ({
          ...prev,
          error: `Failed to upload ${match.title}: ${error}`,
        }));
        throw error;
      }
    }
  }, [
    state.matches,
    state.defaultArtistName,
    state.defaultLicenseId,
    getToken,
  ]);

  const handleClearAll = useCallback(() => {
    setState({
      defaultArtistName: "",
      defaultLicenseId: undefined,
      matches: [],
      currentUploadIndex: -1,
      uploadedTracks: [],
      unmatchedCoverArt: [],
    });
  }, []);

  const removeUnmatchedArt = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      unmatchedCoverArt: prev.unmatchedCoverArt.filter((_, i) => i !== index),
    }));
  }, []);

  return {
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
      setDefaultArtist: (value: string) =>
        setState((prev) => ({ ...prev, defaultArtistName: value })),
      setDefaultLicense: (value: string) =>
        setState((prev) => ({ ...prev, defaultLicenseId: value })),
    },
  };
}
