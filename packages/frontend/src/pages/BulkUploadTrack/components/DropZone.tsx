import React from "react";
import { BaseDropZone } from "@/components/ui/BaseDropZone";

interface DropZoneProps {
  onFileSelect: (files: File[]) => void;
  disabled?: boolean;
  isDragging?: boolean;
  label?: string;
  sublabel?: React.ReactNode;
}

export function DropZone({
  onFileSelect,
  disabled,
  isDragging,
  label = "Drop track files here",
  sublabel = (
    <div className="space-y-1.5">
      <p>.xm, .it, .mod, .wav, .flac files and optional cover art</p>
      <p className="text-gray-400">Click to select files</p>
    </div>
  ),
}: DropZoneProps) {
  return (
    <BaseDropZone
      onFileSelect={onFileSelect}
      disabled={disabled}
      isDragging={isDragging}
      multiple={true}
      accept=".xm,.it,.mod,.wav,.flac,image/*"
    >
      <div className="space-y-3">
        <p className="text-xl font-medium">{label}</p>
        <div className="text-sm text-gray-500">{sublabel}</div>
      </div>
    </BaseDropZone>
  );
}
