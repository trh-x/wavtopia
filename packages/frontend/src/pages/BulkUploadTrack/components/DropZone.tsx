import React, { useRef } from "react";
import { cn } from "@/utils/cn";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";

interface DropZoneProps {
  onFileSelect: (files: File[]) => void;
  disabled?: boolean;
  isDragging?: boolean;
  label?: string;
  sublabel?: string;
}

export function DropZone({
  onFileSelect,
  disabled,
  isDragging,
  label = "Drop track files here",
  sublabel = ".xm, .it, .mod files and optional cover art • Click to select files",
}: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isDragging: isLocalDragging, handlers } =
    useDragAndDrop(onFileSelect);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onFileSelect(files);
    // Reset the file input so the same file can be re-added
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const effectiveDragging = isDragging ?? isLocalDragging;

  return (
    <div
      id="drop-zone"
      className={cn(
        "cursor-pointer border-2 border-dashed rounded-lg p-8 text-center transition-colors",
        effectiveDragging
          ? "border-primary-500 bg-primary-50"
          : "border-gray-300 hover:border-primary-500",
        disabled && "opacity-50 pointer-events-none"
      )}
      onClick={() => fileInputRef.current?.click()}
      onDragEnter={handlers.handleDragIn}
      onDragLeave={handlers.handleDragOut}
      onDragOver={handlers.handleDragOver}
      onDrop={handlers.handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".xm,.it,.mod,image/*"
        onChange={handleFileSelect}
        disabled={disabled}
      />
      <div className="space-y-2">
        <p className="text-lg font-medium">{label}</p>
        <div className="space-y-1">
          {sublabel.split("\n").map((line, i) => (
            <p key={i} className="text-sm text-gray-500">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
