import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import ContentType from "@/lib/models/ContentType";

// GET - Get all content types
export async function GET(_request: NextRequest) {
  try {
    await connectDB();

    const contentTypes = await ContentType.find().sort({ created_at: -1 });

    return NextResponse.json(
      {
        data: contentTypes,
        count: contentTypes.length,
      },
      { status: 200 }
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

// POST - Create a new content type
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Validate required fields
    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json(
        { error: "Title is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate average_token_weight if provided
    if (
      body.average_token_weight !== undefined &&
      body.average_token_weight !== null &&
      typeof body.average_token_weight !== "number"
    ) {
      return NextResponse.json(
        {
          error: "average_token_weight must be a number or null if provided",
        },
        { status: 400 }
      );
    }

    // Create new content type
    const contentType = await ContentType.create({
      title: body.title,
      average_token_weight:
        body.average_token_weight !== undefined
          ? body.average_token_weight
          : null,
    });

    return NextResponse.json(
      {
        message: "Content type created successfully",
        data: contentType,
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
