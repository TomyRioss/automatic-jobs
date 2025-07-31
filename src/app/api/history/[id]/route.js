import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(_request, { params }) {
  const { id } = params;

  try {
    const application = await prisma.application.findUnique({
      where: {
        id: id,
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json(application);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error", error: error.message },
      { status: 500 },
    );
  }
}
