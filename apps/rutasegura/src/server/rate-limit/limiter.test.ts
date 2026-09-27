import { describe, expect, it } from "vitest";
import { consume, consumeAll, rateLimitHeaders, type RateLimitStore } from "./limiter";

/** Simula el script Lua de ventana fija sobre un mapa en memoria. */
function memoryStore(): RateLimitStore {
  const counters = new Map<string, number>();
  return {
    async eval(_script, _numKeys, key, windowMs) {
      const count = (counters.get(String(key)) ?? 0) + 1;
      counters.set(String(key), count);
      return [count, Number(windowMs)];
    },
  };
}

describe("rate limiter", () => {
  it("permite hasta el límite y bloquea a partir del siguiente", async () => {
    const store = memoryStore();
    const rule = { key: "rl:test", limit: 3, windowSeconds: 900 };
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await consume(store, rule));
    expect(results.map((result) => result.allowed)).toEqual([true, true, true, false]);
    expect(results[2]?.remaining).toBe(0);
    expect(results[3]?.resetSeconds).toBe(900);
  });

  it("con varias reglas, bloquea si cualquiera se excede", async () => {
    const store = memoryStore();
    const ip = { key: "rl:ip", limit: 10, windowSeconds: 900 };
    const email = { key: "rl:email", limit: 1, windowSeconds: 900 };
    expect((await consumeAll(store, [ip, email])).allowed).toBe(true);
    const blocked = await consumeAll(store, [ip, email]);
    expect(blocked.allowed).toBe(false);
    expect(blocked.limit).toBe(1);
  });

  it("anuncia Retry-After solo cuando bloquea", () => {
    const allowed = rateLimitHeaders({ allowed: true, limit: 5, remaining: 4, resetSeconds: 900 });
    const blocked = rateLimitHeaders({ allowed: false, limit: 5, remaining: 0, resetSeconds: 120 });
    expect(allowed["Retry-After"]).toBeUndefined();
    expect(blocked["Retry-After"]).toBe("120");
    expect(blocked["RateLimit-Remaining"]).toBe("0");
  });
});
