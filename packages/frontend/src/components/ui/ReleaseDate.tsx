import { DatePrecision } from "@wavtopia/core-storage";
import { cn } from "@/utils/cn";

interface ReleaseDateProps {
  date: Date | string | null;
  precision?: DatePrecision | null;
  size?: "sm" | "md";
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

  return (
    <time
      dateTime={dateObj.toISOString()}
      className={cn(
        "text-gray-500",
        size === "sm" ? "text-xs" : "text-sm",
        className
      )}
    >
      {formatDate()}
    </time>
  );
}
