import { Outlet } from "react-router-dom";
import { NavTabLink, NavTabList } from "@/components/ui/NavTabLink";

export function Admin() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <NavTabList className="mb-6">
        <NavTabLink to="feature-flags" end>
          Feature Flags
        </NavTabLink>
        <NavTabLink to="invite-codes">Invite Codes</NavTabLink>
        <NavTabLink to="deleted-tracks">Deleted Tracks</NavTabLink>
      </NavTabList>
      <Outlet />
    </div>
  );
}
