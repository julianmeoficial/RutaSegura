import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class NavigationSignal extends Error {}
vi.mock("next/navigation", () => ({
  unstable_rethrow: (error: unknown) => {
    if (error instanceof NavigationSignal) throw error;
  },
}));

const { PageDataError, pageData } = await import("./page-data");

let log: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  log = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  log.mockRestore();
});

describe("pageData", () => {
  it("devuelve los datos cuando la carga funciona", async () => {
    await expect(pageData("portal.home", async () => [1, 2])).resolves.toEqual([1, 2]);
    expect(log).not.toHaveBeenCalled();
  });

  it("deja pasar redirect y notFound de Next", async () => {
    const signal = new NavigationSignal("NEXT_REDIRECT");
    await expect(
      pageData("portal.home", async () => {
        throw signal;
      }),
    ).rejects.toBe(signal);
    expect(log).not.toHaveBeenCalled();
  });

  it("cambia cualquier otro fallo por un error sin detalles y un evento estructurado", async () => {
    const userId = "01J8Z3K4M5N6P7Q8R9S0T1V2W3";
    const failure = await pageData("portal.documents", async () => {
      throw new Error(
        `Failed query: select * from "documents" where owner = $1\nparams: ${userId}`,
      );
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PageDataError);
    expect(failure).toMatchObject({ message: "internal_error" });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      level: "error",
      event: "page.unhandled_error",
      route: "portal.documents",
      kind: "Error",
    });
    const raw = JSON.stringify(log.mock.calls);
    expect(raw).not.toContain(userId);
    expect(raw).not.toContain("Failed query");
  });
});
