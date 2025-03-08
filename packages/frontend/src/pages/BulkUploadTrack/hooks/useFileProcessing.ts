import { useCallback, useState } from "react";
import { api } from "@/api/client";
import { BulkUploadState, DraggedCoverArt } from "../utils/types";
import { processFiles } from "../utils/fileMatching";

export function useFileProcessing(getToken: () => string | null) {
  const [state, setState] = useState<BulkUploadState>({
    defaultArtistName: "",
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
        matches: prev.matches.map((m) => {
          if (m.path === path) {
            return { ...m, coverArt: undefined };
          }
          return m;
        }),
        unmatchedCoverArt: [...prev.unmatchedCoverArt, match.coverArt],
      };
    });
  }, []);

  const handleCoverArtDrop = useCallback(
    (targetPath: string) => {
      if (!draggedCoverArt) return;

      setState((prev) => {
        const isFromUnmatched =
          draggedCoverArt.sourceId.startsWith("unmatched-");
        const newUnmatchedCoverArt = isFromUnmatched
          ? prev.unmatchedCoverArt.filter((f) => f !== draggedCoverArt.file)
          : prev.unmatchedCoverArt;

        const targetTrack = prev.matches.find((m) => m.path === targetPath);
        const existingCoverArt = targetTrack?.coverArt;

        return {
          ...prev,
          matches: prev.matches.map((match) => {
            if (match.path === targetPath) {
              return { ...match, coverArt: draggedCoverArt.file };
            }
            if (!isFromUnmatched && match.path === draggedCoverArt.sourceId) {
              return { ...match, coverArt: undefined };
            }
            return match;
          }),
          unmatchedCoverArt: existingCoverArt
            ? [...newUnmatchedCoverArt, existingCoverArt]
            : newUnmatchedCoverArt,
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
          })
        );

        formData.append("original", match.track);
        if (match.coverArt) {
          formData.append("coverArt", match.coverArt);
        }

        const data = await api.track.upload(formData, getToken()!);
        console.log("Upload successful for", match.title);

        setState((prev) => ({
          ...prev,
          uploadedTracks: [...prev.uploadedTracks, data.id],
          currentUploadIndex: i + 1,
          matches: prev.matches.map((m) =>
            m.path === match.path ? { ...m, uploaded: true } : m
          ),
        }));
      } catch (error) {
        console.error(`Failed to upload ${match.title}:`, error);
        setState((prev) => ({
          ...prev,
          error: `Failed to upload ${match.title}: ${error}`,
        }));
        throw error;
      }
    }
  }, [state.matches, state.defaultArtistName, getToken]);

  const handleClearAll = useCallback(() => {
    setState({
      defaultArtistName: "",
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
    },
  };
}
