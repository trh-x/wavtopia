import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatSeconds } from "@/utils/formatSeconds";
import { auth } from "@/utils/auth";

// Storage quota information type
interface StorageQuota {
  freeQuotaSeconds: number;
  paidQuotaSeconds: number;
  currentUsedQuotaSeconds: number;
  totalQuotaSeconds: number;
  isOverQuota: boolean;
}

export function ManageStorage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<StorageQuota | null>(null);

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const token = auth.getToken();
        if (!token) return;

        setLoading(true);
        setError(null);
        // FIXME: We shouldn't need getQuota & its endpoint, the data should already be available on the user object.
        const data = await api.storage.getQuota(token);
        setQuota(data);
      } catch (err) {
        console.error("Failed to fetch storage quota:", err);
        setError("Failed to load storage information. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuota();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!quota) {
    return null;
  }

  // Calculate percentages for visualization
  const usedPercent = Math.min(
    100,
    (quota.currentUsedQuotaSeconds / quota.totalQuotaSeconds) * 100 || 0
  );
  const freePercent = Math.min(
    100,
    (quota.freeQuotaSeconds / quota.totalQuotaSeconds) * 100 || 0
  );
  const paidPercent = Math.min(
    100,
    (quota.paidQuotaSeconds / quota.totalQuotaSeconds) * 100 || 0
  );

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Storage Management</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Storage Quota</h2>

        {/* Progress bar */}
        <div className="w-full h-8 bg-gray-200 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-blue-500 flex items-center justify-center text-xs text-white"
            style={{ width: `${usedPercent}%` }}
          >
            {usedPercent > 10 ? `${Math.round(usedPercent)}%` : ""}
          </div>
        </div>

        {/* Usage summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Used Storage</h3>
            <div className="flex items-end">
              <span className="text-2xl font-bold">
                {formatSeconds(quota.currentUsedQuotaSeconds)}
              </span>
              <span className="text-gray-500 ml-2">
                of {formatSeconds(quota.totalQuotaSeconds)}
              </span>
            </div>
            {quota.isOverQuota && (
              <div className="mt-2 text-red-500 text-sm">
                You have exceeded your storage quota
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Available Storage</h3>
            <div className="flex items-end">
              <span className="text-2xl font-bold">
                {formatSeconds(
                  Math.max(
                    0,
                    quota.totalQuotaSeconds - quota.currentUsedQuotaSeconds
                  )
                )}
              </span>
              <span className="text-gray-500 ml-2">remaining</span>
            </div>
          </div>
        </div>

        {/* Quota breakdown */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">Storage Breakdown</h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span>Free Quota</span>
                <span>{formatSeconds(quota.freeQuotaSeconds)}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${freePercent}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Premium Quota</span>
                <span>{formatSeconds(quota.paidQuotaSeconds)}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${paidPercent}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Used</span>
                <span>{formatSeconds(quota.currentUsedQuotaSeconds)}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${usedPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Need More Storage?</h2>
        <p className="mb-4">
          Upgrade your plan to get additional storage space for your tracks and
          stems.
        </p>
        <button className="btn btn-primary">Upgrade Your Plan</button>
      </div>
    </div>
  );
}

export default ManageStorage;
