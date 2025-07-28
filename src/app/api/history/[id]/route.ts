import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const { id } = params;

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const application = await prisma.application.findUnique({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!application) {
      return new NextResponse('Application not found', { status: 404 });
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error(`Error fetching application ${id}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
