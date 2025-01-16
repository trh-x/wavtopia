import React, { useState, useCallback, useRef } from "react";
import { FormInput, FormError, FormButton } from "@/components/ui/FormInput";
import { useAuthToken } from "@/hooks/useAuthToken";
import { api } from "@/api/client";
import { cn } from "@/utils/cn";

interface FileMatch {
  track: File;
  coverArt?: File;
  title: string;
  path: string;
  uploaded?: boolean;
}

interface BulkUploadState {
  defaultArtist: string;
  matches: FileMatch[];
  currentUploadIndex: number;
  uploadedTracks: string[];
  error?: string;
  unmatchedCoverArt: File[];
}

function fuzzyMatch(str1: string, str2: string): number {
  str1 = str1.toLowerCase();
  str2 = str2.toLowerCase();

  if (str1 === str2) return 1;
  if (str1.includes(str2) || str2.includes(str1)) return 0.9;

  let score = 0;
  const words1 = str1.split(/[\s-_]+/);
  const words2 = str2.split(/[\s-_]+/);

  words1.forEach((word1) => {
    words2.forEach((word2) => {
      if (word1 === word2) score += 1;
      else if (word1.includes(word2) || word2.includes(word1)) score += 0.5;
    });
  });

  return score / Math.max(words1.length, words2.length);
}

export function BulkUploadTrack() {
  const { getToken } = useAuthToken();
  const [state, setState] = useState<BulkUploadState>({
    defaultArtist: "",
    matches: [],
    currentUploadIndex: -1,
    uploadedTracks: [],
    unmatchedCoverArt: [],
  });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCoverArt, setDraggedCoverArt] = useState<{
    sourceId: string;
    file: File;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleDragIn = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer?.files || []);
    processFiles(files);
  }, []);

  const processFiles = (files: File[]) => {
    const trackFiles = new Map<string, File>();
    const artFiles: File[] = [];
    const existingPaths = new Set(state.matches.map((m) => m.path));
    const existingArtPaths = new Set(
      state.unmatchedCoverArt.map((f) => f.name)
    );

    // Sort files into tracks and art
    files.forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const baseName = file.name.substring(0, file.name.lastIndexOf("."));

      if (ext === "xm" && !existingPaths.has(file.name)) {
        trackFiles.set(baseName, file);
      } else if (
        file.type.startsWith("image/") &&
        !existingArtPaths.has(file.name)
      ) {
        artFiles.push(file);
      }
    });

    // Try to match tracks with art using fuzzy matching
    const newMatches: FileMatch[] = [];
    trackFiles.forEach((trackFile, trackBaseName) => {
      let bestMatch: { file: File; score: number } | null = null;

      // Try to match with new art files first
      for (const artFile of artFiles) {
        const artBaseName = artFile.name.substring(
          0,
          artFile.name.lastIndexOf(".")
        );
        const score = fuzzyMatch(trackBaseName, artBaseName);

        if (score > 0.7 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { file: artFile, score };
        }
      }

      newMatches.push({
        track: trackFile,
        coverArt: bestMatch?.file,
        title: trackBaseName,
        path: trackFile.name,
      });

      // Remove matched art file from artFiles
      if (bestMatch) {
        const index = artFiles.indexOf(bestMatch.file);
        if (index > -1) {
          artFiles.splice(index, 1);
        }
      }
    });

    setState((prev) => ({
      ...prev,
      matches: [...prev.matches, ...newMatches],
      unmatchedCoverArt: [...prev.unmatchedCoverArt, ...artFiles],
      currentUploadIndex: -1,
      uploadedTracks: [],
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const handleRemoveTrack = (path: string) => {
    setState((prev) => {
      const match = prev.matches.find((m) => m.path === path);
      return {
        ...prev,
        matches: prev.matches.filter((m) => m.path !== path),
        // If the track had cover art, add it to unmatched
        unmatchedCoverArt: match?.coverArt
          ? [...prev.unmatchedCoverArt, match.coverArt]
          : prev.unmatchedCoverArt,
      };
    });
  };

  const handleUnmatchCoverArt = (path: string) => {
    setState((prev) => {
      const match = prev.matches.find((m) => m.path === path);
      if (!match?.coverArt) return prev;

      return {
        ...prev,
        matches: prev.matches.map((m) => {
          if (m.path === path) {
            return {
              ...m,
              coverArt: undefined,
            };
          }
          return m;
        }),
        unmatchedCoverArt: [...prev.unmatchedCoverArt, match.coverArt],
      };
    });
  };

  const handleCoverArtDragStart = (path: string, file: File) => {
    setDraggedCoverArt({ sourceId: path, file });
  };

  const handleCoverArtDragEnd = () => {
    setDraggedCoverArt(null);
  };

  const handleCoverArtDrop = (targetPath: string) => {
    if (!draggedCoverArt) return;

    setState((prev) => {
      // If the cover art was from the unmatched list, remove it
      const isFromUnmatched = draggedCoverArt.sourceId.startsWith("unmatched-");
      const newUnmatchedCoverArt = isFromUnmatched
        ? prev.unmatchedCoverArt.filter((f) => f !== draggedCoverArt.file)
        : prev.unmatchedCoverArt;

      // Find the target track's current cover art if it exists
      const targetTrack = prev.matches.find((m) => m.path === targetPath);
      const existingCoverArt = targetTrack?.coverArt;

      return {
        ...prev,
        matches: prev.matches.map((match) => {
          if (match.path === targetPath) {
            return {
              ...match,
              coverArt: draggedCoverArt.file,
            };
          }
          if (!isFromUnmatched && match.path === draggedCoverArt.sourceId) {
            return {
              ...match,
              coverArt: undefined,
            };
          }
          return match;
        }),
        // Add the existing cover art to unmatched if it exists
        unmatchedCoverArt: existingCoverArt
          ? [...newUnmatchedCoverArt, existingCoverArt]
          : newUnmatchedCoverArt,
      };
    });
    setDraggedCoverArt(null);
  };

  const handleUnmatchedDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedCoverArt || draggedCoverArt.sourceId.startsWith("unmatched-"))
      return;

    setState((prev) => {
      return {
        ...prev,
        matches: prev.matches.map((match) => {
          if (match.path === draggedCoverArt.sourceId) {
            return {
              ...match,
              coverArt: undefined,
            };
          }
          return match;
        }),
        unmatchedCoverArt: [...prev.unmatchedCoverArt, draggedCoverArt.file],
      };
    });
    setDraggedCoverArt(null);
  };

  // Upload tracks sequentially
  const uploadTracks = async () => {
    const { matches, defaultArtist } = state;
    const pendingUploads = matches.filter((m) => !m.uploaded);

    for (let i = 0; i < pendingUploads.length; i++) {
      const match = pendingUploads[i];
      console.log(
        `Uploading track ${i + 1}/${pendingUploads.length}: ${match.title}`
      );

      try {
        const formData = new FormData();
        formData.append(
          "data",
          JSON.stringify({
            title: match.title,
            artist: defaultArtist.trim() || "Unknown Artist",
            originalFormat: "xm",
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
  };

  const handleClearAll = () => {
    setState({
      defaultArtist: "",
      matches: [],
      currentUploadIndex: -1,
      uploadedTracks: [],
      unmatchedCoverArt: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.matches.length === 0) return;

    const pendingUploads = state.matches.filter((m) => !m.uploaded);
    if (pendingUploads.length === 0) return;

    console.log("Starting upload process");
    setState((prev) => ({
      ...prev,
      currentUploadIndex: 0,
      error: undefined,
    }));

    try {
      await uploadTracks();
    } catch (error) {
      console.error("Upload process failed:", error);
      setState((prev) => ({
        ...prev,
        error: `Upload process failed: ${error}`,
      }));
    }
  };

  const pendingUploads = state.matches.filter((m) => !m.uploaded);
  const isUploadInProgress =
    state.currentUploadIndex >= 0 &&
    state.currentUploadIndex < pendingUploads.length;

  const isUploadComplete =
    pendingUploads.length === 0 && state.matches.length > 0;

  const progress =
    pendingUploads.length === 0
      ? 100
      : (state.currentUploadIndex / pendingUploads.length) * 100;

  // Set up drag and drop event listeners
  React.useEffect(() => {
    const div = document.getElementById("drop-zone");
    if (!div) return;

    div.addEventListener("dragenter", handleDragIn);
    div.addEventListener("dragleave", handleDragOut);
    div.addEventListener("dragover", handleDragOver);
    div.addEventListener("drop", handleDrop);

    return () => {
      div.removeEventListener("dragenter", handleDragIn);
      div.removeEventListener("dragleave", handleDragOut);
      div.removeEventListener("dragover", handleDragOver);
      div.removeEventListener("drop", handleDrop);
    };
  }, [handleDragIn, handleDragOut, handleDragOver, handleDrop]);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Bulk Upload Tracks</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div
          id="drop-zone"
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging
              ? "border-primary-500 bg-primary-50"
              : "border-gray-300 hover:border-primary-500",
            isUploadInProgress && "opacity-50 pointer-events-none"
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".xm,image/*"
            onChange={handleFileSelect}
            disabled={isUploadInProgress}
          />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Drop track files (.xm) and cover art here
            </p>
            <p className="text-sm text-gray-500">or click to select files</p>
          </div>
        </div>

        <FormInput
          id="defaultArtist"
          type="text"
          label="Default Artist (optional)"
          value={state.defaultArtist}
          onChange={(e) =>
            setState((prev) => ({
              ...prev,
              defaultArtist: e.target.value,
            }))
          }
          disabled={isUploadInProgress}
        />

        {state.matches.length > 0 && (
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">
              Found {state.matches.length} tracks:
            </h2>
            <ul className="space-y-4">
              {state.matches.map((match, i) => (
                <li
                  key={match.path}
                  className={cn(
                    "flex items-center space-x-4 p-3 rounded-lg border",
                    match.uploaded
                      ? "border-green-200 bg-green-50"
                      : i < state.currentUploadIndex
                      ? "border-green-200 bg-green-50"
                      : i === state.currentUploadIndex
                      ? "border-blue-200 bg-blue-50"
                      : draggedCoverArt &&
                        match.path !== draggedCoverArt.sourceId
                      ? "border-primary-200 bg-primary-50"
                      : "border-gray-200"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCoverArtDrop(match.path);
                  }}
                >
                  <div className="flex-grow flex items-center space-x-2">
                    <span className="font-medium">{match.title}</span>
                    {match.uploaded && (
                      <span className="text-sm text-green-600">(Uploaded)</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveTrack(match.path)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    {match.coverArt ? (
                      <div
                        className="flex items-center space-x-2 cursor-move"
                        draggable
                        onDragStart={() =>
                          handleCoverArtDragStart(match.path, match.coverArt!)
                        }
                        onDragEnd={handleCoverArtDragEnd}
                      >
                        <span className="text-sm text-gray-500">
                          {match.coverArt.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUnmatchCoverArt(match.path)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {draggedCoverArt &&
                        match.path !== draggedCoverArt.sourceId
                          ? "Drop cover art here"
                          : "No cover art"}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {state.unmatchedCoverArt.length > 0 && (
          <div
            className={cn(
              "border rounded-lg p-4",
              draggedCoverArt &&
                !draggedCoverArt.sourceId.startsWith("unmatched-")
                ? "border-primary-200 bg-primary-50"
                : ""
            )}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={handleUnmatchedDrop}
          >
            <h2 className="text-lg font-semibold mb-4">
              {draggedCoverArt &&
              !draggedCoverArt.sourceId.startsWith("unmatched-")
                ? "Drop here to add to unmatched cover art"
                : "Unmatched Cover Art:"}
            </h2>
            <ul className="space-y-2">
              {state.unmatchedCoverArt.map((file, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between p-2 border rounded"
                  draggable
                  onDragStart={(e) => {
                    setDraggedCoverArt({
                      sourceId: `unmatched-${index}`,
                      file,
                    });
                  }}
                  onDragEnd={handleCoverArtDragEnd}
                >
                  <span className="text-sm text-gray-600">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setState((prev) => ({
                        ...prev,
                        unmatchedCoverArt: prev.unmatchedCoverArt.filter(
                          (_, i) => i !== index
                        ),
                      }));
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {state.error && <FormError message={state.error} />}

        {isUploadInProgress && (
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex flex-col space-y-2">
          {isUploadComplete ? (
            <>
              <div className="text-center text-green-600 mb-4">
                All tracks uploaded successfully!
              </div>
              <div className="flex justify-center space-x-4">
                <FormButton
                  type="button"
                  onClick={handleClearAll}
                  className="bg-gray-500 hover:bg-gray-600"
                >
                  Clear All & Start New
                </FormButton>
                <FormButton
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-primary-500 hover:bg-primary-600"
                >
                  Add More Files
                </FormButton>
              </div>
            </>
          ) : (
            <FormButton
              type="submit"
              disabled={
                state.matches.length === 0 ||
                isUploadInProgress ||
                pendingUploads.length === 0
              }
            >
              {isUploadInProgress
                ? `Uploading (${state.currentUploadIndex + 1}/${
                    pendingUploads.length
                  })`
                : pendingUploads.length > 0
                ? state.matches.some((m) => m.uploaded)
                  ? `Upload ${pendingUploads.length} Remaining Tracks`
                  : `Upload ${pendingUploads.length} Tracks`
                : "Start Upload"}
            </FormButton>
          )}
        </div>
      </form>
    </div>
  );
}
