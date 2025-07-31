import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const headersList = headers();
  const userId = headersList.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const history = await prisma.application.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", error: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(req) {
  const headersList = headers();
  const userId = headersList.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const deleteAll = searchParams.get("deleteAll");

    if (id) {
      await prisma.application.delete({
        where: { id: id, userId: userId },
      });
    } else if (deleteAll) {
      await prisma.application.deleteMany({
        where: { userId: userId },
      });
    } else {
      return NextResponse.json({ error: "Bad Request: Missing query parameter" }, { status: 400 });
    }

    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error", error: error.message },
      { status: 500 },
    );
  }
}
