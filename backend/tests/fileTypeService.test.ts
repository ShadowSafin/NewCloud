import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { fileTypeService } from "../src/services/fileTypeService";

let tempDir: string | undefined;

const writeTempFile = async (name: string, bytes: Buffer) => {
  tempDir = tempDir || (await mkdtemp(join(tmpdir(), "nexxcloud-filetype-")));
  const filePath = join(tempDir, name);
  await writeFile(filePath, bytes);
  return filePath;
};

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("fileTypeService signature validation", () => {
  it("accepts a PNG file with a PNG signature", async () => {
    const filePath = await writeTempFile(
      "image.png",
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );

    await expect(fileTypeService.validateSignature(filePath, "image/png")).resolves.toBe(true);
  });

  it("rejects a claimed PDF when the binary signature is PNG", async () => {
    const filePath = await writeTempFile(
      "fake.pdf",
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );

    await expect(fileTypeService.validateSignature(filePath, "application/pdf")).resolves.toBe(false);
  });

  it("flags dangerous upload types by extension or mime", () => {
    expect(fileTypeService.isDangerous("application/x-msdownload", ".txt")).toBe(true);
    expect(fileTypeService.isDangerous("text/plain", ".exe")).toBe(true);
  });
});
