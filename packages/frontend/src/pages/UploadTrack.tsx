import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface TrackFormData {
  title: string;
  artist: string;
  originalFormat: string;
}

interface FileData {
  original: File | null;
  coverArt: File | null;
}

export function UploadTrack() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<TrackFormData>({
    title: "",
    artist: "",
    originalFormat: "xm",
  });
  const [files, setFiles] = useState<FileData>({
    original: null,
    coverArt: null,
  });
  const [error, setError] = useState<string | null>(null);

  function handleOriginalFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Get the file extension without the dot
      const format = file.name.split(".").pop()?.toLowerCase() || "xm";
      setFormData((prev) => ({ ...prev, originalFormat: format }));
      setFiles((prev) => ({ ...prev, original: file }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!files.original) {
      setError("Original track file is required");
      return;
    }

    try {
      const formDataToSend = new FormData();
      // Add track metadata as a single JSON string
      const metadata = {
        title: formData.title,
        artist: formData.artist,
        originalFormat: formData.originalFormat,
      };
      formDataToSend.append("data", JSON.stringify(metadata));

      // Add files
      formDataToSend.append("original", files.original);
      if (files.coverArt) {
        formDataToSend.append("coverArt", files.coverArt);
      }

      const token = localStorage.getItem("token");
      const response = await fetch("/api/tracks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to upload track");
      }

      const track = await response.json();
      navigate(`/track/${track.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload track");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Upload Track</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Title
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="artist"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Artist
            </label>
            <input
              type="text"
              id="artist"
              required
              value={formData.artist}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, artist: e.target.value }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="original"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Original Track File (.xm or .XM)
            </label>
            <input
              type="file"
              id="original"
              required
              accept=".xm,.XM"
              onChange={handleOriginalFileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="coverArt"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Cover Art (optional)
            </label>
            <input
              type="file"
              id="coverArt"
              accept="image/*"
              onChange={(e) =>
                setFiles((prev) => ({
                  ...prev,
                  coverArt: e.target.files?.[0] || null,
                }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Upload Track
        </button>
      </form>
    </div>
  );
}
