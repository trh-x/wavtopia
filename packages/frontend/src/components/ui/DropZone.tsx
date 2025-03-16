import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/utils/cn";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";

interface DropZoneProps {
  onFileSelect: (files: File[]) => void;
  onFileRemove?: (fileType: "track" | "image") => void;
  disabled?: boolean;
  isDragging?: boolean;
  label?: string;
  sublabel?: React.ReactNode;
  accept?: string;
  multiple?: boolean;
  className?: string;
  selectedFiles?: (File | null)[];
  error?: string;
  showPreview?: boolean;
}

export function DropZone({
  onFileSelect,
  onFileRemove,
  disabled,
  isDragging,
  label = "Drop track files here",
  sublabel,
  accept,
  multiple = false,
  className,
  selectedFiles = [],
  error,
  showPreview = true,
}: DropZoneProps) {
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
      <div className="space-y-3">
        <p className="text-xl font-medium">{label}</p>
        <div className="text-sm text-gray-500">{sublabel}</div>
        {selectedFiles.filter(Boolean).length > 0 && showPreview && (
          <div className="mt-4 space-y-2">
            {selectedFiles.filter(Boolean).map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm text-gray-500"
              >
                <span>{file!.name}</span>
                {onFileRemove && (
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileRemove(
                        file!.name.toLowerCase().match(/\.(xm|it|mod)$/)
                          ? "track"
                          : "image"
                      );
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
}
