import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as routeGet } from "./route/route";
import { GET as searchGet } from "./search/route";
import { GET as tileGet, TILE_CACHE_TTL_MS } from "./tile/[z]/[x]/[y]/route";
import { GET as transitGet } from "./transit/route";

function request(path: string): NextRequest {
  return new Request(`https://wanderlust.test${path}`) as NextRequest;
}

describe("public API validation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it("rejects malformed route coordinates before calling a route provider", async () => {
    const response = await routeGet(request("/api/route?coords=1,2;not-a-coordinate"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid coordinates" });
  });

  it("limits the search input before contacting search providers", async () => {
    const tooLong = "x".repeat(121);
    const response = await searchGet(request(`/api/search?q=${tooLong}`));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Query must be no longer than 120 characters",
    });
  });

  it("rejects invalid transit coordinates", async () => {
    const response = await transitGet(request("/api/transit?origin=91,0&destination=0,0"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid coordinates" });
  });

  it("accepts only valid Web Mercator tile coordinates and sources", async () => {
    const invalidCoordinate = await tileGet(request("/api/tile/3/8/0"), {
      params: Promise.resolve({ z: "3", x: "8", y: "0" }),
    });
    const partialNumber = await tileGet(request("/api/tile/3abc/0/0"), {
      params: Promise.resolve({ z: "3abc", x: "0", y: "0" }),
    });
    const invalidSource = await tileGet(request("/api/tile/3/0/0?source=other"), {
      params: Promise.resolve({ z: "3", x: "0", y: "0" }),
    });

    expect(invalidCoordinate.status).toBe(400);
    expect(partialNumber.status).toBe(400);
    expect(invalidSource.status).toBe(400);
    await expect(invalidSource.json()).resolves.toEqual({ error: "Invalid tile source" });
  });

  it("expires an in-memory tile instead of retaining it for the instance lifetime", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-07-19T12:00:00.000Z");
    vi.setSystemTime(now);
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(new Uint8Array([1, 2, 3, 4]), {
          headers: { "content-type": "image/png" },
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const context = { params: Promise.resolve({ z: "3", x: "1", y: "1" }) };

    await tileGet(request("/api/tile/3/1/1?source=osm"), context);
    await tileGet(request("/api/tile/3/1/1?source=osm"), context);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date(now.getTime() + TILE_CACHE_TTL_MS + 1));
    await tileGet(request("/api/tile/3/1/1?source=osm"), context);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
