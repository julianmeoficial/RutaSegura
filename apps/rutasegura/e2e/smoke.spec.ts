import { expect, test } from "@playwright/test";

test("la página pinta y la CSP estricta no bloquea recursos propios", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));

  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "RutaSegura" })).toBeVisible();

  const headers = response!.headers();
  const policy = headers["content-security-policy"] ?? "";
  expect(policy).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  expect(policy).not.toContain("unsafe-inline");
  expect(policy).not.toContain("unsafe-eval");
  expect(headers["x-powered-by"]).toBeUndefined();
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
  expect(headers["cross-origin-embedder-policy"]).toBe("require-corp");

  // Todo script del documento lleva el nonce de la petición.
  const scriptsWithoutNonce = await page.locator("script:not([nonce])").count();
  expect(scriptsWithoutNonce).toBe(0);

  await page.waitForLoadState("networkidle");
  expect(problems).toEqual([]);
});

test.describe("sin JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("el contenido llega renderizado desde el servidor", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "RutaSegura" })).toBeVisible();
  });
});

test("una ruta de API inexistente responde con el 404 JSON genérico", async ({ request }) => {
  const response = await request.get("/api/v1/no-existe");
  expect(response.status()).toBe(404);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({
    error: { code: "not_found", message: "El recurso solicitado no existe." },
  });
});
