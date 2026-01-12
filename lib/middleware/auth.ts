import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/utils/jwt";

export async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verifyAccessToken(token);
    return payload.userId;
  } catch (error) {
    return null;
  }
}

export function getUserFromToken(token: string): Promise<string> {
  return verifyAccessToken(token).then((payload) => payload.userId);
}
