import { Track } from "@/types";
import { DownloadLink, ConvertAudioFile } from "./DownloadLink";
import { getAudioUrl } from "../../hooks/useAuthToken";
import { styles } from "../../styles/common";
import { TrackWaveformPlaceholder } from "../track-list/TrackList";
import { TrackDetailsWaveform } from "@/pages/TrackDetails/components/TrackDetailsWaveform";
import { useTrack } from "@/pages/TrackDetails/contexts/TrackContext";
import { useAuth } from "@/contexts/AuthContext";
import { LinkButton } from "@/components/ui/LinkButton";

interface AudioFileDownloadButtonProps {
  track: Track;
  format: "wav" | "flac";
}

function AudioFileDownloadButton({
  track,
  format,
}: AudioFileDownloadButtonProps) {
  const downloadProps = {
    href: `/api/track/${track.id}/full.${format}?attachment`,
    children: format === "wav" ? "WAV" : "FLAC",
    usePresigned: true,
  };

  const audioFileUrl =
    format === "wav" ? track.fullTrackWavUrl : track.fullTrackFlacUrl;

  if (audioFileUrl) {
    return <DownloadLink {...downloadProps} />;
  }

  return (
    <ConvertAudioFile
      {...downloadProps}
      track={track}
      type="full"
      format={format}
    />
  );
}

export function FullTrackSection() {
  const { track } = useTrack();
  const { user } = useAuth();
  const isOwner = user && track.userId === user.id;

  return (
    <div className={styles.container.section}>
      <div className={styles.container.card}>
        {track.originalUrl?.startsWith("file://") ? (
          <TrackWaveformPlaceholder height={96} />
        ) : (
          <TrackDetailsWaveform
            trackId={track.id}
            waveformData={track.waveformData}
            duration={track.duration ?? undefined}
            height={96}
            audioUrl={getAudioUrl(`/api/track/${track.id}/full.mp3`)}
            isFullTrack
            preloadMetadata // Irrelevant for synced playback where the full track is loaded
          />
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <DownloadLink href={`/api/track/${track.id}/original`}>
            Download Original {track.originalFormat.toUpperCase()} File
          </DownloadLink>
          <DownloadLink
            href={`/api/track/${track.id}/full.mp3?attachment`}
            usePresigned
          >
            MP3
          </DownloadLink>
          <AudioFileDownloadButton track={track} format="flac" />
          <AudioFileDownloadButton track={track} format="wav" />
        </div>
        {isOwner && (
          <LinkButton to={`/track/${track.id}/edit`} variant="link">
            <svg
              className="mr-1.5 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit Info
          </LinkButton>
        )}
      </div>
    </div>
  );
}
