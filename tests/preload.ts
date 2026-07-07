// Override everything — bun auto-loads .env BEFORE this runs,
// so we must explicitly clobber every value that the env schema
// or service modules will read.  No fallback to existing process.env.
process.env.JWT_SECRET = process.env.TEST_JWT_SECRET ?? "test-secret-that-is-at-least-32-characters-long-!!"
process.env.JWT_ISSUER = "test"

process.env.DB_ADAPTER = "postgres"
process.env.DB_USER = process.env.TEST_DB_USER ?? "postgres"
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD ?? ""
process.env.DB_NAME = process.env.TEST_DB_NAME ?? "daiko_test"
process.env.DB_PORT = process.env.TEST_DB_PORT ?? "5432"

process.env.PORT_NUMBER = "0"
process.env.REDIS_URL = "redis://localhost:6379"
process.env.GITHUB_CLIENT_ID = "test-client-id"
process.env.GITHUB_CLIENT_SECRET = "test-client-secret"
process.env.GITHUB_REDIRECT_URI = "http://localhost:3000/auth/oauth/callback"
process.env.RESEND_API_KEY = "re_test"
