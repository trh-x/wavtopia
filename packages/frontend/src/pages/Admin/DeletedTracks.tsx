import { useState, useEffect } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { formatDuration } from "@/utils/formatDuration";
import { formatBytes } from "@/utils/formatBytes";
import { Track, TrackStatus } from "@/types";
import { auth } from "@/utils/auth";

// FIXME: The backend should only return these fields, currently it returns everything including stems(?)
export type DeletedTrack = Pick<
  Track,
  | "id"
  | "title"
  | "primaryArtistName"
  | "duration"
  | "status"
  | "deletedAt"
  | "originalSizeBytes"
  | "mp3SizeBytes"
  | "wavSizeBytes"
  | "flacSizeBytes"
  | "coverArtSizeBytes"
  | "totalQuotaSeconds"
> & {
  user: {
    username: string;
  };
};

const sortableColumns = ["title", "duration", "primaryArtistName"];
const columns: ColumnDef<DeletedTrack>[] = [
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
    accessorKey: "user.username",
    header: "Uploader",
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: false,
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant={
            status === "DELETED"
              ? "error"
              : status === "PENDING_DELETION"
              ? "warning"
              : "default"
          }
        >
          {status === "DELETED"
            ? "Deleted"
            : status === "PENDING_DELETION"
            ? "Pending Deletion"
            : "Active"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "deletedAt",
    header: "Deleted",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.deletedAt
        ? formatDistanceToNow(new Date(row.original.deletedAt), {
            addSuffix: true,
          })
        : "-",
  },
  {
    accessorKey: "duration",
    header: "Duration",
    enableSorting: true,
    cell: ({ row }) =>
      row.original.duration ? formatDuration(row.original.duration) : "-",
  },
  {
    accessorKey: "totalQuotaSeconds",
    header: "Total Size",
    enableSorting: false,
    cell: ({ row }) => formatDuration(row.original.totalQuotaSeconds || 0),
  },
  {
    accessorKey: "totalSize",
    header: "Total Size",
    enableSorting: false,
    cell: ({ row }) => {
      const totalSize =
        (row.original.originalSizeBytes || 0) +
        (row.original.mp3SizeBytes || 0) +
        (row.original.wavSizeBytes || 0) +
        (row.original.flacSizeBytes || 0) +
        (row.original.coverArtSizeBytes || 0);
      return formatBytes(totalSize);
    },
  },
];

export function DeletedTracksAdmin() {
  const [status, setStatus] = useState<TrackStatus | "ALL">("ALL");
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

  // Fetch count
  const { data: countData, isLoading: isCountLoading } = useQuery({
    queryKey: ["tracks", "deleted", "count", status, token],
    queryFn: async () => {
      if (!token) throw new Error("No token found");
      const res = await api.tracks.getDeletedTracksCount(token, { status });
      return res.count;
    },
    enabled: !!token,
  });

  // Fetch tracks for current page
  const { data: tracks, isLoading } = useQuery<DeletedTrack[]>({
    queryKey: [
      "tracks",
      "deleted",
      status,
      cursor,
      sortField,
      sortDirection,
      token,
    ],
    queryFn: async () => {
      if (!token) throw new Error("No token found");
      const res = await api.tracks.getDeletedTracks(token, {
        status,
        cursor,
        limit: pageSize,
        sortField,
        sortDirection,
      });
      setNextCursor(res.metadata.nextCursor);
      return res.items;
    },
    placeholderData: keepPreviousData,
    enabled: !!token,
  });

  // Reset pagination when status or sorting changes
  useEffect(() => {
    setPage(1);
    setCursor(undefined);
    setPrevCursors([]);
  }, [status, sortField, sortDirection]);

  const totalPages = countData
    ? Math.max(1, Math.ceil(countData / pageSize))
    : 1;

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
        <h1 className="text-2xl font-bold">Deleted Tracks</h1>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TrackStatus | "ALL")}
          className="rounded-md border px-3 py-2"
        >
          <option value="ALL">All</option>
          <option value="PENDING_DELETION">Pending Deletion</option>
          <option value="DELETED">Deleted</option>
        </select>
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
          isCountLoading,
          hasNext: Boolean(nextCursor),
          hasPrev: page > 1,
        }}
      />
    </div>
  );
}
