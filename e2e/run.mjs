/**
 * E2E tests against a running FakeRadar stack (docker compose up).
 *
 * Usage:
 *   node e2e/run.mjs
 *   E2E_API_URL=http://localhost:8080 E2E_AI_URL=http://localhost:8000 node e2e/run.mjs
 */

const API_URL = process.env.E2E_API_URL ?? "http://localhost:8080";
const AI_URL = process.env.E2E_AI_URL ?? "http://localhost:8000";
const ANALYSIS_TIMEOUT_MS = Number(process.env.E2E_ANALYSIS_TIMEOUT_MS ?? 120_000);

let passed = 0;
let failed = 0;

function fail(message) {
  failed += 1;
  console.error(`  ✗ ${message}`);
}

function pass(message) {
  passed += 1;
  console.log(`  ✓ ${message}`);
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

async function test(name, fn) {
  process.stdout.write(`\n▸ ${name}\n`);
  try {
    await fn();
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }
}

async function main() {
  console.log(`FakeRadar E2E — API ${API_URL}, AI ${AI_URL}`);
  console.log(`Analysis timeout: ${ANALYSIS_TIMEOUT_MS}ms`);

  await test("API health", async () => {
    const { res, body } = await fetchJson(`${API_URL}/health`);
    if (!res.ok || body?.ok !== true) fail(`expected ok, got ${res.status}`);
    else pass("GET /health");
  });

  await test("AI health", async () => {
    const { res, body } = await fetchJson(`${AI_URL}/ai/health`);
    if (!res.ok || body?.status !== "ok") fail(`AI unhealthy: ${res.status}`);
    else pass("GET /ai/health");
  });

  const email = `e2e-${Date.now()}@fakeradar.test`;
  const password = "e2e-password-123";
  let token = "";

  await test("Register user", async () => {
    const { res, body } = await fetchJson(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.status !== 201 || !body?.id) fail(`register failed: ${res.status} ${JSON.stringify(body)}`);
    else pass(`registered ${email}`);
  });

  await test("Login", async () => {
    const { res, body } = await fetchJson(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok || !body?.token) fail(`login failed: ${res.status}`);
    else {
      token = body.token;
      pass("received JWT");
    }
  });

  await test("GET /api/users/me", async () => {
    const { res, body } = await fetchJson(`${API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok || body?.email !== email) fail(`/me failed: ${res.status}`);
    else pass(`me → ${body.email}`);
  });

  let analysisId = "";

  await test("Create analysis (LLM pipeline)", async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);
    const { res, body } = await fetchJson(`${API_URL}/api/analyses`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputText:
          "The Eiffel Tower is located in Paris, France. It was completed in 1889 for the World's Fair.",
      }),
    });
    clearTimeout(timer);

    if (res.status !== 201) {
      fail(`analysis failed: ${res.status} ${JSON.stringify(body)}`);
      return;
    }
    if (!body?.id || !body?.verdict) {
      fail(`invalid analysis response: ${JSON.stringify(body)}`);
      return;
    }
    if (body.explanation?.includes("AI_MOCK_LLM")) {
      fail("response looks like mock LLM — set AI_MOCK_LLM=false and LLM_API_KEY");
      return;
    }
    analysisId = body.id;
    pass(`analysis ${body.id} → ${body.verdict} (${(body.credibilityScore * 100).toFixed(0)}%)`);
    pass(`claims: ${body.claims?.length ?? 0}, explanation length: ${body.explanation?.length ?? 0}`);
  });

  await test("List analyses", async () => {
    const { res, body } = await fetchJson(`${API_URL}/api/analyses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok || !Array.isArray(body)) fail(`list failed: ${res.status}`);
    else if (!body.some((a) => a.id === analysisId)) fail("created analysis not in list");
    else pass(`${body.length} analysis(es) in history`);
  });

  await test("Get analysis by id", async () => {
    if (!analysisId) {
      fail("skipped — no analysis id");
      return;
    }
    const { res, body } = await fetchJson(`${API_URL}/api/analyses/${analysisId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok || body?.id !== analysisId) fail(`get by id failed: ${res.status}`);
    else pass(`fetched ${analysisId}`);
  });

  console.log(`\n${"─".repeat(40)}`);
  console.log(`Passed: ${passed}  Failed: ${failed}`);
  if (failed > 0) process.exit(1);
  console.log("All E2E tests passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
