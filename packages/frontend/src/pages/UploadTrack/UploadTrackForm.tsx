import { DropZone } from "@/components/ui/DropZone";
import { StemUpload, StemFile } from "@/components/ui/StemUpload";
import { TrackForm, BaseTrackFormData } from "@/components/forms/TrackForm";
import { useForm } from "@/hooks/useForm";
import type { License } from "@wavtopia/core-storage";

export interface UploadTrackFormData extends BaseTrackFormData {
  original: File | null;
  coverArt: File | null;
  originalFormat: string | undefined;
  stemFiles: StemFile[];
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
  isPublic: true,
  releaseDate: undefined,
  releaseDatePrecision: "DAY",
  licenseId: undefined,
  original: null,
  coverArt: null,
  originalFormat: undefined,
  stemFiles: [],
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
        format === "it" ||
          format === "mod" ||
          format === "wav" ||
          format === "flac"
          ? format
          : "xm"
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
            <p>.xm, .it, .mod, .wav, .flac files and optional cover art</p>
            <p className="text-gray-400">Click to select files</p>
          </div>
        }
        accept=".xm,.it,.mod,.wav,.flac,image/*"
        multiple={true}
        onFileSelect={(files) => {
          // First process any image files to ensure they're handled first for preview
          const imageFiles = files.filter((file) =>
            file.type.startsWith("image/")
          );
          const trackFiles = files.filter((file) =>
            file.name.toLowerCase().match(/\.(xm|it|mod|wav|flac)$/)
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

      {/* Show stem upload only for WAV/FLAC tracks */}
      {values.originalFormat &&
        ["wav", "flac"].includes(values.originalFormat) && (
          <StemUpload
            stemFiles={values.stemFiles}
            onStemFilesChange={(stemFiles) =>
              handleChange("stemFiles", stemFiles)
            }
            disabled={disabled || isSubmitting}
          />
        )}

      <TrackForm
        values={values}
        licenses={licenses}
        isLoadingLicenses={isLoadingLicenses}
        onFieldChange={handleFieldChange}
        onSubmit={handleFormSubmit}
        submitLabel="Upload Track"
        showCancelButton={false}
        disabled={disabled}
        submitDisabled={!(values.original && values.licenseId)}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
    </div>
  );
}
