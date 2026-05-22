import { Router } from "express";
import multer from "multer";
import { UploadController } from "../controllers/uploadController";
import { UploadService } from "../services/uploadService";
import { authenticate } from "../middleware/auth";
import { prisma } from "../db";

const router = Router();
const uploadService = new UploadService(prisma);
const uploadController = new UploadController(uploadService);

// Memory storage for chunks (not saved to disk until processed)
const chunkUpload = multer({ storage: multer.memoryStorage() });

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);

router.post("/initiate", authenticate, asyncHandler(uploadController.initiate));
router.post("/:sessionId/chunk/:chunkIndex", authenticate, chunkUpload.single("chunk"), asyncHandler(uploadController.uploadChunk));
router.post("/:sessionId/complete", authenticate, asyncHandler(uploadController.complete));
router.post("/:sessionId/cancel", authenticate, asyncHandler(uploadController.cancel));
router.get("/status/:sessionId", authenticate, asyncHandler(uploadController.getStatus));
router.get("/sessions", authenticate, asyncHandler(uploadController.listSessions));
router.get("/:sessionId/resume", authenticate, asyncHandler(uploadController.resume));
router.get("/session/:id", authenticate, asyncHandler(uploadController.getSessionUploadedChunks));

export default router;
