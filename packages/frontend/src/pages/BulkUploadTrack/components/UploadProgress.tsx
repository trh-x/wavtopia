import { FormButton } from "@/components/ui/forms";

interface UploadProgressProps {
  matches: { uploaded?: boolean }[];
  currentUploadIndex: number;
  isUploadInProgress: boolean;
  isUploadComplete: boolean;
  error?: string;
  onClearAll: () => void;
  onAddMoreFiles: () => void;
}

export function UploadProgress({
  matches,
  currentUploadIndex,
  isUploadInProgress,
  isUploadComplete,
  error,
  onClearAll,
  onAddMoreFiles,
}: UploadProgressProps) {
  const pendingUploads = matches.filter((m) => !m.uploaded);
  const progress =
    pendingUploads.length === 0
      ? 100
      : (currentUploadIndex / pendingUploads.length) * 100;

  return (
    <div className="flex flex-col space-y-2">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {isUploadInProgress && (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {isUploadComplete ? (
        <>
          <div className="text-center text-green-600 mb-4">
            All tracks uploaded successfully!
          </div>
          <div className="flex justify-center space-x-4">
            <FormButton
              type="button"
              onClick={onClearAll}
              className="bg-gray-500 hover:bg-gray-600"
            >
              Clear All & Start New
            </FormButton>
            <FormButton
              type="button"
              onClick={onAddMoreFiles}
              className="bg-primary-500 hover:bg-primary-600"
            >
              Add More Files
            </FormButton>
          </div>
        </>
      ) : (
        <FormButton
          type="submit"
          disabled={
            matches.length === 0 ||
            isUploadInProgress ||
            pendingUploads.length === 0
          }
        >
          {isUploadInProgress
            ? `Uploading (${currentUploadIndex + 1}/${pendingUploads.length})`
            : pendingUploads.length > 0
            ? matches.some((m) => m.uploaded)
              ? `Upload ${pendingUploads.length} Remaining Tracks`
              : `Upload ${pendingUploads.length} Tracks`
            : "Start Upload"}
        </FormButton>
      )}
    </div>
  );
}
