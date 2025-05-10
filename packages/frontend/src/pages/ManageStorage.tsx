import { useState, useEffect } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { formatDuration } from "@/utils/formatDuration";
import { formatBytes } from "@/utils/formatBytes";
import { Track } from "@/types";
import { auth } from "@/utils/auth";

export type StorageTrack = Pick<
  Track,
  | "id"
  | "title"
  | "primaryArtistName"
  | "duration"
  | "originalSizeBytes"
  | "mp3SizeBytes"
  | "wavSizeBytes"
  | "flacSizeBytes"
  | "coverArtSizeBytes"
  | "totalQuotaBytes"
>;

const sortableColumns = ["title", "duration"];
const columns: ColumnDef<StorageTrack>[] = [
  {
    accessorKey: "title",
    header: "Title",
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.title}</span>
        <span className="text-sm text-gray-500">
          by {row.original.primaryArtistName}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "duration",
    header: "Duration",
    enableSorting: true,
    cell: ({ row }) =>
      row.original.duration ? formatDuration(row.original.duration) : "-",
  },
  {
    accessorKey: "originalSizeBytes",
    header: "Original",
    enableSorting: false,
    cell: ({ row }) => formatBytes(row.original.originalSizeBytes || 0),
  },
  {
    accessorKey: "mp3SizeBytes",
    header: "MP3",
    enableSorting: false,
    cell: ({ row }) => formatBytes(row.original.mp3SizeBytes || 0),
  },
  {
    accessorKey: "wavSizeBytes",
    header: "WAV",
    enableSorting: false,
    cell: ({ row }) => formatBytes(row.original.wavSizeBytes || 0),
  },
  {
    accessorKey: "flacSizeBytes",
    header: "FLAC",
    enableSorting: false,
    cell: ({ row }) => formatBytes(row.original.flacSizeBytes || 0),
  },
  {
    accessorKey: "coverArtSizeBytes",
    header: "Cover Art",
    enableSorting: false,
    cell: ({ row }) => formatBytes(row.original.coverArtSizeBytes || 0),
  },
  {
    accessorKey: "totalQuotaBytes",
    header: "Total Quota",
    enableSorting: false,
    cell: ({ row }) => formatBytes(row.original.totalQuotaBytes || 0),
  },
];

export function ManageStorage() {
  const [page, setPage] = useState(1);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [prevCursors, setPrevCursors] = useState<string[]>([]);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "title", desc: false },
  ]);
  const pageSize = 10;
  const token = auth.getToken();

  // Determine sortField and sortDirection for API
  const sortField =
    sorting[0]?.id && sortableColumns.includes(sorting[0].id)
      ? sorting[0].id
      : undefined;
  const sortDirection = sorting[0]?.desc ? "desc" : "asc";

  // Fetch tracks for current page
  const { data: tracks, isLoading } = useQuery<StorageTrack[]>({
    queryKey: ["tracks", "storage", cursor, sortField, sortDirection, token],
    queryFn: async () => {
      if (!token) throw new Error("No token found");
      const res = await api.tracks.list(token, {
        cursor,
        limit: pageSize,
        sortField: sortField as string | undefined,
        sortDirection: sortDirection as "asc" | "desc",
      });
      setNextCursor(res.metadata.nextCursor);
      return res.items as StorageTrack[];
    },
    placeholderData: keepPreviousData,
    enabled: !!token,
  });

  // Reset pagination when sorting changes
  useEffect(() => {
    setPage(1);
    setCursor(undefined);
    setPrevCursors([]);
  }, [sortField, sortDirection]);

  // No count endpoint for now, so just estimate
  const totalPages =
    tracks && tracks.length === pageSize && nextCursor ? page + 1 : page;

  const handleNext = () => {
    if (nextCursor) {
      setPrevCursors((prev) => [...prev, cursor || ""]);
      setCursor(nextCursor);
      setPage((p) => p + 1);
    }
  };

  const handlePrev = () => {
    if (page > 1) {
      const prev = [...prevCursors];
      const prevCursor = prev.pop();
      setPrevCursors(prev);
      setCursor(prevCursor);
      setPage((p) => p - 1);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Storage</h1>
      </div>

      {isLoading && <div className="mb-4">Loading...</div>}
      <DataTable
        data={tracks || []}
        columns={columns}
        pageSize={pageSize}
        sorting={sorting}
        onSortingChange={setSorting}
        pagination={{
          page,
          totalPages,
          onNext: handleNext,
          onPrev: handlePrev,
          isLoading,
          isCountLoading: false,
          hasNext: Boolean(nextCursor),
          hasPrev: page > 1,
        }}
      />
    </div>
  );
}
