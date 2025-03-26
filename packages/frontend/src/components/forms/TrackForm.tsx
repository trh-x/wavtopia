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

export interface BaseTrackFormData {
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

export interface TrackFormProps {
  values: BaseTrackFormData;
  licenses: License[] | undefined;
  isLoadingLicenses: boolean;
  onFieldChange: (field: keyof BaseTrackFormData, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  submitLabel?: string;
  showCancelButton?: boolean;
  disabled?: boolean;
  isSubmitting?: boolean;
  submitError: string | null;
  submitDisabled?: boolean;
}

export function TrackForm({
  values,
  licenses,
  isLoadingLicenses,
  onFieldChange,
  onSubmit,
  onCancel,
  submitLabel = "Save Changes",
  showCancelButton = true,
  disabled = false,
  isSubmitting = false,
  submitError,
  submitDisabled = false,
}: TrackFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormInput
        id="title"
        type="text"
        label="Title"
        value={values.title}
        onChange={(e) => onFieldChange("title", e.target.value)}
        required
        disabled={disabled || isSubmitting}
      />

      <FormInput
        id="primaryArtistName"
        type="text"
        label="Primary Artist Name"
        value={values.primaryArtistName}
        onChange={(e) => onFieldChange("primaryArtistName", e.target.value)}
        required
        disabled={disabled || isSubmitting}
      />

      <FormTagInput
        id="genreNames"
        label="Genres"
        value={values.genreNames}
        onChange={(genreNames: string[]) =>
          onFieldChange("genreNames", genreNames)
        }
        placeholder={`e.g., ${GENRE_PLACEHOLDER}`}
        disabled={disabled || isSubmitting}
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
              onFieldChange(
                "bpm",
                e.target.value ? parseFloat(e.target.value) : undefined
              )
            }
            disabled={disabled || isSubmitting}
          />
        </div>
        <div className="flex-1">
          <FormInput
            id="key"
            type="text"
            label="Musical Key"
            placeholder="e.g., C major, Am"
            value={values.key || ""}
            onChange={(e) => onFieldChange("key", e.target.value || undefined)}
            disabled={disabled || isSubmitting}
          />
        </div>
        <div className="flex-1">
          <FormSwitch
            id="isExplicit"
            label="Contains explicit content"
            checked={values.isExplicit}
            onCheckedChange={(checked) => onFieldChange("isExplicit", checked)}
            description={values.isExplicit ? "Yes" : "No"}
            disabled={disabled || isSubmitting}
          />
        </div>
      </div>

      <FormDateWithPrecision
        id="releaseDate"
        label="Release Date"
        value={values.releaseDate}
        precision={values.releaseDatePrecision}
        onChange={(date) => onFieldChange("releaseDate", date)}
        onPrecisionChange={(precision) =>
          onFieldChange("releaseDatePrecision", precision)
        }
        disabled={disabled || isSubmitting}
      />

      <FormTextArea
        id="description"
        label="Description"
        rows={4}
        placeholder="Add a description for your track..."
        value={values.description || ""}
        onChange={(e) =>
          onFieldChange("description", e.target.value || undefined)
        }
        disabled={disabled || isSubmitting}
      />

      <LicenseSelect
        value={values.licenseId}
        onChange={(value) => onFieldChange("licenseId", value)}
        licenses={licenses}
        required
        isLoading={isLoadingLicenses}
        disabled={disabled || isSubmitting}
      />

      {submitError && <FormError message={submitError} />}

      <div className="flex justify-end space-x-4">
        {showCancelButton && onCancel && (
          <FormButton
            type="button"
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-600"
            disabled={disabled || isSubmitting}
          >
            Cancel
          </FormButton>
        )}
        <FormButton
          type="submit"
          disabled={disabled || isSubmitting || submitDisabled}
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </FormButton>
      </div>
    </form>
  );
}
