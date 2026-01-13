import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/models/User";
import { loginSchema } from "@/lib/validations/auth";
import { generateAccessToken, generateRefreshToken } from "@/lib/utils/jwt";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const validationResult = loginSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details:
            validationResult.error.flatten().fieldErrors.emailOrPhone ||
            validationResult.error.flatten().fieldErrors.password,
        },
        { status: 400 }
      );
    }

    const { emailOrPhone, password } = validationResult.data;

    // Find user by email or phone
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Generate tokens
    const accessToken = await generateAccessToken(user._id.toString());
    const refreshToken = await generateRefreshToken(user._id.toString());

    // Store refresh token in database
    user.refreshToken = refreshToken;
    await user.save();

    return NextResponse.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
