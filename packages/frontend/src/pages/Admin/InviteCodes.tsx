import { useState, useEffect } from "react";
import { api } from "@/api/client";
import { InviteCode } from "@wavtopia/core-storage";
import { FormInput, FormButton } from "@/components/ui/FormInput";

export function InviteCodesAdmin() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [newCode, setNewCode] = useState({
    maxUses: 1,
    expiresAt: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    try {
      const response = await api.admin.getInviteCodes();
      setCodes(response.codes);
    } catch (error) {
      console.error("Failed to load invite codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.createInviteCode({
        maxUses: newCode.maxUses,
        expiresAt: newCode.expiresAt ? new Date(newCode.expiresAt) : undefined,
      });
      setNewCode({ maxUses: 1, expiresAt: "" });
      await loadCodes();
    } catch (error) {
      console.error("Failed to create invite code:", error);
    }
  };

  const handleToggleCode = async (codeId: string, isActive: boolean) => {
    try {
      await api.admin.updateInviteCode(codeId, { isActive });
      await loadCodes();
    } catch (error) {
      console.error("Failed to update invite code:", error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Invite Codes</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Generate New Code</h2>
        <form onSubmit={handleCreateCode} className="space-y-4 max-w-md">
          <FormInput
            type="number"
            label="Max Uses"
            value={newCode.maxUses}
            onChange={(e) =>
              setNewCode({ ...newCode, maxUses: parseInt(e.target.value) })
            }
            min={1}
            required
          />
          <FormInput
            type="datetime-local"
            label="Expires At"
            value={newCode.expiresAt}
            onChange={(e) =>
              setNewCode({ ...newCode, expiresAt: e.target.value })
            }
          />
          <FormButton type="submit">Generate Code</FormButton>
        </form>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-6 font-semibold p-4 bg-gray-100 rounded">
          <div>Code</div>
          <div>Uses</div>
          <div>Max Uses</div>
          <div>Expires</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        {codes.map((code) => (
          <div
            key={code.id}
            className="grid grid-cols-6 p-4 border rounded items-center"
          >
            <div className="font-mono">{code.code}</div>
            <div>{code.usedCount}</div>
            <div>{code.maxUses}</div>
            <div>
              {code.expiresAt
                ? new Date(code.expiresAt).toLocaleString()
                : "Never"}
            </div>
            <div>
              <span
                className={`px-2 py-1 rounded text-sm ${
                  code.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {code.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div>
              <button
                onClick={() => handleToggleCode(code.id, !code.isActive)}
                className="text-primary-600 hover:text-primary-700"
              >
                {code.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
