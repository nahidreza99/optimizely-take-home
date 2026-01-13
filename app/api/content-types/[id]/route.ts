import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import ContentType from "@/lib/models/ContentType";
import mongoose from "mongoose";

// GET - Get a single content type by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid content type ID" },
        { status: 400 }
      );
    }

    const contentType = await ContentType.findById(id);

    if (!contentType) {
      return NextResponse.json(
        { error: "Content type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        data: contentType,
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

// PUT - Update a content type by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await request.json();

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid content type ID" },
        { status: 400 }
      );
    }

    // Validate title if provided
    if (body.title !== undefined && typeof body.title !== "string") {
      return NextResponse.json(
        { error: "Title must be a string" },
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

    // Prepare update object (only include fields that are provided)
    const updateData: {
      title?: string;
      average_token_weight?: number | null;
    } = {};

    if (body.title !== undefined) {
      updateData.title = body.title;
    }
    if (body.average_token_weight !== undefined) {
      updateData.average_token_weight = body.average_token_weight;
    }

    const contentType = await ContentType.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!contentType) {
      return NextResponse.json(
        { error: "Content type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Content type updated successfully",
        data: contentType,
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

// DELETE - Delete a content type by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid content type ID" },
        { status: 400 }
      );
    }

    const contentType = await ContentType.findByIdAndDelete(id);

    if (!contentType) {
      return NextResponse.json(
        { error: "Content type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Content type deleted successfully",
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
