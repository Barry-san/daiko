import { describe, expect, it, beforeAll, afterAll, beforeEach } from "bun:test";
import { createNewUser } from "../src/features/auth/auth.repo";
import { handleCreateOTP, handleVerifyOTP } from "../src/features/otp/otp.services";
import { createTestDb, emailForTest, newId, runMigrations, truncateAll } from "./setup";

describe("OTP services", () => {
  let db: ReturnType<typeof createTestDb>;
  let userId: string;

  beforeAll(async () => {
    db = createTestDb();
    await runMigrations(db);
  });

  afterAll(async () => {
    await db.end();
  });

  beforeEach(async () => {
    await truncateAll(db);
    userId = newId();
    await createNewUser(db, {
      user_id: userId,
      email: emailForTest(),
      username: "otp-user",
      password_hash: "not-used-in-otp-tests",
    });
  });

  describe("create OTP", () => {
    it("returns true when OTP is created", async () => {
      const result = await handleCreateOTP(db, userId);
      expect(result).toBeTrue();
    });

    it("creates an OTP record in the database", async () => {
      await handleCreateOTP(db, userId);
      const otps = await db`SELECT * FROM otp WHERE user_id = ${userId}`;
      expect(otps.length).toBe(1);
      expect(otps[0].otp).toBeString();
      expect(otps[0].otp).toHaveLength(6);
    });

    it("creates a pending email record", async () => {
      await handleCreateOTP(db, userId);
      const user = await db`SELECT email FROM users WHERE user_id = ${userId}`;
      const emailRecords = await db`SELECT * FROM emails WHERE recipient = ${user[0].email}`;
      expect(emailRecords.length).toBe(1);
      expect(emailRecords[0].status).toBe("pending");
    });
  });

  describe("verify OTP", () => {
    it("verifies user when OTP matches", async () => {
      await handleCreateOTP(db, userId);

      const otps = await db`SELECT * FROM otp WHERE user_id = ${userId}`;
      const otpCode = otps[0].otp;

      const result = await handleVerifyOTP(db, otpCode, userId);
      expect(result).toBeDefined();

      const user = await db`SELECT is_verified FROM users WHERE user_id = ${userId}`;
      expect(user[0].is_verified).toBeTrue();
    });

    it("throws for incorrect OTP", async () => {
      await handleCreateOTP(db, userId);

      expect(
        handleVerifyOTP(db, "000000", userId),
      ).rejects.toMatchObject({ status: 400, message: "Invalid OTP." });
    });
  });
});
