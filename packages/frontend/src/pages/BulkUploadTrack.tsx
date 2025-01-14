import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormInput, FormError, FormButton } from "@/components/ui/FormInput";
import { useAuthToken } from "@/hooks/useAuthToken";
import { api } from "@/api/client";

interface FileMatch {
  track: File;
  coverArt?: File;
  title: string; // Derived from filename
}

interface BulkUploadState {
  defaultArtist: string;
  matches: FileMatch[];
  currentUploadIndex: number;
  uploadedTracks: string[]; // Track IDs
  error?: string;
}

export function BulkUploadTrack() {
  const navigate = useNavigate();
  const { getToken } = useAuthToken();
  const [state, setState] = useState<BulkUploadState>({
    defaultArtist: "",
    matches: [],
    currentUploadIndex: -1,
    uploadedTracks: [],
  });

  // Match .xm files with their cover art
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const trackFiles = new Map<string, File>();
    const artFiles = new Map<string, File>();

    // Sort files into tracks and art
    files.forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const baseName = file.name.substring(0, file.name.lastIndexOf("."));

      if (ext === "xm") {
        trackFiles.set(baseName, file);
      } else if (file.type.startsWith("image/")) {
        artFiles.set(baseName, file);
      }
    });

    // Match tracks with art
    const matches: FileMatch[] = [];
    trackFiles.forEach((trackFile, baseName) => {
      matches.push({
        track: trackFile,
        coverArt: artFiles.get(baseName),
        title: baseName,
      });
    });

    setState((prev) => ({
      ...prev,
      matches,
      currentUploadIndex: -1,
      uploadedTracks: [],
    }));
  };

  // Start the upload process
  const startUpload = async () => {
    setState((prev) => ({ ...prev, currentUploadIndex: 0 }));
    await uploadNext();
  };

  // Upload the next track in the queue
  const uploadNext = async () => {
    const { matches, currentUploadIndex, defaultArtist } = state;
    if (currentUploadIndex >= matches.length) return;

    const match = matches[currentUploadIndex];
    const formData = new FormData();

    formData.append(
      "data",
      JSON.stringify({
        title: match.title,
        artist: defaultArtist,
        originalFormat: "xm",
      })
    );

    formData.append("original", match.track);
    if (match.coverArt) {
      formData.append("coverArt", match.coverArt);
    }

    try {
      const data = await api.track.upload(formData, getToken()!);
      setState((prev) => ({
        ...prev,
        uploadedTracks: [...prev.uploadedTracks, data.id],
        currentUploadIndex: prev.currentUploadIndex + 1,
      }));

      // Continue with next file if there are more
      if (currentUploadIndex + 1 < matches.length) {
        await uploadNext();
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: `Failed to upload ${match.title}: ${error}`,
      }));
    }
  };

  const progress =
    state.currentUploadIndex === -1
      ? 0
      : (state.currentUploadIndex / state.matches.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Bulk Upload Tracks</h1>

      <div className="space-y-6">
        <FormInput
          id="files"
          type="file"
          label="Select Track Files (.xm) and Cover Art"
          accept=".xm,image/*"
          multiple
          onChange={handleFileSelect}
        />

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
        />

        {state.matches.length > 0 && (
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">
              Found {state.matches.length} tracks:
            </h2>
            <ul className="space-y-2">
              {state.matches.map((match, i) => (
                <li
                  key={match.title}
                  className={`flex items-center space-x-2 ${
                    i < state.currentUploadIndex
                      ? "text-green-600"
                      : i === state.currentUploadIndex
                      ? "text-blue-600 font-medium"
                      : ""
                  }`}
                >
                  <span>{match.title}</span>
                  {match.coverArt && (
                    <span className="text-sm text-gray-500">
                      (with cover art)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {state.error && <FormError message={state.error} />}

        {state.currentUploadIndex >= 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <FormButton
          onClick={startUpload}
          disabled={state.matches.length === 0 || state.currentUploadIndex >= 0}
        >
          {state.currentUploadIndex >= 0
            ? `Uploading (${state.currentUploadIndex + 1}/${
                state.matches.length
              })`
            : "Start Upload"}
        </FormButton>

        {state.uploadedTracks.length === state.matches.length && (
          <div className="text-center text-green-600">
            All tracks uploaded successfully!
          </div>
        )}
      </div>
    </div>
  );
}
