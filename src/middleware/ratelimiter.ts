import type { PreContext } from "elysia";
import { StatusCodes } from "http-status-codes";
import { redisClient } from "../db/redis";
import { AppError } from "../lib/error";

function getIp(c: PreContext) {
  return c.server?.requestIP(c.request)?.address
}


function createRateLimiter({
  capacity,
  refilRate,
  redisKeyPrefix

}: { capacity: number, refilRate: number, redisKeyPrefix: string }) {
  const MAX_BUCKET_CAPACITY = capacity;
  const REFIL_RATE = refilRate

  async function getCurrentBucket(ip: string) {
    const bucket = await redisClient.get(`${redisKeyPrefix}:${ip}:bucket`)
    if (bucket) {
      return Number(bucket)
    }
    await redisClient.set(`${redisKeyPrefix}:${ip}:bucket`, `${MAX_BUCKET_CAPACITY}`);
    return MAX_BUCKET_CAPACITY
  }

  async function getTimeFromLastRequestInSeconds(ip: string) {
    const lastRequest = await redisClient.get(`${redisKeyPrefix}:${ip}:last`)
    const now = Date.now()
    await redisClient.set(`${redisKeyPrefix}:${ip}:last`, `${now}`);
    if (!lastRequest) return 0;
    return Math.round((now - Number(lastRequest)) / 1000)
  }


  return async (c: PreContext) => {
    const userIP = getIp(c) || "";
    const bucket = await getCurrentBucket(userIP)

    if (bucket < 1) {
      const interval = await getTimeFromLastRequestInSeconds(userIP)
      const newBucketCapacity = Math.min(MAX_BUCKET_CAPACITY, bucket + (interval * REFIL_RATE))

      await
        redisClient.set(`${redisKeyPrefix}:${userIP}:bucket`, `${newBucketCapacity}`)
      throw new AppError({
        status: StatusCodes.TOO_MANY_REQUESTS,
        message: "Pump the brakes."
      })
    }

    const interval = await getTimeFromLastRequestInSeconds(userIP)
    const newBucketCapacity = Math.min(MAX_BUCKET_CAPACITY, bucket - 1 + (interval * REFIL_RATE))
    await redisClient.set(`${redisKeyPrefix}:${userIP}:bucket`, `${newBucketCapacity}`)
    console.log(bucket)


  }
}

export const authRateLimiter = createRateLimiter({
  capacity: 60, refilRate: 1, redisKeyPrefix: "authLimit"
})
