CREATE TABLE "storage_blobs" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "physical_path" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "reference_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_blobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "storage_blobs_hash_key" ON "storage_blobs"("hash");
CREATE UNIQUE INDEX "storage_blobs_physical_path_key" ON "storage_blobs"("physical_path");
CREATE INDEX "storage_blobs_hash_idx" ON "storage_blobs"("hash");
CREATE INDEX "storage_blobs_reference_count_idx" ON "storage_blobs"("reference_count");

ALTER TABLE "files" ADD COLUMN "blob_id" TEXT;
ALTER TABLE "file_versions" ADD COLUMN "blob_id" TEXT;

CREATE INDEX "files_blob_id_idx" ON "files"("blob_id");
CREATE INDEX "file_versions_blob_id_idx" ON "file_versions"("blob_id");

ALTER TABLE "files" ADD CONSTRAINT "files_blob_id_fkey"
  FOREIGN KEY ("blob_id") REFERENCES "storage_blobs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_blob_id_fkey"
  FOREIGN KEY ("blob_id") REFERENCES "storage_blobs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
