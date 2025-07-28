import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return new NextResponse('Token is required', { status: 400 });
    }

    const revokedToken = await prisma.revokedToken.findUnique({
      where: { token },
    });

    if (revokedToken) {
      // Token is revoked
      return new NextResponse('Token is invalid', { status: 401 });
    }

    // Token is not revoked
    return NextResponse.json({ message: 'Token is valid' });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
