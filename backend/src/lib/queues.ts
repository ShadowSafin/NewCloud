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

export const allQueues = [
  thumbnailQueue,
  chunkMergeQueue,
  trashCleanupQueue,
  fileHashQueue,
  dedupProcessorQueue,
  versionCleanupQueue,
  storageCalcQueue,
];
