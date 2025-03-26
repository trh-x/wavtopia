import { DropZone } from "@/components/ui/DropZone";
import { TrackForm, BaseTrackFormData } from "@/components/forms/TrackForm";
import { useForm } from "@/hooks/useForm";
import type { License } from "@wavtopia/core-storage";

export interface UploadTrackFormData extends BaseTrackFormData {
  original: File | null;
  coverArt: File | null;
  originalFormat: string | undefined;
}

interface UploadTrackFormProps {
  licenses: License[] | undefined;
  isLoadingLicenses: boolean;
  onSubmit: (values: UploadTrackFormData) => Promise<void>;
  disabled?: boolean;
}

const EMPTY_FORM_VALUES: UploadTrackFormData = {
  title: "",
  primaryArtistName: "",
  bpm: undefined,
  key: undefined,
  genreNames: [],
  description: undefined,
  isExplicit: false,
  releaseDate: undefined,
  releaseDatePrecision: "DAY",
  licenseId: undefined,
  original: null,
  coverArt: null,
  originalFormat: undefined,
};

type FileField = "original" | "coverArt";

export function UploadTrackForm({
  licenses,
  isLoadingLicenses,
  onSubmit,
  disabled = false,
}: UploadTrackFormProps) {
  const { values, handleChange, handleSubmit, isSubmitting, submitError } =
    useForm<UploadTrackFormData>({
      initialValues: EMPTY_FORM_VALUES,
      onSubmit,
    });

  const handleFileSelect = (files: File[], field: FileField) => {
    const file = files[0] || null;
    if (file && field === "original") {
      const format = file.name.split(".").pop()?.toLowerCase();
      handleChange(
        "originalFormat",
        format === "it" || format === "mod" ? format : "xm"
      );
    }
    handleChange(field, file);
  };

  const handleFieldChange = (field: keyof BaseTrackFormData, value: any) => {
    handleChange(field, value);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(e);
  };

  return (
    <div className="space-y-6">
      <DropZone
        label="Drop track files here"
        sublabel={
          <div className="space-y-1.5">
            <p>.xm, .it, .mod files and optional cover art</p>
            <p className="text-gray-400">Click to select files</p>
          </div>
        }
        accept=".xm,.it,.mod,image/*"
        multiple={true}
        onFileSelect={(files) => {
          // First process any image files to ensure they're handled first for preview
          const imageFiles = files.filter((file) =>
            file.type.startsWith("image/")
          );
          const trackFiles = files.filter((file) =>
            file.name.toLowerCase().match(/\.(xm|it|mod)$/)
          );

          // Always update with the latest files
          if (imageFiles.length > 0) {
            handleFileSelect([imageFiles[0]], "coverArt");
          }

          if (trackFiles.length > 0) {
            handleFileSelect([trackFiles[0]], "original");
          }
        }}
        onFileRemove={(fileType) => {
          if (fileType === "track") {
            handleChange("original", null);
            handleChange("originalFormat", undefined);
          } else {
            handleChange("coverArt", null);
          }
        }}
        disabled={disabled || isSubmitting}
        selectedFiles={[values.original, values.coverArt]}
        error={submitError || undefined}
        showPreview={true}
      />

      <TrackForm
        values={values}
        licenses={licenses}
        isLoadingLicenses={isLoadingLicenses}
        onFieldChange={handleFieldChange}
        onSubmit={handleFormSubmit}
        submitLabel="Upload Track"
        showCancelButton={false}
        disabled={disabled}
        submitDisabled={!values.original}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
    </div>
  );
}
