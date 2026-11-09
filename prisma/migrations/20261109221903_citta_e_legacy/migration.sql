-- CreateTable
CREATE TABLE "City" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "hero" TEXT,
    "position" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "City_pkey" PRIMARY KEY ("slug")
);
