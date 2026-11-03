import { test, expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";

/** API checks for validation, access control and data safety. */

const event = (timelineId: string, layerId: string, over: Record<string, unknown> = {}) => ({
  timelineId, layerId, title: "Caesar", notes: "Ides", year: 44, isBce: true, month: 3, day: 15,
  endYear: null, endIsBce: null, endMonth: null, endDay: null, color: "#c9a84c", ...over,
});

async function newTimeline(api: APIRequestContext) {
  const created = await api.post("/api/timelines", { data: { name: `API ${Date.now()}` } });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const studio = await (await api.get(`/api/timelines/${id}`)).json();
  return { id: id as string, general: studio.layers[0].id as string };
}

test.describe("API", () => {
  let api: APIRequestContext;

  test.beforeAll(async ({ baseURL }) => {
    api = await playwrightRequest.newContext({
      baseURL,
      storageState: "tests/e2e/.auth/guest.json",
      extraHTTPHeaders: { origin: baseURL! },
    });
  });
  test.afterAll(() => api.dispose());

  test("validation rejects bad input with clear messages", async () => {
    const { id, general } = await newTimeline(api);
    const check = async (over: Record<string, unknown>, message: RegExp) => {
      const res = await api.post("/api/events", { data: event(id, general, over) });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toMatch(message);
    };
    await check({ month: 2, day: 31 }, /28 days/);
    await check({ year: 13_800_000_000 }, /supported/);
    await check({ color: "#fff;x" }, /#a1b2c3/);
    await check({ title: "x".repeat(201) }, /at most 200/);
    const zeroEnd = await api.post("/api/events", { data: event(id, general, { month: null, day: null, year: 10, endYear: 0, endIsBce: false }) });
    expect((await zeroEnd.json()).endYear).toBe(0);
  });

  test("opening a timeline never deletes identical events", async () => {
    const { id, general } = await newTimeline(api);
    await api.post("/api/events", { data: event(id, general) });
    await api.post("/api/events", { data: event(id, general) });
    await api.get(`/api/timelines/${id}`);
    const studio = await (await api.get(`/api/timelines/${id}`)).json();
    expect(studio.events.filter((e: { title: string }) => e.title === "Caesar")).toHaveLength(2);
  });

  test("deleting a layer touches only its own events", async () => {
    const { id, general } = await newTimeline(api);
    const layer = await (await api.post("/api/layers", { data: { timelineId: id, name: "Rome", color: "#f43f5e" } })).json();
    const inLayer = await (await api.post("/api/events", { data: event(id, layer.id) })).json();
    const mentions = await (await api.post("/api/events", { data: event(id, general, { notes: '"layer":"rome"' }) })).json();
    expect((await api.delete(`/api/layers/${layer.id}`, { data: {} })).status()).toBe(400);
    const res = await (await api.delete(`/api/layers/${layer.id}`, { data: { mode: "delete-events" } })).json();
    expect(res.deletedEventIds).toEqual([inLayer.id]);
    const studio = await (await api.get(`/api/timelines/${id}`)).json();
    expect(studio.events.map((e: { id: string }) => e.id)).toContain(mentions.id);
  });

  test("trash makes a timeline read-only and blocks direct deletedAt writes", async () => {
    const { id, general } = await newTimeline(api);
    const ev = await (await api.post("/api/events", { data: event(id, general) })).json();
    expect((await api.patch(`/api/timelines/${id}`, { data: { deletedAt: "2000-01-01" } })).status()).toBe(400);
    expect((await api.delete(`/api/timelines/${id}`)).status()).toBe(409);
    await api.post(`/api/timelines/${id}/trash`);
    expect((await api.patch(`/api/events/${ev.id}`, { data: { title: "x" } })).status()).toBe(409);
    await api.post(`/api/timelines/${id}/restore`);
  });

  test("cross-site writes are refused", async ({ baseURL }) => {
    const res = await api.post("/api/timelines", { data: { name: "x" }, headers: { origin: "https://evil.example" } });
    expect(res.status()).toBe(403);
    expect(baseURL).toBeTruthy();
  });

  test("another user cannot read or change this user's data", async ({ baseURL }) => {
    const { id, general } = await newTimeline(api);
    const ev = await (await api.post("/api/events", { data: event(id, general) })).json();

    const other = await playwrightRequest.newContext({ baseURL, extraHTTPHeaders: { origin: baseURL! } });
    const { csrfToken } = await (await other.get("/api/auth/csrf")).json();
    await other.post("/api/auth/callback/guest", { form: { csrfToken } });
    expect((await other.get("/api/timelines")).status()).toBe(200);
    expect((await other.get(`/api/timelines/${id}`)).status()).toBe(404);
    expect((await other.patch(`/api/events/${ev.id}`, { data: { title: "hacked" } })).status()).toBe(404);
    expect((await other.delete("/api/events", { data: { ids: [ev.id] } })).status()).toBe(404);
    await other.dispose();
  });

  test("security headers are set", async () => {
    const res = await api.get("/");
    expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });
});
