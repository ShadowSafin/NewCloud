import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { UnauthorizedError } from "../utils/errors";
import { AuthenticatedRequest, TokenPayload } from "../types";
import { prisma } from "../db";

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Accept access tokens only from Authorization headers.
    // Media tags use short-lived signed URLs instead of leaking JWTs in query strings.
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (!token) {
      throw new UnauthorizedError("Access token required");
    }

    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError("Invalid or expired token"));
    } else {
      next(error);
    }
  }
};
