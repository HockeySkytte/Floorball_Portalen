import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getThemeTeam } from "@/lib/theme";
import { getSession } from "@/lib/session";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Floorball Portalen",
  description: "Floorball Portalen",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeTeam = await getThemeTeam();
  const session = await getSession();
  const viewMode = session.selectedViewMode ?? "LIGHT";

  return (
    <html
      lang="da"
      data-team-primary={themeTeam?.themePrimary ?? undefined}
      data-team-secondary={themeTeam?.themeSecondary ?? undefined}
      data-view={viewMode}
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-dvh flex flex-col">
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
