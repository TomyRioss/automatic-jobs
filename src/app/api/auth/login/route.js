import bcrypt from "bcryptjs";
import { sign } from "jsonwebtoken";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(req) {
  const { email, password } = await req.json();

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const response = NextResponse.json({ message: "Login successful" });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 3600, // 1 hour
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error", error: error.message },
      { status: 500 },
    );
  }
}
