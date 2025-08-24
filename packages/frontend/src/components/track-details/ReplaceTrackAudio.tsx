import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { useAuthToken } from "../../hooks/useAuthToken";
import { useToasts } from "../../hooks/useToasts";
import { api } from "../../api/client";
import { Track } from "@/types";
import {
  ArrowUpTrayIcon,
  XMarkIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";

interface ReplaceTrackAudioProps {
  track: Track;
}

export function ReplaceTrackAudio({ track }: ReplaceTrackAudioProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { getToken } = useAuthToken();
  const { addToast } = useToasts();
  const queryClient = useQueryClient();

  // Only show for forked tracks owned by the current user
  const canReplaceAudio = track.isFork && user && track.userId === user.id;

  const replaceAudioMutation = useMutation({
    mutationFn: async (file: File) => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");

      const formData = new FormData();
      formData.append("original", file);

      return api.track.replaceAudio(track.id, formData, token);
    },
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Audio Replaced",
        message:
          "Track audio has been successfully replaced and is being processed.",
      });

      // Invalidate and refetch track data
      queryClient.invalidateQueries({ queryKey: ["track", track.id] });

      // Close modal and reset state
      setIsOpen(false);
      setSelectedFile(null);
    },
    onError: (error) => {
      console.error("Error replacing track audio:", error);
      addToast({
        type: "error",
        title: "Replacement Failed",
        message:
          error instanceof Error
            ? error.message
            : "Failed to replace track audio",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith(".wav") && !fileName.endsWith(".flac")) {
        addToast({
          type: "error",
          title: "Invalid File Type",
          message:
            "Only WAV and FLAC files are supported for track audio replacement.",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) return;
    replaceAudioMutation.mutate(selectedFile);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!canReplaceAudio) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        disabled={replaceAudioMutation.isPending}
      >
        <ArrowUpTrayIcon className="h-4 w-4" />
        Replace Audio
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={handleCancel}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Replace Track Audio
                    </h3>

                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        <strong>Warning:</strong> Replacing the track audio will
                        overwrite the current audio file and regenerate all
                        derivatives (MP3, WAV, FLAC). This action cannot be
                        undone.
                      </p>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">
                        Upload a new audio file to replace the current track
                        audio. Only WAV and FLAC files are supported.
                      </p>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Audio File
                      </label>

                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                        <div className="space-y-1 text-center">
                          <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label
                              htmlFor="audio-upload"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                            >
                              <span>Upload a file</span>
                              <input
                                id="audio-upload"
                                ref={fileInputRef}
                                type="file"
                                className="sr-only"
                                accept=".wav,.flac"
                                onChange={handleFileSelect}
                                disabled={replaceAudioMutation.isPending}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            WAV or FLAC up to 50MB
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedFile && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DocumentIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900">
                              {selectedFile.name}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({formatFileSize(selectedFile.size)})
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = "";
                              }
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                            disabled={replaceAudioMutation.isPending}
                          >
                            <XMarkIcon className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selectedFile || replaceAudioMutation.isPending}
                  className="w-full inline-flex justify-center items-center gap-2 rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {replaceAudioMutation.isPending && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  Replace Audio
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={replaceAudioMutation.isPending}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
