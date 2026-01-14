import { NextRequest, NextResponse } from "next/server";

// GET - Health check endpoint
export async function GET(_request: NextRequest) {
  try {
    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
