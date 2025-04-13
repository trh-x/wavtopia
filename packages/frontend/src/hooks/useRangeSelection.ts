import { useCallback, useRef } from "react";

interface UseRangeSelectionOptions<T> {
  items: T[];
  selectedItems: Set<string>;
  getItemId: (item: T) => string;
  onItemSelect: (itemId: string) => void;
}

export function useRangeSelection<T>({
  items,
  selectedItems,
  getItemId,
  onItemSelect,
}: UseRangeSelectionOptions<T>) {
  const lastSelectedId = useRef<string | null>(null);

  const handleRangeSelect = useCallback(
    (e: React.MouseEvent, itemId: string) => {
      e.stopPropagation();

      if (e.shiftKey && lastSelectedId.current) {
        // Find the indices of the last selected item and current item
        const lastIndex = items.findIndex(
          (item) => getItemId(item) === lastSelectedId.current
        );
        const currentIndex = items.findIndex(
          (item) => getItemId(item) === itemId
        );

        if (lastIndex !== -1 && currentIndex !== -1) {
          // Determine the range to select
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);

          // Get the selection state from the clicked item
          const shouldSelect = !selectedItems.has(itemId);

          // Process each item in the range
          for (let i = start; i <= end; i++) {
            const currentItemId = getItemId(items[i]);
            const isCurrentlySelected = selectedItems.has(currentItemId);

            // Only toggle if the current state doesn't match the desired state
            if (shouldSelect !== isCurrentlySelected) {
              onItemSelect(currentItemId);
            }
          }
        }
      } else {
        // For single clicks, just toggle the clicked item
        onItemSelect(itemId);
        lastSelectedId.current = itemId;
      }
    },
    [items, selectedItems, getItemId, onItemSelect]
  );

  return {
    handleRangeSelect,
  };
}
