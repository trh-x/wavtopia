import { Button } from "../ui/Button";

interface BatchActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onCancelSelection: () => void;
}

export function BatchActionsBar({
  selectedCount,
  onDelete,
  onCancelSelection,
}: BatchActionsBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {selectedCount} {selectedCount === 1 ? "track" : "tracks"} selected
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancelSelection}
            className="border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete Selected
          </Button>
        </div>
      </div>
    </div>
  );
}
