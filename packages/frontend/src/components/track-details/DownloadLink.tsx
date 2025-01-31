import { useAuthToken } from "../../hooks/useAuthToken";
import { styles } from "../../styles/common";
import { useAudioFileConversion } from "../../hooks/useAudioFileConversion";
import { Component, Track } from "@/types"; // TODO: Rename Component to save confusion with React.

interface DownloadLinkProps {
  href: string;
  small?: boolean;
  children: React.ReactNode;
}

interface ConvertAudioFileProps {
  href: string;
  small?: boolean;
  track: Track;
  type: "full" | "component";
  component?: Component;
  format: "wav" | "flac";
  children: React.ReactNode;
}

export function DownloadLink({ href, small, children }: DownloadLinkProps) {
  const { appendTokenToUrl } = useAuthToken();
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = appendTokenToUrl(href);
  };

  return (
    <a
      href={href}
      onClick={onClick}
      className={small ? styles.button.small : styles.button.inactive}
    >
      {children}
    </a>
  );
}

export function ConvertAudioFile({
  href,
  small,
  track,
  type,
  component,
  format,
  children,
}: ConvertAudioFileProps) {
  const { appendTokenToUrl } = useAuthToken();
  const { status, isConverting, startConversion } = useAudioFileConversion({
    track,
    type,
    component,
    format,
  });

  const showConversionIcon = status !== "COMPLETED";

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (showConversionIcon) {
      startConversion();
    } else {
      window.location.href = appendTokenToUrl(href);
    }
  };

  // TODO: Add a tooltip to explain the conversion process
  return (
    <a
      href={status === "COMPLETED" ? href : "#"}
      onClick={handleClick}
      className={`inline-flex items-center space-x-1 ${
        small ? "text-sm" : ""
      } text-primary-600 hover:text-primary-700 font-medium`}
      download
    >
      {showConversionIcon ? (
        isConverting ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )
      ) : null}
      <span>{children}</span>
    </a>
  );
}

interface AudioFileDownloadButtonProps {
  track: Track;
  component: Component;
  format: "wav" | "flac";
}

function AudioFileDownloadButton({
  track,
  component,
  format,
}: AudioFileDownloadButtonProps) {
  const downloadProps = {
    href: `/api/track/${track.id}/component/${component.id}.${format}`,
    children: format === "wav" ? "WAV" : "FLAC",
    small: true,
  };

  const audioFileUrl =
    format === "wav" ? component?.wavUrl : component?.flacUrl;

  if (audioFileUrl) {
    return <DownloadLink {...downloadProps} />;
  }

  return (
    <ConvertAudioFile
      {...downloadProps}
      track={track}
      type="component"
      component={component}
      format={format}
    />
  );
}

export function ComponentDownloadButtons({
  track,
  component,
}: {
  track: Track;
  component: Component;
}) {
  return (
    <div className="flex gap-2">
      <DownloadLink
        href={`/api/track/${track.id}/component/${component.id}.mp3`}
        small
      >
        MP3
      </DownloadLink>
      <AudioFileDownloadButton
        track={track}
        component={component}
        format="flac"
      />
      <AudioFileDownloadButton
        track={track}
        component={component}
        format="wav"
      />
    </div>
  );
}
