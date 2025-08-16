import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuthToken } from "@/hooks/useAuthToken";
import { Button } from "../ui/Button";
import {
  DocumentDuplicateIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { Track } from "@/types";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface ForkInfoProps {
  track: Track;
}

export function ForkInfo({ track }: ForkInfoProps) {
  const [showForksDialog, setShowForksDialog] = useState(false);
  const { getToken } = useAuthToken();

  const {
    data: forksData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["track-forks", track.id],
    queryFn: () => api.track.getForks(track.id, getToken()),
    enabled: showForksDialog,
  });

  // Show fork count if track has been forked
  const showForkCount = track.forkCount && track.forkCount > 0;

  // Show "forked from" if this is a fork
  const showForkedFrom = track.isFork && track.forkedFromId;

  if (!showForkCount && !showForkedFrom) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 text-sm text-gray-600">
      {showForkedFrom && (
        <div className="flex items-center gap-1">
          <DocumentDuplicateIcon className="w-4 h-4" />
          <span>Forked from</span>
          <Link
            to={`/track/${track.forkedFromId}`}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            original track
          </Link>
        </div>
      )}

      {showForkCount && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowForksDialog(true)}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
        >
          <DocumentDuplicateIcon className="w-4 h-4" />
          <span>
            {track.forkCount} {track.forkCount === 1 ? "fork" : "forks"}
          </span>
        </Button>
      )}

      {showForksDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowForksDialog(false)}
          />
          <div className="relative bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DocumentDuplicateIcon className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Fork Tree</h2>
              </div>
              <button
                onClick={() => setShowForksDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {isLoading && (
              <div className="py-8 text-center text-gray-500">
                Loading forks...
              </div>
            )}

            {error && (
              <div className="py-8 text-center text-red-600">
                Error loading forks: {(error as Error).message}
              </div>
            )}

            {forksData && (
              <div className="space-y-6">
                {/* Original Track */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-lg mb-2">Original</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link
                          to={`/track/${forksData.original.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800 block"
                          onClick={() => setShowForksDialog(false)}
                        >
                          {forksData.original.title}
                        </Link>
                        <p className="text-sm text-gray-600 mt-1">
                          by {forksData.original.user.username}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Created{" "}
                          {formatDistanceToNow(
                            new Date(forksData.original.createdAt)
                          )}{" "}
                          ago
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {forksData.original.isPublic ? (
                          <UserGroupIcon className="w-4 h-4" />
                        ) : (
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                            Private
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Forks */}
                {forksData.forks.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-4">
                      Forks ({forksData.total})
                    </h3>
                    <div className="space-y-3">
                      {forksData.forks.map((fork) => (
                        <div key={fork.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <Link
                                to={`/track/${fork.id}`}
                                className="font-medium text-blue-600 hover:text-blue-800 block"
                                onClick={() => setShowForksDialog(false)}
                              >
                                {fork.title}
                              </Link>
                              <p className="text-sm text-gray-600 mt-1">
                                by {fork.user.username}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Forked{" "}
                                {formatDistanceToNow(new Date(fork.createdAt))}{" "}
                                ago
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              {fork.isPublic ? (
                                <UserGroupIcon className="w-4 h-4" />
                              ) : (
                                <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                                  Private
                                </span>
                              )}
                              {fork.forkCount > 0 && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {fork.forkCount}{" "}
                                  {fork.forkCount === 1 ? "fork" : "forks"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {forksData.forks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No public forks found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
