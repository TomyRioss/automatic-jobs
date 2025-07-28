-- CreateTable
CREATE TABLE "GlobalStats" (
    "id" TEXT NOT NULL DEFAULT 'main_stats',
    "totalApplications" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GlobalStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);
