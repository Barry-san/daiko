import type { Context } from "elysia";
import { StatusCodes } from "http-status-codes";
import { redisClient } from "@/db/redis";
import { AppError } from "@/lib/error";

function getIp(c: Context) {
  const ip = c.request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || c.server?.requestIP(c.request)?.address
  return ip
}

function createRateLimiter({
  capacity,
  refillRate,
  redisKeyPrefix,
}: {
  capacity: number;
  refillRate: number;
  redisKeyPrefix: string;
}) {
  const MAX_BUCKET_CAPACITY = capacity;
  const REFILL_RATE = refillRate;

  async function getCurrentBucket(ip: string) {
    const bucket = await redisClient.get(`${redisKeyPrefix}:${ip}:bucket`);
    if (bucket) {
      const result = Number(bucket)
      return Number.isNaN(result) ? 0 : result;
    }
    await redisClient.set(`${redisKeyPrefix}:${ip}:bucket`, `${MAX_BUCKET_CAPACITY}`);
    return MAX_BUCKET_CAPACITY;
  }

  async function getTimeFromLastRequestInSeconds(ip: string) {
    const lastRequest = await redisClient.get(`${redisKeyPrefix}:${ip}:last`);
    if (!lastRequest) return 0;
    const now = Date.now();
    await redisClient.set(`${redisKeyPrefix}:${ip}:last`, `${now}`);
    return Math.round((now - Number(lastRequest)) / 1000);
  }

  return async (c: Context) => {
    const userIP = getIp(c) || "";
    const bucket = await getCurrentBucket(userIP);

    if (bucket < 1) {
      const interval = await getTimeFromLastRequestInSeconds(userIP);
      const newBucketCapacity = Math.min(
        MAX_BUCKET_CAPACITY,
        bucket + (interval * REFILL_RATE),
      );

      await redisClient.set(`${redisKeyPrefix}:${userIP}:bucket`, `${newBucketCapacity}`);
      if (newBucketCapacity < 1)
        throw new AppError({
          status: StatusCodes.TOO_MANY_REQUESTS,
          message: "Too many requests.",
        });
    }

    const interval = await getTimeFromLastRequestInSeconds(userIP);
    const newBucketCapacity = Math.min(MAX_BUCKET_CAPACITY, bucket - 1 + interval * REFILL_RATE);
    await redisClient.set(`${redisKeyPrefix}:${userIP}:bucket`, `${newBucketCapacity}`);
  };
}

export const authRateLimiter = createRateLimiter({
  capacity: 60,
  refillRate: 1,
  redisKeyPrefix: "authLimit",
});

export const OTPRateLimiter = createRateLimiter({
  refillRate: 0.05,
  capacity: 1,
  redisKeyPrefix: "otpLimit",
});
