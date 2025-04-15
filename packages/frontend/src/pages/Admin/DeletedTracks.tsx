import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { formatDuration } from "@/utils/formatDuration";
import { formatBytes } from "@/utils/formatBytes";
import { Track, TrackStatus } from "@/types";
import { auth } from "@/utils/auth";

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
> & {
  user: {
    username: string;
  };
};

const columns: ColumnDef<DeletedTrack>[] = [
  {
    accessorKey: "title",
    header: "Title",
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
  },
  {
    accessorKey: "status",
    header: "Status",
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
    cell: ({ row }) =>
      row.original.duration ? formatDuration(row.original.duration) : "-",
  },
  {
    accessorKey: "totalSize",
    header: "Total Size",
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

  const { data: tracks, isLoading } = useQuery({
    queryKey: ["tracks", "deleted", status],
    queryFn: async () => {
      const token = auth.getToken();
      if (!token) throw new Error("No token found");
      const response = await api.tracks.getDeletedTracks(token, { status });
      return response.items;
    },
  });

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
      {/* TODO: Add pagination, fetching next page on demand */}
      <DataTable data={tracks || []} columns={columns} pageSize={6} />
    </div>
  );
}
