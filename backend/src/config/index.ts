import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  jwtSecret: process.env.JWT_SECRET || "default-secret-change-me",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "default-refresh-secret-change-me",
  jwtExpiration: process.env.JWT_EXPIRATION || "15m",
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || "7d",
  storageRoot: process.env.STORAGE_ROOT || "/app/data/storage",
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "1099511627776", 10),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  // Phase 3: Production config
  trashRetentionDays: parseInt(process.env.TRASH_RETENTION_DAYS || "30", 10),
  maxVersionsPerFile: parseInt(process.env.MAX_VERSIONS_PER_FILE || "10", 10),
  defaultStorageQuota: BigInt(process.env.DEFAULT_STORAGE_QUOTA || "10737418240"),
  chunkUploadConcurrency: parseInt(process.env.CHUNK_UPLOAD_CONCURRENCY || "3", 10),
  maxFilesPerUser: parseInt(process.env.MAX_FILES_PER_USER || "100000", 10),
  maxUploadsPerMinute: parseInt(process.env.MAX_UPLOADS_PER_MINUTE || "30", 10),
  bullBoardUsername: process.env.BULL_BOARD_USERNAME || "admin",
  bullBoardPassword: process.env.BULL_BOARD_PASSWORD || "changeme",
};
