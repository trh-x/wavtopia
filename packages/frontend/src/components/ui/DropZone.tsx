import React, { useState, useEffect } from "react";
import { BaseDropZone } from "./BaseDropZone";

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
  const [preview, setPreview] = useState<string>();

  // Handle image preview
  useEffect(() => {
    const imageFile = selectedFiles.find((file) =>
      file?.type.startsWith("image/")
    );
    if (showPreview && imageFile) {
      const previewUrl = URL.createObjectURL(imageFile);
      setPreview(previewUrl);
      return () => URL.revokeObjectURL(previewUrl);
    } else if (!imageFile) {
      setPreview(undefined);
    }
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [selectedFiles, showPreview]);

  return (
    <BaseDropZone
      onFileSelect={onFileSelect}
      disabled={disabled}
      isDragging={isDragging}
      accept={accept}
      multiple={multiple}
      className={className}
    >
      <div className="space-y-3">
        <p className="text-xl font-medium">{label}</p>
        <div className="text-sm text-gray-500">{sublabel}</div>
        {showPreview && preview && (
          <div className="mt-4">
            <img
              src={preview}
              alt="Preview"
              className="max-h-32 mx-auto rounded-lg object-contain"
            />
          </div>
        )}
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
                      if (file?.type.startsWith("image/")) {
                        setPreview(undefined);
                      }
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
    </BaseDropZone>
  );
}
