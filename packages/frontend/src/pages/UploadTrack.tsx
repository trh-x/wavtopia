import { useNavigate, Link } from "react-router-dom";
import { FormInput, FormError, FormButton } from "@/components/ui/FormInput";
import { useForm } from "@/hooks/useForm";
import { useAuthToken } from "@/hooks/useAuthToken";
import { api } from "@/api/client";

interface UploadFormData {
  title: string;
  artist: string;
  originalFormat: string | null;
  original: File | null;
  coverArt: File | null;
}

export function UploadTrack() {
  const navigate = useNavigate();
  const { getToken } = useAuthToken();

  const { values, handleChange, handleSubmit, isSubmitting, submitError } =
    useForm<UploadFormData>({
      initialValues: {
        title: "",
        artist: "",
        originalFormat: null,
        original: null,
        coverArt: null,
      },
      onSubmit: async (values) => {
        if (!values.original) {
          throw new Error("Original track file is required");
        }

        const formData = new FormData();
        formData.append(
          "data",
          JSON.stringify({
            title: values.title,
            artist: values.artist,
            originalFormat: values.originalFormat,
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
            id="artist"
            type="text"
            label="Artist"
            required
            value={values.artist}
            onChange={(e) => handleChange("artist", e.target.value)}
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
            className="text-primary-600 hover:text-primary-700"
          >
            Try bulk upload
          </Link>
        </p>
      </form>
    </div>
  );
}
