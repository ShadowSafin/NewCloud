import { Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { AuthenticatedRequest } from "../types";
import { BadRequestError } from "../utils/errors";
import { fileTypeService } from "../services/fileTypeService";
import { config } from "../config";

// Dangerous file types can be rejected by policy, but are allowed by default
// so NexxCloud can store arbitrary user files while still avoiding inline execution.
const DANGEROUS_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
  ".vbs", ".vbe", ".js", ".jse", ".ws", ".wsf", ".wsc",
  ".ps1", ".psm1", ".psd1", ".ps1xml", ".pssc", ".psrc",
  ".reg", ".dll", ".sys", ".drv",
]);

// MIME type magic bytes for verification
const MAGIC_BYTES: { mime: string; bytes: number[] }[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: "application/zip", bytes: [0x50, 0x4b, 0x03, 0x04] },
  { mime: "video/mp4", bytes: [0x66, 0x74, 0x79, 0x70] }, // offset 4
];

/**
 * Validate uploaded file safety:
 * 1. Check file extension against dangerous types
 * 2. Verify MIME type matches magic bytes (for common types)
 */
export async function validateUpload(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const file = req.file;
  if (!file) return next();

  // Check extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (config.blockDangerousUploads && (DANGEROUS_EXTENSIONS.has(ext) || fileTypeService.isDangerous(file.mimetype || "", ext))) {
    await rejectUploadedFile(file, `File type ${ext} is not allowed for security reasons`);
  }

  // Verify magic bytes for common types
  if (file.buffer && file.buffer.length >= 8) {
    const detectedMime = detectMimeFromBytes(file.buffer);
    if (detectedMime && file.mimetype !== detectedMime) {
      // Allow some common mismatches
      const allowed = isAllowedMimeMismatch(file.mimetype, detectedMime);
      if (!allowed) {
        await rejectUploadedFile(
          file,
          `File content (${detectedMime}) does not match declared type (${file.mimetype})`
        );
      }
    }
  }

  if (file.path) {
    const valid = await fileTypeService.validateSignature(file.path, file.mimetype || "application/octet-stream");
    if (!valid) {
      await rejectUploadedFile(file, "File content does not match declared type");
    }
  }

  next();
}

async function rejectUploadedFile(file: Express.Multer.File, message: string): Promise<never> {
  if (file.path && fs.existsSync(file.path)) {
    await fs.promises.unlink(file.path).catch(() => {});
  }
  throw new BadRequestError(message);
}

function detectMimeFromBytes(buffer: Buffer): string | null {
  for (const { mime, bytes } of MAGIC_BYTES) {
    const offset = mime === "video/mp4" ? 4 : 0;
    if (buffer.length >= offset + bytes.length) {
      const match = bytes.every((b, i) => buffer[offset + i] === b);
      if (match) return mime;
    }
  }
  return null;
}

function isAllowedMimeMismatch(declared: string, detected: string): boolean {
  // Allow octet-stream as a catch-all
  if (declared === "application/octet-stream") return true;

  // Allow application/zip variants
  if (detected === "application/zip" && declared.startsWith("application/")) return true;

  return false;
}
