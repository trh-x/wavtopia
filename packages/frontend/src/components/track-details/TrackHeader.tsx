import { styles } from "../../styles/common";

interface TrackHeaderProps {
  title: string;
  artist: string;
  coverArt?: string;
}

export function TrackHeader({ title, artist, coverArt }: TrackHeaderProps) {
  return (
    <div className={`${styles.container.flexRow} mb-8`}>
      {coverArt && (
        <img
          src={coverArt}
          alt={title}
          className="w-48 h-48 object-cover rounded-lg"
        />
      )}
      <div>
        <h1 className={styles.text.title}>{title}</h1>
        <p className={styles.text.subtitle}>{artist}</p>
      </div>
    </div>
  );
}
