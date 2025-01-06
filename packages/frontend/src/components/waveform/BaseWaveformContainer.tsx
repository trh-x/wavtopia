import { ReactNode, RefObject } from "react";

interface BaseWaveformContainerProps {
  containerRef: RefObject<HTMLDivElement>;
  height: number;
  isPlaying: boolean;
  isMuted?: boolean;
  children: ReactNode;
}

export function BaseWaveformContainer({
  containerRef,
  height,
  isPlaying,
  isMuted = false,
  children,
}: BaseWaveformContainerProps) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="flex gap-2">{children}</div>
      <div
        ref={containerRef}
        className={`flex-grow ${
          isPlaying
            ? isMuted
              ? "opacity-60" // Muted state
              : "" // Playing state
            : "opacity-70" // Stopped state
        }`}
        style={{ minHeight: `${height}px` }}
      />
    </div>
  );
}
