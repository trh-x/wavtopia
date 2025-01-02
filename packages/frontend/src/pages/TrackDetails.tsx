import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Track } from "@/types";
import * as Tone from "tone";
import { useState } from "react";

async function fetchTrack(id: string): Promise<Track> {
  const token = localStorage.getItem("token");
  const response = await fetch(`/api/tracks/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch track");
  }
  return response.json();
}

export function TrackDetails() {
  const { id } = useParams<{ id: string }>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [player, setPlayer] = useState<Tone.Player | null>(null);

  const {
    data: track,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["track", id],
    queryFn: () => fetchTrack(id!),
    enabled: !!id,
  });

  const handlePlayback = async () => {
    if (!track) return;

    if (!isPlaying) {
      try {
        await Tone.start();
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const audioUrl = `/api/tracks/${track.id}/full?token=${token}`;
        const newPlayer = new Tone.Player(audioUrl, () => {
          newPlayer.start();
          setIsPlaying(true);
        }).toDestination();

        setPlayer(newPlayer);
      } catch (error) {
        console.error("Playback error:", error);
        if (player) {
          player.stop();
          player.dispose();
          setPlayer(null);
        }
        setIsPlaying(false);
      }
    } else {
      if (player) {
        player.stop();
        player.dispose();
        setPlayer(null);
      }
      setIsPlaying(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !track) {
    return <div>Error loading track</div>;
  }

  return (
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
          <button
            onClick={handlePlayback}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            {isPlaying ? "Stop" : "Play"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Components</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {track.components.map((component) => (
            <div
              key={component.id}
              className="p-4 bg-white rounded-lg shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{component.name}</h3>
                  <p className="text-sm text-gray-500">{component.type}</p>
                </div>
                <a
                  href={`/api/tracks/${track.id}/component/${
                    component.id
                  }?token=${localStorage.getItem("token")}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const token = localStorage.getItem("token");
                    window.location.href = `/api/tracks/${track.id}/component/${component.id}?token=${token}`;
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Download WAV
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-4">
          <a
            href={`/api/tracks/${track.id}/original`}
            onClick={(e) => {
              e.preventDefault();
              const token = localStorage.getItem("token");
              window.location.href = `/api/tracks/${track.id}/original?token=${token}`;
            }}
            className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 mr-4"
          >
            Download Original {track.originalFormat.toUpperCase()} File
          </a>

          <a
            href={`/api/tracks/${track.id}/full?token=${localStorage.getItem(
              "token"
            )}`}
            onClick={(e) => {
              e.preventDefault();
              const token = localStorage.getItem("token");
              window.location.href = `/api/tracks/${track.id}/full?token=${token}`;
            }}
            className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Download Full Track WAV
          </a>
        </div>
      </div>
    </div>
  );
}
