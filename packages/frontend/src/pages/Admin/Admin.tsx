import { Outlet } from "react-router-dom";
import { NavTabLink } from "@/components/ui/NavTabLink";

export function Admin() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="flex space-x-4 mb-6 pb-2">
        <NavTabLink to="feature-flags" end>
          Feature Flags
        </NavTabLink>
        <NavTabLink to="invite-codes">Invite Codes</NavTabLink>
        <NavTabLink to="deleted-tracks">Deleted Tracks</NavTabLink>
      </div>
      <Outlet />
    </div>
  );
}
