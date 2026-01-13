import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/models/User";
import { refreshSchema } from "@/lib/validations/auth";
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/utils/jwt";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const validationResult = refreshSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors.refreshToken,
        },
        { status: 400 }
      );
    }

    const { refreshToken } = validationResult.data;

    // Verify refresh token
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return NextResponse.json(
          { error: "Invalid or expired refresh token", message: error.message },
          { status: 401 }
        );
      }
      return NextResponse.json(
        {
          error: "Invalid or expired refresh token",
          message: "An unknown error occurred",
        },
        { status: 401 }
      );
    }

    // Check if user exists and token matches
    const user = await User.findById(payload.userId);

    if (!user || user.refreshToken !== refreshToken) {
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 401 }
      );
    }

    // Generate new tokens
    const newAccessToken = await generateAccessToken(user._id.toString());
    const newRefreshToken = await generateRefreshToken(user._id.toString());

    // Update refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save();

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
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
