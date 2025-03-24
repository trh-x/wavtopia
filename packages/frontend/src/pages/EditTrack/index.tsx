import { useNavigate, useParams } from "react-router-dom";
import { useAuthToken } from "@/hooks/useAuthToken";
import { api } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import type { License, Track } from "@wavtopia/core-storage";
import { EditTrackForm, type EditTrackFormData } from "./EditTrackForm";

export function EditTrack() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuthToken();
  const token = getToken();

  const { data: track, isLoading: isLoadingTrack } = useQuery<Track>({
    queryKey: ["track", id],
    queryFn: async () => {
      const response = await api.track.get(id!, token);
      return response;
    },
    enabled: !!id && !!token,
  });

  const {
    data: licenses,
    isLoading: isLoadingLicenses,
    error: licensesError,
  } = useQuery<License[]>({
    queryKey: ["licenses"],
    queryFn: async () => {
      const response = await fetch("/api/licenses", {
        headers: {
          Authorization: `Bearer ${getToken()!}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch licenses");
      }
      return response.json();
    },
  });

  const handleSave = async (values: EditTrackFormData) => {
    if (!token) {
      throw new Error("Authentication required");
    }

    if (!values.licenseId) {
      throw new Error("License selection is required");
    }

    await api.track.update(
      id!,
      {
        title: values.title,
        primaryArtistName: values.primaryArtistName,
        bpm: values.bpm,
        key: values.key,
        genreNames: values.genreNames,
        description: values.description,
        isExplicit: values.isExplicit,
        licenseId: values.licenseId,
        ...(values.releaseDate && {
          releaseDate: values.releaseDate.toISOString(),
          releaseDatePrecision: values.releaseDatePrecision,
        }),
      },
      token
    );

    navigate(`/track/${id}`);
  };

  if (isLoadingTrack) {
    return <div>Loading...</div>;
  }

  if (!track) {
    return <div>Track not found</div>;
  }

  if (licensesError) {
    return <div>Failed to load licenses. Please try again later.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Track Info</h1>
      <EditTrackForm
        track={track}
        licenses={licenses}
        isLoadingLicenses={isLoadingLicenses}
        onSave={handleSave}
        onCancel={() => navigate(`/track/${id}`)}
      />
    </div>
  );
}
