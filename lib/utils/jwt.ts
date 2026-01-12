import { SignJWT, jwtVerify } from "jose";

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  // Remove quotes if present (from .env file)
  return secret.replace(/^["']|["']$/g, "");
}

function getJWTRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET environment variable is not set");
  }
  // Remove quotes if present (from .env file)
  return secret.replace(/^["']|["']$/g, "");
}

function getSecretKey() {
  return new TextEncoder().encode(getJWTSecret());
}

function getRefreshSecretKey() {
  return new TextEncoder().encode(getJWTRefreshSecret());
}

export interface TokenPayload {
  userId: string;
}

export async function generateAccessToken(userId: string): Promise<string> {
  const token = await new SignJWT({ userId } as TokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getSecretKey());

  return token;
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const token = await new SignJWT({ userId } as TokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getRefreshSecretKey());

  return token;
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as TokenPayload;
  } catch (error) {
    throw new Error("Invalid or expired access token");
  }
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getRefreshSecretKey());
    return payload as TokenPayload;
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }
}
