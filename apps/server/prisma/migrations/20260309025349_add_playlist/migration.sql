-- CreateTable
CREATE TABLE "Playlist" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cover" TEXT,
    "intro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistWork" (
    "playlistId" UUID NOT NULL,
    "workId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaylistWork_pkey" PRIMARY KEY ("playlistId","workId")
);

-- CreateIndex
CREATE INDEX "PlaylistWork_workId_idx" ON "PlaylistWork"("workId");

-- CreateIndex
CREATE INDEX "PlaylistWork_playlistId_idx" ON "PlaylistWork"("playlistId");

-- AddForeignKey
ALTER TABLE "PlaylistWork" ADD CONSTRAINT "PlaylistWork_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistWork" ADD CONSTRAINT "PlaylistWork_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
