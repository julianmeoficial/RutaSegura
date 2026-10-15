import { expect, test } from "@playwright/test";

const HEADING = "Rastrea tu envío";

test("la página pinta y la CSP estricta no bloquea recursos propios", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));

  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { level: 1, name: "¿Dónde va tu paquete?" }),
  ).toBeVisible();
  await expect(page.getByLabel("Número de guía")).toBeVisible();
  // Las fuentes propias cargan bajo la CSP y la marca enlaza al inicio.
  await expect(page.getByRole("link", { name: "RutaSegura, inicio" })).toBeVisible();

  const headers = response!.headers();
  const policy = headers["content-security-policy"] ?? "";
  expect(policy).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  expect(policy).not.toContain("unsafe-inline");
  expect(policy).not.toContain("unsafe-eval");
  expect(headers["x-powered-by"]).toBeUndefined();
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
  expect(headers["cross-origin-embedder-policy"]).toBe("require-corp");

  // Todo script del documento servido lleva el nonce de la petición. Los chunks que
  // Next inserta después al precargar rutas los autoriza 'strict-dynamic'.
  const html = await response!.text();
  const scripts = html.match(/<script\b[^>]*>/g) ?? [];
  expect(scripts.length).toBeGreaterThan(0);
  expect(scripts.filter((tag) => !/\snonce="[^"]+"/.test(tag))).toEqual([]);

  await page.waitForLoadState("networkidle");
  expect(problems).toEqual([]);
});

test.describe("sin JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("el contenido llega renderizado desde el servidor", async ({ page }) => {
    await page.goto("/rastreo");
    await expect(page.getByRole("heading", { level: 1, name: HEADING })).toBeVisible();
    await expect(page.getByLabel("Número de guía")).toBeVisible();
  });
});

test("el portal sin sesión redirige al login sin tocar la base de datos", async ({ page }) => {
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/ingresar\?next=%2Fportal$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("una ruta de API inexistente responde con el 404 JSON genérico", async ({ request }) => {
  const response = await request.get("/api/v1/no-existe");
  expect(response.status()).toBe(404);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({
    error: { code: "not_found", message: "El recurso solicitado no existe." },
  });
});
