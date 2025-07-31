import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.json({ message: "Logout successful" });

    // En una aplicación real, agregarías el token a una lista de revocación en tu DB.
    // Para este ejemplo, simplemente borramos la cookie.
    response.cookies.set("token", "", { expires: new Date(0), path: "/" });

    return response;
  } catch (error) {
    console.error("Error during logout:", error);
    return NextResponse.json(
      { error: "Internal Server Error", error: error.message },
      { status: 500 },
    );
  }
}
