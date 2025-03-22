import { cn } from "@/utils/cn";

type Size = "sm" | "md" | "lg";

const sizeStyles: Record<
  Size,
  {
    pill: string;
    tag: string;
    gap: string;
  }
> = {
  // TODO: Review which of these sizes are used, and remove the unused ones
  sm: {
    pill: "px-2 py-0.5 text-xs",
    tag: "text-xs",
    gap: "gap-1.5",
  },
  md: {
    pill: "px-2.5 py-0.5 text-sm",
    tag: "text-sm",
    gap: "gap-2",
  },
  lg: {
    pill: "px-3 py-1 text-sm",
    tag: "text-sm",
    gap: "gap-2.5",
  },
};

interface MetadataPillProps {
  children: React.ReactNode;
  title?: string;
  size?: Size;
  className?: string;
}

export function MetadataPill({
  children,
  title,
  size = "md",
  className,
}: MetadataPillProps) {
  return (
    <span
      className={cn(
        "bg-blue-100 text-blue-800 rounded-full font-medium",
        sizeStyles[size].pill,
        className
      )}
      title={title}
    >
      {children}
    </span>
  );
}

interface GenreTagProps {
  genre: string;
  size?: Size;
  className?: string;
}

export function GenreTag({ genre, size = "md", className }: GenreTagProps) {
  return (
    <span
      className={cn(
        "text-blue-600 hover:text-blue-700 transition-colors",
        sizeStyles[size].tag,
        className
      )}
    >
      #{genre}
    </span>
  );
}

interface ExplicitBadgeProps {
  size?: Size;
  className?: string;
}

export function ExplicitBadge({ size = "md", className }: ExplicitBadgeProps) {
  return (
    <span
      className={cn(
        "shrink-0 bg-red-100 text-red-700 rounded font-medium",
        sizeStyles[size].pill,
        className
      )}
    >
      Explicit
    </span>
  );
}

interface TrackMetadataProps {
  format?: string;
  bpm?: number;
  musicalKey?: string;
  size?: Size;
  className?: string;
}

export function TrackMetadata({
  format,
  bpm,
  musicalKey,
  size = "md",
  className,
}: TrackMetadataProps) {
  return (
    <div className={cn("flex flex-wrap", sizeStyles[size].gap, className)}>
      {format && (
        <MetadataPill title="Track Format" size={size}>
          {format.toUpperCase()}
        </MetadataPill>
      )}
      {bpm && (
        <MetadataPill title="Tempo" size={size}>
          {bpm} BPM
        </MetadataPill>
      )}
      {musicalKey && (
        <MetadataPill title="Musical Key" size={size}>
          {musicalKey}
        </MetadataPill>
      )}
    </div>
  );
}

interface GenreListProps {
  genres: string[];
  size?: Size;
  className?: string;
}

export function GenreList({ genres, size = "md", className }: GenreListProps) {
  if (!genres?.length) return null;

  return (
    <div className={cn("flex flex-wrap", sizeStyles[size].gap, className)}>
      {genres.map((genre) => (
        <GenreTag key={genre} genre={genre} size={size} />
      ))}
    </div>
  );
}
