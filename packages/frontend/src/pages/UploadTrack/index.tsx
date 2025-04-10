import { useNavigate, Link } from "react-router-dom";
import { useAuthToken } from "@/hooks/useAuthToken";
import { api } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import type { License } from "@wavtopia/core-storage";
import { UploadTrackForm } from "./UploadTrackForm";

export function UploadTrack() {
  const navigate = useNavigate();
  const { getToken } = useAuthToken();

  const { data: licenses, isLoading: isLoadingLicenses } = useQuery<License[]>({
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

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Upload Track</h1>
      <UploadTrackForm
        licenses={licenses}
        isLoadingLicenses={isLoadingLicenses}
        onSubmit={async (values) => {
          const formData = new FormData();
          formData.append(
            "data",
            JSON.stringify({
              title: values.title,
              primaryArtistName: values.primaryArtistName,
              originalFormat: values.originalFormat,
              bpm: values.bpm,
              key: values.key,
              genreNames: values.genreNames,
              description: values.description,
              isExplicit: values.isExplicit,
              isPublic: values.isPublic,
              licenseId: values.licenseId,
              ...(values.releaseDate && {
                releaseDate: values.releaseDate.toISOString(),
                releaseDatePrecision: values.releaseDatePrecision,
              }),
            })
          );
          formData.append("original", values.original!);
          if (values.coverArt) {
            formData.append("coverArt", values.coverArt);
          }

          // TODO: Handle quota warning if returned.
          const data = await api.track.upload(formData, getToken()!);
          navigate(`/track/${data.track.id}`);
        }}
      />

      <p className="text-center text-sm mt-4">
        Need to upload multiple tracks?{" "}
        <Link
          to="/upload/bulk"
          className="text-primary-600 hover:text-primary-700 underline"
        >
          Try bulk upload
        </Link>
      </p>
    </div>
  );
}
