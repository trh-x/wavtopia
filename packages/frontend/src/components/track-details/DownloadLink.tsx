import { useAuthToken } from "../../hooks/useAuthToken";
import { styles } from "../../styles/common";

interface DownloadLinkProps {
  href: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  children: React.ReactNode;
  small?: boolean;
}

export function DownloadLink({
  href,
  onClick,
  className,
  children,
  small = false,
}: DownloadLinkProps) {
  const { appendTokenToUrl } = useAuthToken();
  const defaultOnClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = appendTokenToUrl(href);
  };

  return (
    <a
      href={href}
      onClick={onClick || defaultOnClick}
      className={
        className || (small ? styles.button.small : styles.button.inactive)
      }
    >
      {children}
    </a>
  );
}

export function ComponentDownloadButtons({
  trackId,
  componentId,
}: {
  trackId: string;
  componentId: string;
}) {
  return (
    <div className="space-x-2">
      <DownloadLink
        href={`/api/track/${trackId}/component/${componentId}.wav`}
        small
      >
        WAV
      </DownloadLink>
      <DownloadLink
        href={`/api/track/${trackId}/component/${componentId}.mp3`}
        small
      >
        MP3
      </DownloadLink>
    </div>
  );
}
