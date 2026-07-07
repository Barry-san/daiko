import type { Context } from "elysia";
import { StatusCodes } from "http-status-codes";
import { redisClient } from "@/db/redis";
import { AppError } from "@/lib/error";

const TOKEN_BUCKET_SCRIPT = `
local bucket_key = KEYS[1] .. ":bucket"
local last_key = KEYS[1] .. ":last"
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local bucket = redis.call("GET", bucket_key)
local last = redis.call("GET", last_key)

if bucket == false then
    bucket = capacity
else
    bucket = tonumber(bucket)
end

if last ~= false then
    local elapsed = (now - tonumber(last)) / 1000.0
    bucket = math.min(capacity, bucket + elapsed * rate)
end

if bucket >= 1 then
    bucket = bucket - 1
    redis.call("SET", bucket_key, bucket)
    redis.call("SET", last_key, now)
    redis.call("EXPIRE", bucket_key, ttl)
    redis.call("EXPIRE", last_key, ttl)
    return {1, bucket}
else
    redis.call("SET", bucket_key, bucket)
    redis.call("SET", last_key, now)
    redis.call("EXPIRE", bucket_key, ttl)
    redis.call("EXPIRE", last_key, ttl)
    return {0, bucket}
end
`;

function getIp(c: Context) {
  const ip = c.server?.requestIP(c.request)?.address;
  const forwarded = c.request.headers.get("X-Forwarded-For");
  return forwarded?.split(",")[0]?.trim() || ip;
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
  const TTL = Math.ceil(capacity / refillRate) * 2;

  return async (c: Context) => {
    const userIP = getIp(c);
    if (!userIP) {
      throw new AppError({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Could not determine client IP.",
      });
    }

    const now = Date.now();
    const result = await redisClient.send("EVAL", [
      TOKEN_BUCKET_SCRIPT,
      "1",
      `${redisKeyPrefix}:${userIP}`,
      String(capacity),
      String(refillRate),
      String(now),
      String(TTL),
    ]);

    const [allowed, _remaining] = result as [number, string];
    if (allowed === 0) {
      throw new AppError({
        status: StatusCodes.TOO_MANY_REQUESTS,
        message: "Too many requests.",
      });
    }
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
