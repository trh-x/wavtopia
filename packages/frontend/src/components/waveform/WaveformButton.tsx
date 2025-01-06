import { ReactNode } from "react";

interface WaveformButtonProps {
  onClick: () => void;
  disabled: boolean;
  variant?: "default" | "stop" | "solo";
  state?: "loading" | "playing" | "stopped" | "muted" | "soloed";
  title?: string;
  children: ReactNode;
}

export function WaveformButton({
  onClick,
  disabled,
  variant = "default",
  state = "stopped",
  title,
  children,
}: WaveformButtonProps) {
  const getButtonStyle = () => {
    if (disabled) return "cursor-not-allowed opacity-50 border-gray-200";

    switch (variant) {
      case "stop":
        return "bg-red-50 hover:bg-red-100 border-red-200";
      case "solo":
        if (state === "soloed") {
          return "bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-700";
        } else if (state === "playing") {
          return "bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-600";
        }
        return "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-400 hover:text-gray-600";
      default:
        switch (state) {
          case "playing":
            return "bg-blue-50 hover:bg-blue-100 border-blue-200";
          case "muted":
            return "opacity-60 bg-gray-100 border-gray-300";
          default:
            return "opacity-70 bg-red-50 hover:bg-red-100 border-red-200";
        }
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        flex-shrink-0
        p-2.5 rounded-full 
        shadow-md hover:shadow-lg 
        transition-all duration-200
        border
        ${getButtonStyle()}
      `}
    >
      {children}
    </button>
  );
}
