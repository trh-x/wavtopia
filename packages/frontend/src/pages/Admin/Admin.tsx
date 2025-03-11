import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { FeatureFlagsAdmin } from "./FeatureFlags";
import { InviteCodesAdmin } from "./InviteCodes";

export function Admin() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <Tabs defaultValue="feature-flags">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="feature-flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="invite-codes">Invite Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="feature-flags">
          <FeatureFlagsAdmin />
        </TabsContent>

        <TabsContent value="invite-codes">
          <InviteCodesAdmin />
        </TabsContent>
      </Tabs>
    </div>
  );
}
