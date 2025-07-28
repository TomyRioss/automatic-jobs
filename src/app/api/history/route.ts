import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const applications = await prisma.application.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(applications);
  } catch (error) {
    console.error('Error fetching application history:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const source = searchParams.get('source');
  const all = searchParams.get('all');

  try {
    if (id) {
      await prisma.application.delete({
        where: {
          id: id,
          userId: userId,
        },
      });
    } else if (source) {
      await prisma.application.deleteMany({
        where: {
          source: source,
          userId: userId,
        },
      });
    } else if (all === 'true') {
      await prisma.application.deleteMany({
        where: {
          userId: userId,
        },
      });
    } else {
      return new NextResponse('Bad Request: Missing query parameter', {
        status: 400,
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting application history:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
