import { check, sleep } from "k6";
import http from "k6/http";

export const options = {
  stages: [
    { duration: "10s", target: 5 },
    { duration: "40s", target: 20 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE = "http://localhost:3000";

export default function () {
  // const loginRes = http.post(`${BASE}/auth/login`, JSON.stringify({
  //   email: "mubarakoyeyemi060@gmail.com",
  //   password: "hello123",
  // }), { headers: { "Content-Type": "application/json" }, tags: { name: "login" } });

  // check(loginRes, { "login status 200": (r) => r.status === 200 || r.status === 429 });

  const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwMTlmMmNhYy1iYTdkLTcwMDAtOThjOS1lZjUwMDEzMmI3ZWIiLCJpc1ZlcmlmaWVkIjp0cnVlLCJpYXQiOjE3ODMzNDM4MjksImV4cCI6MTc4NTkzNTgyOSwiaXNzIjoibXViYXJha095ZXllbWkifQ.j96r9-xXrAnrkoPZIZncZ5YTXZCWRRsW78TR0q6Byqw"

  if (token) {
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const projectsRes = http.get(`${BASE}/projects`, { headers, tags: { name: "projects" } });
    check(projectsRes, { "projects status 200": (r) => r.status === 200 });
  }

  sleep(1);
}
