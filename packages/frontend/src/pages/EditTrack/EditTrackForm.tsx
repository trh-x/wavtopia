import {
  TrackForm,
  type BaseTrackFormData,
} from "@/components/forms/TrackForm";
import { useForm } from "@/hooks/useForm";
import type { License, Track } from "@wavtopia/core-storage";

interface EditTrackFormProps {
  track: Track;
  licenses: License[] | undefined;
  isLoadingLicenses: boolean;
  onSave: (values: BaseTrackFormData) => Promise<void>;
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
    useForm<BaseTrackFormData>({
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
        releaseDatePrecision: track.releaseDatePrecision ?? "DAY",
        licenseId: track.licenseId ?? undefined,
      },
      onSubmit: onSave,
    });

  return (
    <TrackForm
      values={values}
      licenses={licenses}
      isLoadingLicenses={isLoadingLicenses}
      onFieldChange={handleChange}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel="Save Changes"
      isSubmitting={isSubmitting}
      submitError={submitError}
    />
  );
}

export type { BaseTrackFormData };
