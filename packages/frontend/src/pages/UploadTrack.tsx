import { useNavigate, Link } from "react-router-dom";
import {
  FormInput,
  FormError,
  FormButton,
  FormTextArea,
  FormSwitch,
  FormTagInput,
  FormDateWithPrecision,
  DatePrecision,
} from "@/components/ui/forms";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { useForm } from "@/hooks/useForm";
import { useAuthToken } from "@/hooks/useAuthToken";
import { api } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import type { License } from "@wavtopia/core-storage";

const GENRE_PLACEHOLDERS = [
  "Electronic, House, Techno",
  "House, Techno, Ambient",
  "Drum & Bass, Dubstep, Garage",
  "Deep House, Tech House, Progressive",
  "Downtempo, Chill, Lo-fi",
  "Bass, Breaks, Electronica",
  "Hip Hop, Rock, House",
  "Jazz, Electronic, Folk",
  "R&B, Pop, Techno",
  "Classical, Ambient, Soul",
  "Indie, Metal, Electronica",
  "Blues, Funk, Drum & Bass",
  "Latin, Reggae, House",
  "Country, Pop, Lo-fi",
  "Soul, R&B, Gospel",
  "Jazz, Bebop, Swing",
  "Metal, Hard Rock, Punk",
  "Folk, Bluegrass, Country",
  "Reggae, Ska, Rocksteady",
  "Hip Hop, Trap, Grime",
  "Blues, Delta Blues, Chicago Blues",
  "Classical, Chamber, Baroque",
  "Salsa, Merengue, Bachata",
  "Indie Rock, Post-Rock, Shoegaze",
];

const GENRE_PLACEHOLDER =
  GENRE_PLACEHOLDERS[Math.floor(Math.random() * GENRE_PLACEHOLDERS.length)];

interface UploadFormData {
  title: string;
  primaryArtistName: string;
  originalFormat: string | null;
  original: File | null;
  coverArt: File | null;
  bpm: number | undefined;
  key: string | undefined;
  genres: string[];
  description: string | undefined;
  isExplicit: boolean;
  releaseDate: Date | undefined;
  releaseDatePrecision: DatePrecision;
  licenseId: string | undefined;
}

export function UploadTrack() {
  const navigate = useNavigate();
  const { getToken } = useAuthToken();

  const { data: licenses } = useQuery<License[]>({
    queryKey: ["licenses"],
    queryFn: async () => {
      const response = await fetch("/api/licenses", {
        headers: {
          Authorization: `Bearer ${getToken()!}`,
        },
      });
      return response.json();
    },
  });

  const { values, handleChange, handleSubmit, isSubmitting, submitError } =
    useForm<UploadFormData>({
      initialValues: {
        title: "",
        primaryArtistName: "",
        originalFormat: null,
        original: null,
        coverArt: null,
        bpm: undefined,
        key: undefined,
        genres: [],
        description: undefined,
        isExplicit: false,
        releaseDate: undefined,
        releaseDatePrecision: "DAY",
        licenseId: undefined,
      },
      onSubmit: async (values) => {
        if (!values.original) {
          throw new Error("Original track file is required");
        }
        if (!values.licenseId) {
          throw new Error("License selection is required");
        }

        const formData = new FormData();
        formData.append(
          "data",
          JSON.stringify({
            title: values.title,
            primaryArtistName: values.primaryArtistName,
            originalFormat: values.originalFormat,
            bpm: values.bpm,
            key: values.key,
            genres: values.genres,
            description: values.description,
            isExplicit: values.isExplicit,
            licenseId: values.licenseId,
            ...(values.releaseDate && {
              releaseDate: values.releaseDate.toISOString(),
              releaseDatePrecision: values.releaseDatePrecision,
            }),
          })
        );
        formData.append("original", values.original);
        if (values.coverArt) {
          formData.append("coverArt", values.coverArt);
        }

        const data = await api.track.upload(formData, getToken()!);
        navigate(`/track/${data.id}`);
      },
    });

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "original" | "coverArt"
  ) => {
    const file = e.target.files?.[0] || null;
    if (file && field === "original") {
      const format = file.name.split(".").pop()?.toLowerCase();
      if (format === "it") {
        handleChange("originalFormat", "it");
      } else if (format === "mod") {
        handleChange("originalFormat", "mod");
      } else {
        handleChange("originalFormat", "xm");
      }
    }
    handleChange(field, file);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Upload Track</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {submitError && <FormError message={submitError} />}

        <div className="space-y-4">
          <FormInput
            id="title"
            type="text"
            label="Title"
            required
            value={values.title}
            onChange={(e) => handleChange("title", e.target.value)}
          />

          <FormInput
            id="primaryArtistName"
            type="text"
            label="Artist"
            required
            value={values.primaryArtistName}
            onChange={(e) => handleChange("primaryArtistName", e.target.value)}
          />

          <FormTagInput
            id="genres"
            label="Genres"
            placeholder={GENRE_PLACEHOLDER}
            value={values.genres}
            onChange={(newGenres: string[]) =>
              handleChange("genres", newGenres)
            }
          />

          <div className="flex gap-4">
            <div className="flex-1">
              <FormInput
                id="bpm"
                type="number"
                label="BPM"
                min="1"
                max="999"
                step="1"
                value={values.bpm || ""}
                onChange={(e) =>
                  handleChange(
                    "bpm",
                    e.target.value ? parseFloat(e.target.value) : null
                  )
                }
              />
            </div>
            <div className="flex-1">
              <FormInput
                id="key"
                type="text"
                label="Musical Key"
                placeholder="e.g., C major, Am"
                value={values.key || ""}
                onChange={(e) => handleChange("key", e.target.value || null)}
              />
            </div>
            <div className="flex-1">
              <FormSwitch
                id="isExplicit"
                label="Contains explicit content"
                checked={values.isExplicit}
                onCheckedChange={(checked) =>
                  handleChange("isExplicit", checked)
                }
                description={values.isExplicit ? "Yes" : "No"}
              />
            </div>
          </div>

          <FormDateWithPrecision
            id="releaseDate"
            value={values.releaseDate}
            onChange={(date) => handleChange("releaseDate", date)}
            precision={values.releaseDatePrecision}
            onPrecisionChange={(precision) =>
              handleChange("releaseDatePrecision", precision)
            }
            max={new Date().toISOString().split("T")[0]}
          />

          <div className="space-y-2">
            <label
              htmlFor="license"
              className="block text-sm font-medium text-gray-700"
            >
              License
            </label>
            <Select
              value={values.licenseId}
              onValueChange={(value: string) =>
                handleChange("licenseId", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a license" />
              </SelectTrigger>
              <SelectContent>
                {licenses?.map((license) => (
                  <SelectItem key={license.id} value={license.id}>
                    {license.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {licenses?.find((l) => l.id === values.licenseId)?.description && (
              <p className="mt-1 text-sm text-gray-500">
                {licenses.find((l) => l.id === values.licenseId)?.description}
              </p>
            )}
          </div>

          <FormTextArea
            id="description"
            label="Description"
            rows={4}
            placeholder="Add a description for your track..."
            value={values.description || ""}
            onChange={(e) =>
              handleChange("description", e.target.value || null)
            }
          />

          <FormInput
            id="original"
            type="file"
            label="Original Track File (.xm, .it, .mod)"
            required
            accept=".xm,.it,.mod"
            onChange={(e) => handleFileChange(e, "original")}
          />

          <FormInput
            id="coverArt"
            type="file"
            label="Cover Art (optional)"
            accept="image/*"
            onChange={(e) => handleFileChange(e, "coverArt")}
          />
        </div>

        <FormButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Uploading..." : "Upload Track"}
        </FormButton>

        <p className="text-center text-sm mt-4">
          Need to upload multiple tracks?{" "}
          <Link
            to="/upload/bulk"
            className="text-primary-600 hover:text-primary-700 underline"
          >
            Try bulk upload
          </Link>
        </p>
      </form>
    </div>
  );
}
