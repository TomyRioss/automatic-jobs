import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;

  if (token) {
    // Add the token to the revoked list so it can't be used again
    await prisma.revokedToken.create({
      data: {
        token,
      },
    });
  }

  // Clear the cookie from the browser
  cookieStore.delete('token');

  return NextResponse.json({ message: 'Logged out successfully' });
}
