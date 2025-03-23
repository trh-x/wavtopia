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
import { LicenseSelect } from "@/components/ui/LicenseSelect";
import { useForm } from "@/hooks/useForm";
import type { License, Track } from "@wavtopia/core-storage";

interface EditTrackFormData {
  title: string;
  primaryArtistName: string;
  bpm: number | undefined;
  key: string | undefined;
  genreNames: string[];
  description: string | undefined;
  isExplicit: boolean;
  releaseDate: Date | undefined;
  releaseDatePrecision: DatePrecision;
  licenseId: string | undefined;
}

interface EditTrackFormProps {
  track: Track;
  licenses: License[] | undefined;
  isLoadingLicenses: boolean;
  onSave: (values: EditTrackFormData) => Promise<void>;
  onCancel: () => void;
}

export function EditTrackForm({
  track,
  licenses,
  isLoadingLicenses,
  onSave,
  onCancel,
}: EditTrackFormProps) {
  const { values, handleChange, handleSubmit, isSubmitting, submitError } =
    useForm<EditTrackFormData>({
      initialValues: {
        title: track.title,
        primaryArtistName: track.primaryArtistName ?? "",
        bpm: track.bpm ?? undefined,
        key: track.key ?? undefined,
        genreNames: track.genreNames || [],
        description: track.description ?? undefined,
        isExplicit: track.isExplicit,
        releaseDate: track.releaseDate
          ? new Date(track.releaseDate)
          : undefined,
        releaseDatePrecision:
          (track.releaseDatePrecision as DatePrecision) ?? "DAY",
        licenseId: track.licenseId ?? undefined,
      },
      onSubmit: onSave,
    });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormInput
        id="title"
        type="text"
        label="Title"
        value={values.title}
        onChange={(e) => handleChange("title", e.target.value)}
        required
      />

      <FormInput
        id="primaryArtistName"
        type="text"
        label="Primary Artist Name"
        value={values.primaryArtistName}
        onChange={(e) => handleChange("primaryArtistName", e.target.value)}
        required
      />

      <FormTagInput
        id="genreNames"
        label="Genres"
        value={values.genreNames}
        onChange={(genreNames: string[]) =>
          handleChange("genreNames", genreNames)
        }
        placeholder="Add a genre"
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
                e.target.value ? parseFloat(e.target.value) : undefined
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
            onChange={(e) => handleChange("key", e.target.value || undefined)}
          />
        </div>
        <div className="flex-1">
          <FormSwitch
            id="isExplicit"
            label="Contains explicit content"
            checked={values.isExplicit}
            onCheckedChange={(checked) => handleChange("isExplicit", checked)}
            description={values.isExplicit ? "Yes" : "No"}
          />
        </div>
      </div>

      <FormDateWithPrecision
        id="releaseDate"
        label="Release Date"
        value={values.releaseDate}
        precision={values.releaseDatePrecision}
        onChange={(date) => handleChange("releaseDate", date)}
        onPrecisionChange={(precision) =>
          handleChange("releaseDatePrecision", precision)
        }
      />

      <FormTextArea
        id="description"
        label="Description"
        rows={4}
        placeholder="Add a description for your track..."
        value={values.description || ""}
        onChange={(e) =>
          handleChange("description", e.target.value || undefined)
        }
      />

      <LicenseSelect
        value={values.licenseId}
        onChange={(value) => handleChange("licenseId", value)}
        licenses={licenses}
        required
        isLoading={isLoadingLicenses}
        disabled={isSubmitting}
      />

      {submitError && <FormError message={submitError} />}

      <div className="flex justify-end space-x-4">
        <FormButton
          type="button"
          onClick={onCancel}
          className="bg-gray-500 hover:bg-gray-600"
        >
          Cancel
        </FormButton>
        <FormButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </FormButton>
      </div>
    </form>
  );
}

export type { EditTrackFormData };
