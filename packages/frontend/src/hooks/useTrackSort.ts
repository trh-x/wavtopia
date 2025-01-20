import { useState } from "react";

export type SortField = "createdAt" | "title" | "duration" | "artist";
export type SortDirection = "asc" | "desc";

export interface TrackSortState {
  sortField: SortField;
  sortDirection: SortDirection;
}

export function useTrackSort(
  defaultField: SortField = "createdAt",
  defaultDirection: SortDirection = "desc"
) {
  const [sortField, setSortField] = useState<SortField>(defaultField);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(defaultDirection);

  const handleSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  return {
    sortField,
    sortDirection,
    handleSort,
    sortState: { sortField, sortDirection },
  };
}
