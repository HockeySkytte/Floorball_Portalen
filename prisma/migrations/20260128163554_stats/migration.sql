-- CreateTable
CREATE TABLE "StatsFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "gameId" TEXT,
    "gameDate" DATETIME,
    "competition" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatsFile_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StatsFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StatsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "rowId" INTEGER,
    "timestamp" DATETIME,
    "event" TEXT NOT NULL,
    "teamName" TEXT,
    "venue" TEXT,
    "teamHome" TEXT,
    "teamAway" TEXT,
    "period" INTEGER,
    "perspective" TEXT,
    "strength" TEXT,
    "p1No" INTEGER,
    "p1Name" TEXT,
    "p2No" INTEGER,
    "p2Name" TEXT,
    "gNo" INTEGER,
    "goalieName" TEXT,
    "homeLine" TEXT,
    "homePlayers" TEXT,
    "homePlayersNames" TEXT,
    "awayLine" TEXT,
    "awayPlayers" TEXT,
    "awayPlayersNames" TEXT,
    "xM" REAL,
    "yM" REAL,
    "gameId" TEXT,
    "gameDate" DATETIME,
    "competition" TEXT,
    "videoUrl" TEXT,
    "videoTime" INTEGER,
    "aimX" REAL,
    "aimY" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatsEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StatsEvent_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StatsFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StatsPlayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "number" INTEGER,
    "name" TEXT,
    "line" TEXT,
    "venue" TEXT,
    "teamName" TEXT,
    "teamColor" TEXT,
    "gameId" TEXT,
    "gameDate" DATETIME,
    "competition" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatsPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StatsPlayer_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StatsFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StatsFile_teamId_kind_createdAt_idx" ON "StatsFile"("teamId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "StatsFile_teamId_gameId_idx" ON "StatsFile"("teamId", "gameId");

-- CreateIndex
CREATE INDEX "StatsEvent_teamId_createdAt_idx" ON "StatsEvent"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "StatsEvent_teamId_gameId_idx" ON "StatsEvent"("teamId", "gameId");

-- CreateIndex
CREATE INDEX "StatsPlayer_teamId_createdAt_idx" ON "StatsPlayer"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "StatsPlayer_teamId_gameId_idx" ON "StatsPlayer"("teamId", "gameId");
