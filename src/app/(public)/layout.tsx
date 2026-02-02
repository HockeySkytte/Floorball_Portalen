import TopNav from "@/components/TopNav";
import { getCurrentUser } from "@/lib/auth";
import { getSession } from "@/lib/session";
import GuestDefaultsBootstrap from "@/components/GuestDefaultsBootstrap";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const session = await getSession();
  const viewMode = session.selectedViewMode ?? "LIGHT";

  return (
    <div className="min-h-dvh">
      <GuestDefaultsBootstrap enabled={!Boolean(user)} />
      <TopNav
        viewMode={viewMode}
        user={
          user
            ? {
                username: user.username,
                isAdmin: user.isAdmin,
              }
            : null
        }
      />
      {children}
    </div>
  );
}
