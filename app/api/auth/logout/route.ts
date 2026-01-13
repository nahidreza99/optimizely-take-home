import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/models/User";
import { verifyRefreshToken } from "@/lib/utils/jwt";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    // Verify refresh token to get user ID
    try {
      const payload = await verifyRefreshToken(refreshToken);
      const user = await User.findById(payload.userId);

      if (user && user.refreshToken === refreshToken) {
        // Clear refresh token from database
        user.refreshToken = undefined;
        await user.save();
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        return NextResponse.json(
          { error: "Internal server error", message: error.message },
          { status: 500 }
        );
      }
      // Token is invalid, but we still return success
      // This prevents information leakage
    }

    return NextResponse.json({ message: "Logged out successfully" });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error", message: "An unknown error occurred" },
      { status: 500 }
    );
  }
}
