import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Track } from "@/types";
import { useState } from "react";
import { WaveformDisplay } from "../components/WaveformDisplay";
import { PlaybackProvider } from "../contexts/PlaybackContext";

// Custom hook for auth token
function useAuthToken() {
  return {
    getToken: () => localStorage.getItem("token"),
    getAuthHeader: () => `Bearer ${localStorage.getItem("token")}`,
    appendTokenToUrl: (url: string) =>
      `${url}?token=${localStorage.getItem("token")}`,
  };
}

// Helper function to get audio URL with token
function getAudioUrl(path: string): string {
  const { appendTokenToUrl } = useAuthToken();
  return appendTokenToUrl(path);
}

// Common button styles
const buttonStyles = {
  base: "px-4 py-2 rounded-lg",
  active: "bg-primary-600 text-white",
  inactive: "bg-gray-100 text-gray-700 hover:bg-gray-200",
};

// View mode toggle component
function ViewModeToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onViewModeChange("grid")}
        className={`${buttonStyles.base} ${
          viewMode === "grid" ? buttonStyles.active : buttonStyles.inactive
        }`}
      >
        Grid View
      </button>
      <button
        onClick={() => onViewModeChange("list")}
        className={`${buttonStyles.base} ${
          viewMode === "list" ? buttonStyles.active : buttonStyles.inactive
        }`}
      >
        List View
      </button>
    </div>
  );
}

// Helper function for download links
function DownloadLink({
  href,
  onClick,
  className,
  children,
}: {
  href: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const { appendTokenToUrl } = useAuthToken();
  const defaultOnClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = appendTokenToUrl(href);
  };

  return (
    <a
      href={href}
      onClick={onClick || defaultOnClick}
      className={
        className ||
        "inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
      }
    >
      {children}
    </a>
  );
}

// Component for track component downloads
function ComponentDownloadButtons({
  trackId,
  componentId,
}: {
  trackId: string;
  componentId: string;
}) {
  return (
    <div className="space-x-2">
      <DownloadLink
        href={`/api/tracks/${trackId}/component/${componentId}.wav`}
        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
      >
        WAV
      </DownloadLink>
      <DownloadLink
        href={`/api/tracks/${trackId}/component/${componentId}.mp3`}
        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
      >
        MP3
      </DownloadLink>
    </div>
  );
}

// Component for rendering a single track component
function TrackComponent({
  component,
  trackId,
  isGridView,
}: {
  component: Track["components"][0];
  trackId: string;
  isGridView: boolean;
}) {
  return (
    <div
      className={`bg-white p-4 rounded-lg ${
        isGridView ? "shadow-sm" : "shadow flex flex-col"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3
            className={`${isGridView ? "font-medium" : "text-lg font-medium"}`}
          >
            {component.name}
          </h3>
          {isGridView && (
            <p className="text-sm text-gray-500">{component.type}</p>
          )}
        </div>
        <ComponentDownloadButtons
          trackId={trackId}
          componentId={component.id}
        />
      </div>
      <WaveformDisplay
        waveformData={component.waveformData}
        height={isGridView ? 48 : 64}
        color="#4b5563"
        progressColor="#6366f1"
        audioUrl={getAudioUrl(
          `/api/tracks/${trackId}/component/${component.id}.mp3`
        )}
      />
    </div>
  );
}

async function fetchTrack(id: string): Promise<Track> {
  const { getAuthHeader } = useAuthToken();
  const response = await fetch(`/api/tracks/${id}`, {
    headers: {
      Authorization: getAuthHeader(),
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch track");
  }
  return response.json();
}

export function TrackDetails() {
  const { id } = useParams<{ id: string }>();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const {
    data: track,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["track", id],
    queryFn: () => fetchTrack(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !track) {
    return <div>Error loading track</div>;
  }

  return (
    <PlaybackProvider>
      <div>
        <div className="flex items-center gap-6 mb-8">
          {track.coverArt && (
            <img
              src={track.coverArt}
              alt={track.title}
              className="w-48 h-48 object-cover rounded-lg"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold">{track.title}</h1>
            <p className="text-xl text-gray-600">{track.artist}</p>
          </div>
        </div>

        {/* Full track waveform at the top */}
        <div className="mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <WaveformDisplay
              waveformData={track.waveformData}
              height={96}
              audioUrl={getAudioUrl(`/api/tracks/${track.id}/full.mp3`)}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            <DownloadLink href={`/api/tracks/${track.id}/original`}>
              Download Original {track.originalFormat.toUpperCase()} File
            </DownloadLink>
            <DownloadLink href={`/api/tracks/${track.id}/full`}>
              WAV
            </DownloadLink>
            <DownloadLink href={`/api/tracks/${track.id}/full.mp3`}>
              MP3
            </DownloadLink>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Components</h2>
            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>

          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                : "space-y-4"
            }
          >
            {track.components.map((component) => (
              <TrackComponent
                key={component.id}
                component={component}
                trackId={track.id}
                isGridView={viewMode === "grid"}
              />
            ))}
          </div>
        </div>
      </div>
    </PlaybackProvider>
  );
}
