import { useState } from "react";

export type SortField =
  | "createdAt"
  | "title"
  | "duration"
  | "primaryArtistName";
export type SortDirection = "asc" | "desc";

export interface SortOption {
  label: string;
  value: string;
  field: SortField;
  direction: SortDirection;
}

export interface TrackSortState {
  sortField: SortField;
  sortDirection: SortDirection;
}

const defaultSortOptions: SortOption[] = [
  {
    label: "Newest First",
    value: "newest",
    field: "createdAt",
    direction: "desc",
  },
  {
    label: "Oldest First",
    value: "oldest",
    field: "createdAt",
    direction: "asc",
  },
  { label: "Title A-Z", value: "titleAsc", field: "title", direction: "asc" },
  { label: "Title Z-A", value: "titleDesc", field: "title", direction: "desc" },
  {
    label: "Duration (Shortest)",
    value: "durationAsc",
    field: "duration",
    direction: "asc",
  },
  {
    label: "Duration (Longest)",
    value: "durationDesc",
    field: "duration",
    direction: "desc",
  },
  {
    label: "Artist A-Z",
    value: "artistAsc",
    field: "primaryArtistName",
    direction: "asc",
  },
  {
    label: "Artist Z-A",
    value: "artistDesc",
    field: "primaryArtistName",
    direction: "desc",
  },
];

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

  const currentSortOption =
    defaultSortOptions.find(
      (option) =>
        option.field === sortField && option.direction === sortDirection
    ) || defaultSortOptions[0];

  return {
    sortField,
    sortDirection,
    handleSort,
    currentSortValue: currentSortOption.value,
    sortState: { sortField, sortDirection },
  };
}
