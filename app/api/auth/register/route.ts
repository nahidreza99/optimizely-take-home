import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/models/User";
import { registerSchema } from "@/lib/validations/auth";
import { generateAccessToken, generateRefreshToken } from "@/lib/utils/jwt";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const validationResult = registerSchema.safeParse(body);

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

    const data = validationResult.data;

    // Detect if emailOrPhone is an email or phone using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const atCount = (data.emailOrPhone.match(/@/g) || []).length;

    let email: string | undefined;
    let phone: string | undefined;

    // Validate email format: must have exactly one @
    if (atCount > 0) {
      if (atCount !== 1) {
        return NextResponse.json(
          {
            error:
              "Invalid email format. Email must contain exactly one @ symbol",
          },
          { status: 400 }
        );
      }

      // Check if it's a valid email format
      if (!emailRegex.test(data.emailOrPhone)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }

      email = data.emailOrPhone;
    } else {
      // No @ found, treat as phone
      phone = data.emailOrPhone;
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email or phone already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await User.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: email || undefined,
      phone: phone || undefined,
      dateOfBirth: new Date(data.dateOfBirth),
      gender: data.gender,
      password: hashedPassword,
    });

    // Generate tokens
    const accessToken = await generateAccessToken(user._id.toString());
    const refreshToken = await generateRefreshToken(user._id.toString());

    // Optionally store refresh token in database
    user.refreshToken = refreshToken;
    await user.save();

    return NextResponse.json(
      {
        message: "User registered successfully",
        accessToken,
        refreshToken,
        user: {
          id: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
        },
      },
      { status: 201 }
    );
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
