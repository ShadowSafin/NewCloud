import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { config } from "../config";
import { AuthTokens, TokenPayload } from "../types";
import { RegisterInput, LoginInput } from "../utils/validators";
import { UnauthorizedError, ConflictError, BadRequestError } from "../utils/errors";

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(data: RegisterInput): Promise<AuthTokens> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existingUser) {
      throw new ConflictError(
        existingUser.email === data.email
          ? "Email already registered"
          : "Username already taken"
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await this.prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
      },
    });

    return this.generateTokens(user.id, user.username, user.email);
  }

  async login(data: LoginInput): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    return this.generateTokens(user.id, user.username, user.email);
  }

  async refreshToken(token: string): Promise<AuthTokens> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!refreshToken) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    if (refreshToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: refreshToken.id } });
      throw new UnauthorizedError("Refresh token expired");
    }

    // Delete old refresh token and issue new ones
    await this.prisma.refreshToken.delete({ where: { id: refreshToken.id } });

    return this.generateTokens(
      refreshToken.user.id,
      refreshToken.user.username,
      refreshToken.user.email
    );
  }

  async logout(userId: string, token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        token,
      },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    return user;
  }

  private async generateTokens(
    userId: string,
    username: string,
    email: string
  ): Promise<AuthTokens> {
    const payload: TokenPayload = { userId, username, email };

    const accessToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiration as SignOptions["expiresIn"],
    });

    const refreshTokenValue = jwt.sign(
      { userId },
      config.jwtRefreshSecret,
      {
        expiresIn: config.jwtRefreshExpiration as SignOptions["expiresIn"],
      }
    );

    const refreshExpiresIn = this.parseExpiration(config.jwtRefreshExpiration);

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId,
        expiresAt: new Date(Date.now() + refreshExpiresIn),
      },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }

  private parseExpiration(exp: string): number {
    const match = exp.match(/^(\d+)([mhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      default:
        return value * 24 * 60 * 60 * 1000;
    }
  }
}
