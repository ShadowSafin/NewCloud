import "./lib/bigintPatch";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { config } from "./config";
import { prisma } from "./db";
import { requestLogger } from "./middleware/logger";
import { errorHandler } from "./middleware/errorHandler";
import { storageService } from "./services/storageService";
import { allQueues } from "./lib/queues";
import { rateLimitPerUser } from "./middleware/rateLimitPerUser";
import { authenticate } from "./middleware/auth";
import authRoutes from "./routes/authRoutes";
import fileRoutes from "./routes/fileRoutes";
import folderRoutes from "./routes/folderRoutes";
import shareRoutes from "./routes/shareRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import versionRoutes from "./routes/versionRoutes";
import { FileService } from "./services/fileService";

const app = express();

// Custom Express JSON replacer to serialize BigInts safely
app.set("json replacer", (key: string, value: any) => {
  if (typeof value === "bigint") {
    const num = Number(value);
    return Number.isSafeInteger(num) ? num : value.toString();
  }
  return value;
});

// Async error wrapper - catches errors from async route handlers
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// CORS
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);

// Compression
app.use(compression());

// Rate limiting - generous for self-hosted (chunked uploads need high throughput)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later" },
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many authentication attempts" },
});
app.use("/api/auth/", authLimiter);

const shareLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests" },
});
app.use("/api/shares/public", shareLimiter);

// Body parsing
app.use(express.json({ limit: "100gb" }));
app.use(express.urlencoded({ extended: true, limit: "100gb" }));

// Logging
app.use(requestLogger);

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    name: "NewCloud", 
    version: "1.0.0",
    timestamp: new Date().toISOString() 
  });
});

// API health check for server discovery
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    name: "NewCloud", 
    version: "1.0.0" 
  });
});

// Bull Board - Queue monitoring dashboard
const bullBoardAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Bull Board"');
    return res.status(401).json({ error: "Authentication required" });
  }

  const credentials = Buffer.from(authHeader.split(" ")[1], "base64").toString();
  const [username, password] = credentials.split(":");

  if (username !== config.bullBoardUsername || password !== config.bullBoardPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  next();
};

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: allQueues.map((queue) => new BullMQAdapter(queue)),
  serverAdapter,
});

app.use("/admin/queues", bullBoardAuth, serverAdapter.getRouter());

// Direct /files route for frontend (thumbnail, download, stream endpoints)
// These are called by the frontend via authUrl() which uses /files/... path
const fileService = new FileService(prisma);
const fileController = require("./controllers/fileController").FileController;
const fc = new fileController(fileService);

app.get("/files/:id/thumbnail", authenticate, asyncHandler(fc.getThumbnail.bind(fc)));
app.get("/files/:id/download", authenticate, asyncHandler(fc.download.bind(fc)));
app.get("/files/:id/stream", authenticate, asyncHandler(fc.stream.bind(fc)));

// Per-user rate limiters
// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/shares", shareRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/versions", versionRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Initialize storage
(async () => {
  try {
    await storageService.initialize();
    const diskStats = await storageService.getDiskStats();
    console.log(`Storage health check: OK`);
    console.log(`Available space: ${(diskStats.freeDisk / 1024 / 1024 / 1024).toFixed(2)} GB`);
  } catch (error) {
    console.error("Storage initialization failed:", error);
  }
})();

// Graceful shutdown
const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log("Server closed and database disconnected");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Prevent unhandled rejections from crashing the process
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

export default app;
