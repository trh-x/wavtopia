import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { useAuthToken } from "../../hooks/useAuthToken";
import { useToasts } from "../../hooks/useToasts";
import { useTrackAudioProcessingPolling } from "../../hooks/useTrackAudioProcessingPolling";
import { api } from "../../api/client";
import { Track } from "@/types";
import {
  ArrowUpTrayIcon,
  XMarkIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";
import { DropZone } from "../ui/DropZone";

interface ReplaceTrackAudioProps {
  track: Track;
}

export function ReplaceTrackAudio({ track }: ReplaceTrackAudioProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAudioProcessing, setIsAudioProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { getToken } = useAuthToken();
  const { addToast } = useToasts();
  const queryClient = useQueryClient();

  // Only show for forked tracks owned by the current user
  const canReplaceAudio = track.isFork && user && track.userId === user.id;

  // Track audio processing polling
  useTrackAudioProcessingPolling({
    trackId: track.id,
    isProcessing: isAudioProcessing,
    onProcessingComplete: () => {
      setIsAudioProcessing(false);
    },
  });

  const replaceAudioMutation = useMutation({
    mutationFn: async (file: File) => {
      const token = getToken();
      if (!token) throw new Error("No authentication token");

      const formData = new FormData();
      formData.append("stemFile", file);

      return api.track.replaceAudio(track.id, formData, token);
    },
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Audio Replaced",
        message:
          "Track audio has been successfully replaced and is being processed.",
      });

      // Start audio processing polling
      setIsAudioProcessing(true);

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

  const handleFileSelect = (files: File[]) => {
    setSelectedFile(files[0] || null);
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
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={replaceAudioMutation.isPending || isAudioProcessing}
      >
        <ArrowUpTrayIcon className="h-4 w-4" />
        {isAudioProcessing ? "Processing..." : "Replace Audio"}
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
                        overwrite the current audio file. This action cannot be
                        undone.
                      </p>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Audio File
                      </label>

                      <DropZone
                        onFileSelect={handleFileSelect}
                        accept=".wav,.flac"
                        multiple={false}
                        className="h-32"
                        label="Drop audio file or click to browse"
                        sublabel=".wav or .flac files"
                      />
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
                            disabled={
                              replaceAudioMutation.isPending ||
                              isAudioProcessing
                            }
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
                  disabled={
                    !selectedFile ||
                    replaceAudioMutation.isPending ||
                    isAudioProcessing
                  }
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
                  disabled={replaceAudioMutation.isPending || isAudioProcessing}
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
