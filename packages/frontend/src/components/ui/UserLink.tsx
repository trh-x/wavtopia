import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";

interface UserLinkProps {
  username: string;
  showAt?: boolean;
  className?: string;
}

export function UserLink({
  username,
  showAt = true,
  className,
}: UserLinkProps) {
  return (
    <Link
      to="#" // TODO: Update with user profile route when available
      className={cn(
        "text-primary-600 hover:text-primary-700 hover:underline font-medium",
        className
      )}
    >
      {showAt ? `@${username}` : username}
    </Link>
  );
}
