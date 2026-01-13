import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/middleware/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ valid: true, userId });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Unauthorized", message: error.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Unauthorized", message: "An unknown error occurred" },
      { status: 401 }
    );
  }
}
