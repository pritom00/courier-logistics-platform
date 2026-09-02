import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { env } from "../../config/env";
import { writeAuditLog } from "../../utils/audit";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: "CUSTOMER" | "COURIER";
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const hashed = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashed,
      phone: input.phone,
      role: input.role ?? "CUSTOMER",
      provider: "CREDENTIALS",
    },
  });

  const tokens = await issueTokens(user.id, user.role);
  await writeAuditLog({ userId: user.id, action: "USER_REGISTERED", entityType: "User", entityId: user.id });
  return { user: sanitizeUser(user), ...tokens };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (!user || !user.password) throw ApiError.unauthorized("Invalid email or password");
  if (!user.isActive) throw ApiError.forbidden("This account has been deactivated");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw ApiError.unauthorized("Invalid email or password");

  const tokens = await issueTokens(user.id, user.role);
  await writeAuditLog({ userId: user.id, action: "USER_LOGIN", entityType: "User", entityId: user.id });
  return { user: sanitizeUser(user), ...tokens };
}

// Verifies a Google ID token (GCP social login) and finds-or-creates the user.
export async function loginWithGoogle(idToken: string) {
  if (!env.GOOGLE_CLIENT_ID) {
    throw ApiError.badRequest("Google login is not configured on this server (missing GOOGLE_CLIENT_ID)");
  }
  const ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.email) throw ApiError.unauthorized("Invalid Google token");

  let user = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: payload.name || payload.email.split("@")[0],
        email: payload.email,
        googleId: payload.sub,
        provider: "GOOGLE",
        role: "CUSTOMER",
      },
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({ where: { id: user.id }, data: { googleId: payload.sub } });
  }

  const tokens = await issueTokens(user.id, user.role);
  await writeAuditLog({ userId: user.id, action: "USER_GOOGLE_LOGIN", entityType: "User", entityId: user.id });
  return { user: sanitizeUser(user), ...tokens };
}

export async function refreshAccessToken(token: string) {
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const user = await prisma.user.findFirst({ where: { id: decoded.userId, deletedAt: null } });
  if (!user || user.refreshToken !== token) {
    throw ApiError.unauthorized("Refresh token is no longer valid");
  }

  const tokens = await issueTokens(user.id, user.role);
  return tokens;
}

export async function logoutUser(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
}

async function issueTokens(userId: string, role: "CUSTOMER" | "COURIER" | "ADMIN") {
  const accessToken = signAccessToken({ userId, role });
  const refreshToken = signRefreshToken({ userId, role });
  await prisma.user.update({ where: { id: userId }, data: { refreshToken } });
  return { accessToken, refreshToken };
}

function sanitizeUser<T extends { password?: string | null }>(user: T) {
  const { password, ...rest } = user;
  return rest;
}
