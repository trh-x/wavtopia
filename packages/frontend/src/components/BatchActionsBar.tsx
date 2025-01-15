import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/ui/AlertDialog";

interface BatchActionsBarProps {
  selectedCount: number;
  onDelete?: () => void;
  onCancelSelection: () => void;
}

export function BatchActionsBar({
  selectedCount,
  onDelete,
  onCancelSelection,
}: BatchActionsBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-t bg-white px-4 shadow-lg">
      <div className="text-sm font-medium">
        {selectedCount} {selectedCount === 1 ? "track" : "tracks"} selected
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onCancelSelection}
          className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          Cancel
        </button>
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                Delete
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Selected Tracks</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {selectedCount}{" "}
                  {selectedCount === 1 ? "track" : "tracks"}? This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
