import { randomUUIDv7, SQL } from "bun";

// Read connection params from process.env (set by preload.ts + optional TEST_DB_*).
// We do NOT import @/lib/env here so there is zero coupling between the test
// harness and the application's env-schema module.
function dbUser()    { return process.env.TEST_DB_USER     ?? "postgres" }
function dbPass()    { return process.env.TEST_DB_PASSWORD  ?? "" }
function dbName()    { return process.env.TEST_DB_NAME      ?? "daiko_test" }
function dbPort()    { return Number(process.env.TEST_DB_PORT ?? "5432") }

export function createTestDb(): SQL {
  return new SQL({
    adapter: "postgres",
    hostname: "localhost",
    port: dbPort(),
    database: dbName(),
    username: dbUser(),
    password: dbPass(),
  });
}

export async function runMigrations(db: SQL) {
  await db`
    CREATE TABLE IF NOT EXISTS users (
      user_id uuid PRIMARY KEY,
      email varchar(255) NOT NULL UNIQUE,
      username varchar(255),
      password_hash varchar(255) NOT NULL,
      is_verified boolean DEFAULT false,
      created_at timestamptz DEFAULT NOW(),
      deleted_at timestamptz
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS otp (
      otp varchar(6) NOT NULL,
      user_id uuid NOT NULL REFERENCES users(user_id),
      expires_at timestamptz NOT NULL
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS emails (
      email_id uuid NOT NULL PRIMARY KEY,
      recipient varchar(255) NOT NULL,
      content text NOT NULL,
      type varchar(20),
      status varchar(10) DEFAULT 'pending',
      created_at timestamptz DEFAULT NOW(),
      completed_at timestamptz,
      failed_at timestamptz,
      retry_count integer DEFAULT 0
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS projects (
      project_id uuid PRIMARY KEY,
      project_name varchar(255) NOT NULL,
      author uuid NOT NULL,
      created_at timestamptz DEFAULT NOW(),
      content text,
      deleted_at timestamptz
    )
  `;
}

export async function truncateAll(db: SQL) {
  await db`TRUNCATE TABLE otp, emails, projects, users CASCADE`;
}

export function newId() {
  return randomUUIDv7();
}

let counter = 0;
export function emailForTest() {
  return `test-${newId()}-${counter++}@example.com`;
}
