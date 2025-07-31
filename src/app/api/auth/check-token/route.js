import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(req) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token not provided" }, { status: 400 });
    }

    // Verificamos y decodificamos el token
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Comprobamos si el token ha sido revocado
    const isRevoked = await prisma.revokedToken.findUnique({
      where: { token },
    });

    if (isRevoked) {
      return NextResponse.json({ error: "Token has been revoked" }, { status: 401 });
    }

    // Todo OK
    return NextResponse.json({ valid: true, user: payload });
  } catch (error) {
    return NextResponse.json({ valid: false, error: error.message }, { status: 401 });
  }
}
