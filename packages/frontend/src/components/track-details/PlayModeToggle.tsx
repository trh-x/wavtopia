import { PlaybackContext } from "@/pages/TrackDetails/contexts/PlaybackContext";
import { useContext } from "react";
import { Toggle } from "../ui/Toggle";

export function PlayModeToggle() {
  const playbackContext = useContext(PlaybackContext);

  if (!playbackContext) {
    return null;
  }

  const { playMode, setPlayMode } = playbackContext;

  return (
    <Toggle
      value={playMode}
      options={[
        { value: "preview", label: "Preview" },
        { value: "sync", label: "Sync" },
      ]}
      onChange={setPlayMode}
    />
  );
}
