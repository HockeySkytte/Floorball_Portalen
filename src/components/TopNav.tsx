"use client";

import { useRef } from "react";
import Link from "next/link";

export type TopNavUser = {
  username: string;
  isAdmin: boolean;
};

export default function TopNav({
  user,
}: {
  user: TopNavUser | null;
}) {
  const mobileMenuRef = useRef<HTMLDetailsElement | null>(null);
  const userMenuRef = useRef<HTMLDetailsElement | null>(null);

  function closeDetails(ref: React.RefObject<HTMLDetailsElement | null>) {
    const el = ref.current;
    if (!el) return;
    el.open = false;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="border-b border-[color:var(--brand)] bg-[color:var(--topbar-bg)] text-[color:var(--topbar-foreground)]">
      <div className="flex w-full items-center justify-between px-4 py-2">
        <div className="flex items-center gap-4">
          {/* Desktop navigation */}
          <nav className="hidden items-center gap-5 text-base sm:flex">
            <Link className="hover:underline" href="/kalender">
              Kalender
            </Link>
            <Link className="hover:underline" href="/stilling">
              Stilling
            </Link>
            <Link className="hover:underline" href="/statistik">
              Statistik
            </Link>

            {user?.isAdmin ? (
              <Link className="hover:underline" href="/admin">
                Admin
              </Link>
            ) : null}
          </nav>

          {/* Mobile dropdown */}
          <details ref={mobileMenuRef} className="relative sm:hidden">
            <summary className="cursor-pointer select-none rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm">
              Menu
            </summary>
            <div className="absolute left-0 z-50 mt-2 w-56 rounded-md border border-zinc-200 bg-white p-2 text-sm shadow-sm">
              <div className="flex flex-col">
                <Link
                  className="rounded px-2 py-1 hover:bg-zinc-50"
                  href="/kalender"
                  onClick={() => closeDetails(mobileMenuRef)}
                >
                  Kalender
                </Link>
                <Link
                  className="rounded px-2 py-1 hover:bg-zinc-50"
                  href="/stilling"
                  onClick={() => closeDetails(mobileMenuRef)}
                >
                  Stilling
                </Link>
                <Link
                  className="rounded px-2 py-1 hover:bg-zinc-50"
                  href="/statistik"
                  onClick={() => closeDetails(mobileMenuRef)}
                >
                  Statistik
                </Link>

                {user?.isAdmin ? (
                  <Link
                    className="rounded px-2 py-1 hover:bg-zinc-50"
                    href="/admin"
                    onClick={() => closeDetails(mobileMenuRef)}
                  >
                    Admin
                  </Link>
                ) : null}

                {user ? (
                  <>
                    <div className="my-1 border-t border-zinc-200" />
                    <Link
                      className="rounded px-2 py-1 hover:bg-zinc-50"
                      href="/indstillinger"
                      onClick={() => closeDetails(mobileMenuRef)}
                    >
                      Indstillinger
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      className="w-full rounded px-2 py-1 text-left hover:bg-zinc-50"
                    >
                      Log ud
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </details>
        </div>

        <div className="flex items-center gap-3 text-base">
          {user ? (
            <details ref={userMenuRef} className="relative">
              <summary className="cursor-pointer list-none font-medium select-none">
                {user.username}
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-44 rounded-md border border-zinc-200 bg-white p-2 text-sm text-zinc-900 shadow-sm">
                <div className="flex flex-col">
                  <Link
                    className="rounded px-2 py-1 text-left hover:bg-zinc-50"
                    href="/indstillinger"
                    onClick={() => closeDetails(userMenuRef)}
                  >
                    Indstillinger
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      closeDetails(userMenuRef);
                      void logout();
                    }}
                    className="rounded px-2 py-1 text-left hover:bg-zinc-50"
                  >
                    Log ud
                  </button>
                </div>
              </div>
            </details>
          ) : (
            <Link className="hover:underline" href="/login">
              Log ind
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
