import { useState } from "react";
import { FormInput, FormButton } from "@/components/ui/FormInput";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useFeatureFlagsAdmin } from "@/hooks/useFeatureFlags";

export function FeatureFlagsAdmin() {
  const [newFlag, setNewFlag] = useState({ name: "", description: "" });
  const { getToken } = useAuthToken();
  const { flags, isLoading, toggleFlag, createFlag } = useFeatureFlagsAdmin();

  const token = getToken();
  if (!token) {
    return <div>You must be logged in to view this page.</div>;
  }

  const handleToggleFlag = async (flagId: string, isEnabled: boolean) => {
    try {
      await toggleFlag(flagId, isEnabled);
    } catch (error) {
      console.error("Failed to update feature flag:", error);
    }
  };

  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFlag(newFlag);
      setNewFlag({ name: "", description: "" });
    } catch (error) {
      console.error("Failed to create feature flag:", error);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Feature Flags</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Flag</h2>
        <form onSubmit={handleCreateFlag} className="space-y-4 max-w-md">
          <FormInput
            label="Flag Name"
            value={newFlag.name}
            onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
            required
          />
          <FormInput
            label="Description"
            value={newFlag.description}
            onChange={(e) =>
              setNewFlag({ ...newFlag, description: e.target.value })
            }
          />
          <FormButton type="submit">Create Flag</FormButton>
        </form>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-4 font-semibold p-4 bg-gray-100 rounded">
          <div>Name</div>
          <div>Description</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        {flags.map((flag) => (
          <div
            key={flag.id}
            className="grid grid-cols-4 p-4 border rounded items-center"
          >
            <div>{flag.name}</div>
            <div>{flag.description}</div>
            <div>
              <span
                className={`px-2 py-1 rounded text-sm ${
                  flag.isEnabled
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {flag.isEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div>
              <button
                onClick={() => handleToggleFlag(flag.id, !flag.isEnabled)}
                className="text-primary-600 hover:text-primary-700"
              >
                {flag.isEnabled ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
