import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new NextResponse('Email and password are required', {
        status: 400,
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return new NextResponse('Invalid credentials', { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return new NextResponse('Invalid credentials', { status: 401 });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      {
        expiresIn: '7d', // Token expires in 7 days
      },
    );

    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
    });

    // Set token in an HTTP-Only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
