import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface TrackFormData {
  title: string;
  artist: string;
  originalFormat: string;
  components: { name: string; type: string }[];
}

interface FileData {
  original: File | null;
  coverArt: File | null;
  components: File[];
}

export function UploadTrack() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<TrackFormData>({
    title: "",
    artist: "",
    originalFormat: "xm",
    components: [],
  });
  const [files, setFiles] = useState<FileData>({
    original: null,
    coverArt: null,
    components: [],
  });
  const [error, setError] = useState<string | null>(null);

  function handleComponentAdd() {
    setFormData((prev) => ({
      ...prev,
      components: [...prev.components, { name: "", type: "" }],
    }));
  }

  function handleComponentRemove(index: number) {
    setFormData((prev) => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index),
    }));
    setFiles((prev) => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index),
    }));
  }

  function handleComponentChange(
    index: number,
    field: "name" | "type",
    value: string
  ) {
    setFormData((prev) => ({
      ...prev,
      components: prev.components.map((comp, i) =>
        i === index ? { ...comp, [field]: value } : comp
      ),
    }));
  }

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

    if (files.components.length !== formData.components.length) {
      setError("Each component must have a WAV file");
      return;
    }

    try {
      const formDataToSend = new FormData();
      // Add track metadata as a single JSON string
      const metadata = {
        title: formData.title,
        artist: formData.artist,
        originalFormat: formData.originalFormat,
        components: formData.components,
      };
      formDataToSend.append("data", JSON.stringify(metadata));

      // Add files
      formDataToSend.append("original", files.original);
      if (files.coverArt) {
        formDataToSend.append("coverArt", files.coverArt);
      }
      files.components.forEach((file) => {
        formDataToSend.append("components", file);
      });

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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Track Components</h2>
            <button
              type="button"
              onClick={handleComponentAdd}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Add Component
            </button>
          </div>

          {formData.components.map((component, index) => (
            <div
              key={index}
              className="p-4 border border-gray-200 rounded-lg space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Component {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => handleComponentRemove(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={component.name}
                    onChange={(e) =>
                      handleComponentChange(index, "name", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <input
                    type="text"
                    required
                    value={component.type}
                    onChange={(e) =>
                      handleComponentChange(index, "type", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WAV File
                  </label>
                  <input
                    type="file"
                    required
                    accept=".wav"
                    onChange={(e) =>
                      setFiles((prev) => ({
                        ...prev,
                        components: prev.components.map((file, i) =>
                          i === index ? e.target.files?.[0] || file : file
                        ),
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ))}
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
