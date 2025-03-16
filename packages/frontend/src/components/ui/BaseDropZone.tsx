import React, { useRef } from "react";
import { cn } from "@/utils/cn";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";

interface BaseDropZoneProps {
  onFileSelect: (files: File[]) => void;
  disabled?: boolean;
  isDragging?: boolean;
  className?: string;
  accept?: string;
  multiple?: boolean;
  children?: React.ReactNode;
}

export function BaseDropZone({
  onFileSelect,
  disabled,
  isDragging,
  className,
  accept,
  multiple = false,
  children,
}: BaseDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isDragging: isLocalDragging, handlers } =
    useDragAndDrop(onFileSelect);
  const effectiveDragging = isDragging ?? isLocalDragging;

  return (
    <div
      id="drop-zone"
      className={cn(
        "cursor-pointer border-2 border-dashed rounded-lg p-8 text-center transition-colors",
        effectiveDragging
          ? "border-primary-500 bg-primary-50"
          : "border-gray-300 hover:border-primary-500",
        disabled && "opacity-50 pointer-events-none",
        className
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
        multiple={multiple}
        accept={accept}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          onFileSelect(files);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }}
        disabled={disabled}
      />
      {children}
    </div>
  );
}
