import { useState, useEffect, useRef } from "react";
import { useAuthToken } from "../../hooks/useAuthToken";
import { usePresignedUrl } from "../../hooks/usePresignedUrl";
import { styles } from "../../styles/common";
import { useAudioFileConversion } from "../../hooks/useAudioFileConversion";
import { Stem, Track } from "@/types";

interface DownloadLinkProps {
  href: string;
  small?: boolean;
  children: React.ReactNode;
  usePresigned?: boolean;
}

interface ConvertAudioFileProps {
  href: string;
  small?: boolean;
  track: Track;
  type: "full" | "stem";
  stem?: Stem;
  format: "wav" | "flac";
  children: React.ReactNode;
}

function DirectDownloadLink({
  href,
  small,
  children,
}: Omit<DownloadLinkProps, "usePresigned">) {
  const { appendTokenToUrl } = useAuthToken();

  return (
    <a
      href={appendTokenToUrl(href)}
      className={small ? styles.button.small : styles.button.inactive}
      download
    >
      {children}
    </a>
  );
}

function PresignedDownloadLink({
  href,
  small,
  children,
}: Omit<DownloadLinkProps, "usePresigned">) {
  const { getPresignedUrl, isLoading } = usePresignedUrl();
  const [downloadUrl, setDownloadUrl] = useState<string>("#");
  const [shouldDownload, setShouldDownload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (shouldDownload && downloadUrl !== "#" && linkRef.current) {
      linkRef.current.click();
      setShouldDownload(false);
    }
  }, [downloadUrl, shouldDownload]);

  const onClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (downloadUrl !== "#") {
      return;
    }

    e.preventDefault();

    try {
      const url = await getPresignedUrl(href);
      setDownloadUrl(url);
      setShouldDownload(true);
    } catch (err) {
      console.error("Failed to get download URL:", err);
      setError("Failed to get download URL");
    }
  };

  return (
    <a
      ref={linkRef}
      href={downloadUrl}
      onClick={onClick}
      className={`${small ? styles.button.small : styles.button.inactive} ${
        isLoading
          ? "opacity-50 cursor-wait"
          : error
          ? "opacity-50 cursor-not-allowed"
          : ""
      }`}
      title={error || undefined}
      download
    >
      {isLoading ? "Loading..." : children}
    </a>
  );
}

export function DownloadLink({
  usePresigned = false,
  ...props
}: DownloadLinkProps) {
  return usePresigned ? (
    <PresignedDownloadLink {...props} />
  ) : (
    <DirectDownloadLink {...props} />
  );
}

export function ConvertAudioFile({
  href,
  small,
  track,
  type,
  stem,
  format,
  children,
}: ConvertAudioFileProps) {
  const { getPresignedUrl, isLoading: isUrlLoading } = usePresignedUrl();
  const { status, isConverting, startConversion } = useAudioFileConversion({
    track,
    type,
    stem,
    format,
  });
  const [downloadUrl, setDownloadUrl] = useState<string>("#");
  const [shouldDownload, setShouldDownload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const showConversionIcon = status !== "COMPLETED";
  const isLoading = isUrlLoading || isConverting;

  useEffect(() => {
    if (shouldDownload && downloadUrl !== "#" && linkRef.current) {
      linkRef.current.click();
      setShouldDownload(false);
    }
  }, [downloadUrl, shouldDownload]);

  const handleClick = async (e: React.MouseEvent) => {
    if (downloadUrl !== "#") {
      return;
    }

    e.preventDefault();

    if (showConversionIcon) {
      startConversion();
    } else if (downloadUrl === "#") {
      try {
        const url = await getPresignedUrl(href);
        setDownloadUrl(url);
        setShouldDownload(true);
      } catch (err) {
        console.error("Failed to get download URL:", err);
        setError("Failed to get download URL");
      }
    }
  };

  // TODO: Add a tooltip to explain the conversion process
  return (
    <a
      ref={linkRef}
      href={downloadUrl}
      onClick={handleClick}
      className={`inline-flex items-center space-x-1 ${
        small ? "text-sm" : ""
      } text-primary-600 hover:text-primary-700 font-medium ${
        isLoading || error ? "opacity-50 cursor-wait" : ""
      }`}
      title={error || undefined}
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
      ) : isUrlLoading ? (
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
      ) : null}
      <span>{children}</span>
    </a>
  );
}

interface StemAudioFileDownloadButtonProps {
  track: Track;
  stem: Stem;
  format: "wav" | "flac";
}

function StemAudioFileDownloadButton({
  track,
  stem,
  format,
}: StemAudioFileDownloadButtonProps) {
  const downloadProps = {
    href: `/api/track/${track.id}/stem/${stem.id}.${format}?attachment`,
    children: format === "wav" ? "WAV" : "FLAC",
    small: true,
    usePresigned: true,
  };

  const audioFileUrl = format === "wav" ? stem.wavUrl : stem.flacUrl;

  if (audioFileUrl) {
    return <DownloadLink {...downloadProps} />;
  }

  return (
    <ConvertAudioFile
      {...downloadProps}
      track={track}
      type="stem"
      stem={stem}
      format={format}
    />
  );
}

export function StemDownloadButtons({
  track,
  stem,
}: {
  track: Track;
  stem: Stem;
}) {
  return (
    <div className="flex gap-2">
      <DownloadLink
        href={`/api/track/${track.id}/stem/${stem.id}.mp3?attachment`}
        small
        usePresigned
      >
        MP3
      </DownloadLink>
      <StemAudioFileDownloadButton track={track} stem={stem} format="flac" />
      <StemAudioFileDownloadButton track={track} stem={stem} format="wav" />
    </div>
  );
}
