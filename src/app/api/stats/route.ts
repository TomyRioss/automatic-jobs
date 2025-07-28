import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const globalStats = await prisma.globalStats.findUnique({
      where: { id: 'main_stats' },
      select: { totalApplications: true },
    });
    const totalApplications = globalStats?.totalApplications || 0;

    return NextResponse.json({ totalApplications });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
