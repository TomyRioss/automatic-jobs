import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const headersList = headers();
  const userId = headersList.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const totalApplications = await prisma.application.count({
      where: { userId: userId },
    });

    const applicationsBySource = await prisma.application.groupBy({
      by: ["source"],
      where: { userId: userId },
      _count: {
        source: true,
      },
    });

    const globalStats = await prisma.globalStats.findUnique({
      where: { id: "main_stats" },
    });

    return NextResponse.json({
      totalApplications,
      applicationsBySource: applicationsBySource.map((group) => ({
        source: group.source,
        count: group._count.source,
      })),
      globalTotalApplications: globalStats?.totalApplications || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", error: error.message },
      { status: 500 },
    );
  }
}
