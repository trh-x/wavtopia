import { DatePrecision } from "@wavtopia/core-storage";
import { cn } from "@/utils/cn";

interface ReleaseDateProps {
  date: Date | string | null;
  precision?: DatePrecision | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ReleaseDate({
  date,
  precision = "DAY",
  size = "md",
  className,
}: ReleaseDateProps) {
  if (!date) return null;

  const dateObj = typeof date === "string" ? new Date(date) : date;

  const formatDate = () => {
    switch (precision) {
      case "YEAR":
        return dateObj.getFullYear();
      case "MONTH":
        return dateObj.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
        });
      case "DAY":
      default:
        return dateObj.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
    }
  };

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <time
      title="Release date"
      dateTime={dateObj.toISOString()}
      className={cn(
        "text-gray-500 hover:text-gray-400 transition-colors",
        sizeClasses[size],
        className
      )}
    >
      {formatDate()}
    </time>
  );
}
