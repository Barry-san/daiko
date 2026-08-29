import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { handleLogin, handleRefresh, handleSignup } from "../src/features/auth/auth.services";
import { revokeSession } from "../src/features/auth/session.repo";
import { createTestDb, emailForTest, runMigrations, truncateAll } from "./setup";

describe("auth services", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeAll(async () => {
    db = createTestDb();
    await runMigrations(db);
  });

  afterAll(async () => {
    await db.end();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  describe("signup", () => {
    it("creates a new user and returns access token", async () => {
      const email = emailForTest();
      const result = await handleSignup(db, {
        email,
        password: "secret123",
        username: "testuser",
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.accessToken).toBeString();
    });

    it("rejects duplicate email", async () => {
      const email = emailForTest();
      await handleSignup(db, { email, password: "secret123", username: "u1" });

      expect(
        handleSignup(db, { email, password: "otherpass", username: "u2" }),
      ).rejects.toMatchObject({ status: 400, message: "Invalid credentials" });
    });
  });

  describe("login", () => {
    it("returns tokens for valid credentials", async () => {
      const email = emailForTest();
      await handleSignup(db, { email, password: "secret123", username: "testuser" });

      const result = await handleLogin(db, { email, password: "secret123" });

      expect(result.data.accessToken).toBeString();
      expect(result.data.email).toBe(email);
      expect(result.refreshToken).toBeString();
    });

    it("throws for unknown email", async () => {
      expect(
        handleLogin(db, { email: "nobody@test.com", password: "secret123" }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("throws for wrong password", async () => {
      const email = emailForTest();
      await handleSignup(db, { email, password: "secret123", username: "testuser" });

      expect(
        handleLogin(db, { email, password: "wrongpass" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("refresh", () => {
    it("returns a new access token from a valid refresh token and rotates the session", async () => {
      const email = emailForTest();
      await handleSignup(db, { email, password: "secret123", username: "testuser" });
      const { refreshToken } = await handleLogin(db, { email, password: "secret123" });

      const result = await handleRefresh(db, refreshToken);

      expect(result.accessToken).toBeString();
      expect(result.refreshToken).toBeString();
      expect(result.refreshToken).not.toBe(refreshToken);

      // old session is revoked → cannot be used again
      expect(
        handleRefresh(db, refreshToken),
      ).rejects.toMatchObject({ status: 401 });
      // rotated token still works
      expect(
        (await handleRefresh(db, result.refreshToken)).accessToken,
      ).toBeString();
    });

    it("throws for invalid refresh token", async () => {
      expect(
        handleRefresh(db, "invalid-token"),
      ).rejects.toMatchObject({ status: 401 });
    });

    it("throws after the session is revoked (logout)", async () => {
      const email = emailForTest();
      await handleSignup(db, { email, password: "secret123", username: "testuser" });
      const { refreshToken } = await handleLogin(db, { email, password: "secret123" });

      await revokeSession(db, refreshToken);

      expect(
        handleRefresh(db, refreshToken),
      ).rejects.toMatchObject({ status: 401 });
    });
  });
});
