import React, { useState, useCallback, useRef } from "react";
import { FormInput, FormError, FormButton } from "@/components/ui/FormInput";
import { useAuthToken } from "@/hooks/useAuthToken";
import { api } from "@/api/client";
import { cn } from "@/utils/cn";

interface FileMatch {
  track: File;
  coverArt?: File;
  title: string; // Derived from filename
  id: string; // Unique identifier for drag/drop
}

interface BulkUploadState {
  defaultArtist: string;
  matches: FileMatch[];
  currentUploadIndex: number;
  uploadedTracks: string[]; // Track IDs
  error?: string;
  availableCoverArt: File[];
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
    availableCoverArt: [],
  });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCoverArt, setDraggedCoverArt] = useState<{
    id: string;
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

    // Sort files into tracks and art
    files.forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const baseName = file.name.substring(0, file.name.lastIndexOf("."));

      if (ext === "xm") {
        trackFiles.set(baseName, file);
      } else if (file.type.startsWith("image/")) {
        artFiles.push(file);
      }
    });

    // Try to match tracks with art using fuzzy matching
    const matches: FileMatch[] = [];
    trackFiles.forEach((trackFile, trackBaseName) => {
      let bestMatch: { file: File; score: number } | null = null;

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

      matches.push({
        track: trackFile,
        coverArt: bestMatch?.file,
        title: trackBaseName,
        id: Math.random().toString(36).substring(7),
      });
    });

    setState((prev) => ({
      ...prev,
      matches,
      availableCoverArt: artFiles,
      currentUploadIndex: -1,
      uploadedTracks: [],
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const handleUnmatchCoverArt = (matchId: string) => {
    setState((prev) => ({
      ...prev,
      matches: prev.matches.map((match) => {
        if (match.id === matchId && match.coverArt) {
          return {
            ...match,
            coverArt: undefined,
          };
        }
        return match;
      }),
    }));
  };

  const handleCoverArtDragStart = (matchId: string, file: File) => {
    setDraggedCoverArt({ id: matchId, file });
  };

  const handleCoverArtDragEnd = () => {
    setDraggedCoverArt(null);
  };

  const handleCoverArtDrop = (targetMatchId: string) => {
    if (!draggedCoverArt) return;

    setState((prev) => ({
      ...prev,
      matches: prev.matches.map((match) => {
        if (match.id === targetMatchId) {
          return {
            ...match,
            coverArt: draggedCoverArt.file,
          };
        }
        if (match.id === draggedCoverArt.id) {
          return {
            ...match,
            coverArt: undefined,
          };
        }
        return match;
      }),
    }));
    setDraggedCoverArt(null);
  };

  // Upload tracks sequentially
  const uploadTracks = async () => {
    const { matches, defaultArtist } = state;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      console.log(`Uploading track ${i + 1}/${matches.length}: ${match.title}`);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.matches.length === 0) return;

    console.log("Starting upload process");
    setState((prev) => ({
      ...prev,
      currentUploadIndex: 0,
      error: undefined,
      uploadedTracks: [],
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

  const isUploadInProgress =
    state.currentUploadIndex >= 0 &&
    state.currentUploadIndex < state.matches.length;

  const isUploadComplete =
    state.matches.length > 0 &&
    state.currentUploadIndex === state.matches.length;

  const progress =
    state.matches.length === 0
      ? 0
      : (state.currentUploadIndex / state.matches.length) * 100;

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
                  key={match.id}
                  className={cn(
                    "flex items-center space-x-4 p-3 rounded-lg border",
                    i < state.currentUploadIndex
                      ? "border-green-200 bg-green-50"
                      : i === state.currentUploadIndex
                      ? "border-blue-200 bg-blue-50"
                      : draggedCoverArt && match.id !== draggedCoverArt.id
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
                    handleCoverArtDrop(match.id);
                  }}
                >
                  <div className="flex-grow">
                    <span className="font-medium">{match.title}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {match.coverArt ? (
                      <div
                        className="flex items-center space-x-2 cursor-move"
                        draggable
                        onDragStart={() =>
                          handleCoverArtDragStart(match.id, match.coverArt!)
                        }
                        onDragEnd={handleCoverArtDragEnd}
                      >
                        <span className="text-sm text-gray-500">
                          {match.coverArt.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUnmatchCoverArt(match.id)}
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
                        {draggedCoverArt && match.id !== draggedCoverArt.id
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

        {state.error && <FormError message={state.error} />}

        {isUploadInProgress && (
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <FormButton
          type="submit"
          disabled={state.matches.length === 0 || isUploadInProgress}
        >
          {isUploadInProgress
            ? `Uploading (${state.currentUploadIndex + 1}/${
                state.matches.length
              })`
            : "Start Upload"}
        </FormButton>

        {isUploadComplete && (
          <div className="text-center text-green-600">
            All tracks uploaded successfully!
          </div>
        )}
      </form>
    </div>
  );
}
