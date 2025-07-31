import { jwtVerify } from "jose";

import { prisma } from "./prisma";

export async function checkUser(token) {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    const userId = payload.userId;

    // Check if token is revoked
    const revokedToken = await prisma.revokedToken.findUnique({
      where: { token },
    });
    if (revokedToken) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    return user;
  } catch (error) {
    console.error("Error checking user:", error);
    return null;
  }
}

export async function getUsername(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  return user?.name || null;
}
