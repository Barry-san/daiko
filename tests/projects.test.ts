import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { createNewUser } from "../src/features/auth/auth.repo";
import { deleteProject } from "../src/features/projects/projects.repo";
import { getProjects, handleNewProject } from "../src/features/projects/projects.services";
import { createTestDb, emailForTest, newId, runMigrations, truncateAll } from "./setup";

describe("projects", () => {
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
      username: "project-owner",
      password_hash: "not-used-in-project-tests",
    });
  });

  describe("create project", () => {
    it("creates a project and returns it", async () => {
      const result = await handleNewProject(db, {
        userID: userId,
        project: { name: "My Project", source: { type: "zip", uri: "upload.zip" }, config: { language: "go", env: {} } },
      });

      expect(result).toBeDefined();
      expect(result.project_name).toBe("My Project");
      expect(result.content).toBe(JSON.stringify({ type: "zip", uri: "upload.zip" }));
      expect(result.author).toBe(userId);
      expect(result.project_id).toBeString();
    });
  });

  describe("list projects", () => {
    it("returns an empty list when user has no projects", async () => {
      const projects = await getProjects(db, userId);
      expect(projects).toBeArray();
      expect(projects.length).toBe(0);
    });

    it("returns only the current user's projects", async () => {
      const otherUserId = newId();
      await createNewUser(db, {
        user_id: otherUserId,
        email: emailForTest(),
        username: "other-user",
        password_hash: "not-used",
      });

      await handleNewProject(db, { userID: userId, project: { name: "My Project", source: { type: "zip", uri: "a.zip" }, config: { language: "bun" } } });
      await handleNewProject(db, { userID: otherUserId, project: { name: "Other's Project", source: { type: "git", url: "https://github.com/owner/repo", branch: "main" }, config: { language: "python" } } });

      const myProjects = await getProjects(db, userId);
      expect(myProjects.length).toBe(1);
      expect(myProjects[0].project_name).toBe("My Project");
    });
  });

  describe("delete project", () => {
    it("soft-deletes a project", async () => {
      const result = await handleNewProject(db, {
        userID: userId,
        project: { name: "To Delete", source: { type: "zip", uri: "b.zip" }, config: { language: "node" } },
      });

      const deleted = await deleteProject(db, result.project_id);
      expect(deleted).toBeTrue();

      const projects = await getProjects(db, userId);
      expect(projects.length).toBe(0);
    });
  });
});
