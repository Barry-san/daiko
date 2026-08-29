import { randomUUIDv7, sql } from "bun";

export type Session = {
  session_id: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
  last_used_at: Date;
  revoked_at: Date | null;
};

export async function createSession(db: Bun.SQL, userId: string, ttlMs: number): Promise<Session> {
  const session_id = randomUUIDv7();
  const now = new Date();
  const expires_at = new Date(now.getTime() + ttlMs);
  const res = await db`
    INSERT INTO sessions ${sql({ session_id, user_id: userId, created_at: now, expires_at, last_used_at: now })}
    RETURNING *
  `;
  return (res as Session[])[0];
}

export async function getSession(db: Bun.SQL, sessionId: string): Promise<Session | null> {
  try {
    const res: Session[] = await db`SELECT * FROM sessions WHERE session_id = ${sessionId}`;
    return res[0] ?? null;
  } catch {
    return null;
  }
}

export async function touchSession(db: Bun.SQL, sessionId: string, expiresAt: Date) {
  await db`
    UPDATE sessions
    SET last_used_at = NOW(), expires_at = ${expiresAt}
    WHERE session_id = ${sessionId}
  `;
}

export async function revokeSession(db: Bun.SQL, sessionId: string) {
  await db`UPDATE sessions SET revoked_at = NOW() WHERE session_id = ${sessionId}`;
}

export async function revokeUserSessions(db: Bun.SQL, userId: string) {
  await db`
    UPDATE sessions SET revoked_at = NOW()
    WHERE user_id = ${userId} AND revoked_at IS NULL
  `;
}

export async function deleteExpiredSessions(db: Bun.SQL) {
  await db`DELETE FROM sessions WHERE expires_at < NOW() OR revoked_at IS NOT NULL`;
}