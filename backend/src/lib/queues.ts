import { Queue } from "bullmq";
import { createRedisConnection } from "./redis";

const defaultOpts = {
  removeOnComplete: 100,
  removeOnFail: 50,
};

export const thumbnailQueue = new Queue("thumbnail-generation", {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    ...defaultOpts,
  },
});

export const chunkMergeQueue = new Queue("chunk-merge", {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    ...defaultOpts,
  },
});

export const trashCleanupQueue = new Queue("trash-cleanup", {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    ...defaultOpts,
  },
});

export const fileHashQueue = new Queue("file-hash", {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    ...defaultOpts,
  },
});

export const dedupProcessorQueue = new Queue("dedup-processor", {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    ...defaultOpts,
  },
});

export const versionCleanupQueue = new Queue("version-cleanup", {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    ...defaultOpts,
  },
});

export const storageCalcQueue = new Queue("storage-calc", {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    ...defaultOpts,
  },
});

export const storageIntegrityQueue = new Queue("storage-integrity", {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    ...defaultOpts,
  },
});

export const orphanBlobCleanupQueue = new Queue("orphan-blob-cleanup", {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    ...defaultOpts,
  },
});

export const referenceVerificationQueue = new Queue("reference-verification", {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    ...defaultOpts,
  },
});

export const chunkCleanupQueue = new Queue("chunk-cleanup", {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    ...defaultOpts,
  },
});

export const metadataRepairQueue = new Queue("metadata-repair", {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    ...defaultOpts,
  },
});

export const allQueues = [
  thumbnailQueue,
  chunkMergeQueue,
  trashCleanupQueue,
  fileHashQueue,
  dedupProcessorQueue,
  versionCleanupQueue,
  storageCalcQueue,
  storageIntegrityQueue,
  orphanBlobCleanupQueue,
  referenceVerificationQueue,
  chunkCleanupQueue,
  metadataRepairQueue,
];
