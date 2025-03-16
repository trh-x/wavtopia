import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/utils/cn";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";

interface DropZoneProps {
  onFileSelect: (files: File[]) => void;
  onFileRemove: (fileType: "track" | "image") => void;
  disabled?: boolean;
  isDragging?: boolean;
  multiple?: boolean;
  accept?: string;
  label?: string;
  sublabel?: string;
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
  multiple = false,
  accept,
  label = "Drop files here",
  sublabel = "or click to select files",
  className,
  selectedFiles = [],
  error,
  showPreview = true,
}: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const { isDragging: isLocalDragging, handlers } = useDragAndDrop((files) => {
    handleFiles(files);
  });

  const validateFile = (file: File): boolean => {
    if (accept) {
      const acceptedTypes = accept.split(",");
      const fileType = file.type;
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

      // Check each accepted type
      for (const type of acceptedTypes) {
        // Handle image types
        if (type === "image/*" && fileType.startsWith("image/")) {
          return true;
        }
        // Handle exact file extensions
        if (type === fileExtension) {
          return true;
        }
        // Handle exact mime types
        if (type === fileType) {
          return true;
        }
      }
      return false;
    }
    return true;
  };

  const handleFiles = async (files: File[]) => {
    setIsLoading(true);
    const validFiles = files.filter(validateFile);

    if (validFiles.length) {
      // If it's an image and we should show preview, create preview URL
      const imageFile = validFiles.find((file) =>
        file.type.startsWith("image/")
      );
      if (showPreview && imageFile) {
        if (preview) {
          URL.revokeObjectURL(preview);
        }
        const previewUrl = URL.createObjectURL(imageFile);
        setPreview(previewUrl);
      }
      onFileSelect(validFiles);
    }
    setIsLoading(false);
  };

  // Clean up preview URL when component unmounts or when files change
  useEffect(() => {
    const imageFile = selectedFiles.find((file) =>
      file?.type.startsWith("image/")
    );
    if (showPreview && imageFile && !preview) {
      const previewUrl = URL.createObjectURL(imageFile);
      setPreview(previewUrl);
    }
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [selectedFiles, showPreview]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    // Reset the file input so the same file can be re-added
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Enhanced drag handlers
  const enhancedHandlers = {
    ...handlers,
    handleDragOver: (e: React.DragEvent<HTMLDivElement>) => {
      handlers.handleDragOver(e);
    },
  };

  const effectiveDragging = isDragging ?? isLocalDragging;

  const renderPreview = () => {
    if (!showPreview || selectedFiles.length === 0) return null;

    const imageFile = selectedFiles.find((file) =>
      file?.type.startsWith("image/")
    );
    if (imageFile) {
      return (
        <div className="mt-4">
          <img
            src={preview}
            alt="Preview"
            className="max-h-32 mx-auto rounded-lg object-contain"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative cursor-pointer border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          effectiveDragging
            ? "border-primary-500 bg-primary-50"
            : "border-gray-300 hover:border-primary-500",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={enhancedHandlers.handleDragIn}
        onDragLeave={handlers.handleDragOut}
        onDragOver={enhancedHandlers.handleDragOver}
        onDrop={enhancedHandlers.handleDrop}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple={multiple}
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled}
          aria-label={label}
        />

        {/* Overlay for drag state */}
        {effectiveDragging && (
          <div className="absolute inset-0 rounded-lg bg-primary-500 bg-opacity-10" />
        )}

        <div className="space-y-2">
          <p className="text-lg font-medium">{label}</p>
          <p className="text-sm text-gray-500">{sublabel}</p>
        </div>

        {isLoading && (
          <div className="mt-4">
            <div className="animate-pulse flex justify-center">
              <div className="h-4 w-4 bg-primary-500 rounded-full"></div>
            </div>
          </div>
        )}

        {renderPreview()}
      </div>

      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}

      {selectedFiles.filter(Boolean).length > 0 && (
        <div className="space-y-2">
          {selectedFiles.filter(Boolean).map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm text-gray-500"
            >
              <span>{file!.name}</span>
              <button
                type="button"
                className="text-red-500 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    file?.type.startsWith("image/") ||
                    !file?.name.toLowerCase().match(/\.(xm|it|mod)$/)
                  ) {
                    setPreview(undefined);
                    onFileRemove("image");
                  } else {
                    onFileRemove("track");
                  }
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
