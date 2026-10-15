import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { Page, Response } from "@playwright/test";
import { expect, registerAndLogin, test } from "./fixtures";

/**
 * Smoke de UI de los flujos críticos contra la imagen de producción
 * (`scripts/e2e-flows.sh`). Cubre lo que el flujo del portal no recorre:
 * renovación de la sesión, reprogramar y cancelar, errores visibles al usuario
 * y que los controles de seguridad sigan activos tras la integración.
 */
const REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

/** Cabeceras de seguridad de un documento HTML servido por la imagen de producción. */
function expectSecureDocument(response: Response | null) {
  expect(response, "la navegación no devolvió respuesta").not.toBeNull();
  const headers = response!.headers();
  const csp = headers["content-security-policy"] ?? "";
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(csp).toMatch(/style-src 'self' 'nonce-[^']+'/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toContain("unsafe-");
  expect(headers["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains; preload");
  expect(headers["x-content-type-options"]).toBe("nosniff");
}

/**
 * Violaciones de CSP, errores de JavaScript y de hidratación. Los "Failed to
 * load resource" de un 401 o 429 provocados a propósito no cuentan, ni las
 * precargas canceladas por la navegación.
 */
function watchProblems(page: Page): string[] {
  const problems: string[] = [];
  const record = (text: string) => {
    if (/Failed to load resource/i.test(text)) return;
    // WebKit reporta así las precargas RSC que Next aborta al cambiar de página.
    if (/\?_rsc=\S+ due to access control checks\./.test(text)) return;
    problems.push(text);
  };
  page.on("pageerror", (error) => record(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") record(message.text());
  });
  return problems;
}

test("sesión renovada, agenda completa y controles activos en cada página", async ({
  page,
  context,
  criticalShipment,
}, testInfo) => {
  const problems = watchProblems(page);

  for (const path of ["/", "/rastreo", "/ingresar", "/registro", "/ayuda"]) {
    expectSecureDocument(await page.goto(path));
  }

  const email = `critico.${testInfo.project.name}.${Date.now().toString(36)}@flows.test`;
  await registerAndLogin(page, email, "caballo-bateria-grapa-crit");

  // Vincular la guía reservada para este motor.
  await page.getByLabel("Número de guía").fill(criticalShipment.trackingNumber);
  await page.getByLabel("Últimos 4 dígitos del teléfono").fill(criticalShipment.phoneLast4);
  await page.getByRole("button", { name: "Vincular guía" }).click();
  await expect(
    page.getByText(`La guía ${criticalShipment.trackingNumber} quedó vinculada`),
  ).toBeVisible();
  // El refresco de la lista tiene que terminar antes de navegar: si WebKit lo aborta,
  // Next recarga la página y esa navegación interrumpe la siguiente.
  await expect(
    page
      .getByRole("list", { name: "Tus envíos" })
      .getByRole("heading", { name: criticalShipment.trackingNumber }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");

  for (const path of ["/portal", "/portal/agenda", "/portal/documentos", "/portal/seguridad"]) {
    const response = await page.goto(path);
    expect(new URL(page.url()).pathname).toBe(path);
    expectSecureDocument(response);
  }

  // Agenda: confirmar, reprogramar y cancelar desde la UI.
  await page.goto("/portal");
  const row = page.getByRole("listitem").filter({ hasText: criticalShipment.trackingNumber });
  await row.getByRole("link", { name: "Agendar" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("¿Cuándo quieres recibirlo?");
  const days = page.getByRole("group", { name: /Día de entrega/ }).getByRole("radio");

  await days.nth(1).check();
  await page.getByRole("radio", { name: /10:00 – 12:00/ }).check();
  await page.getByRole("button", { name: "Confirmar franja" }).click();
  await expect(page.getByText(/^Franja confirmada:/)).toBeVisible();

  await expect(page.getByRole("button", { name: "Reprogramar franja" })).toBeVisible();
  await days.nth(3).check();
  await page.getByRole("radio", { name: /14:00 – 16:00/ }).check();
  await page.getByRole("button", { name: "Reprogramar franja" }).click();
  await expect(page.getByText(/^Franja confirmada:.*14:00 – 16:00/)).toBeVisible();

  await page.getByRole("button", { name: "Cancelar franja" }).click();
  await expect(page.getByText("Cancelaste la franja de entrega.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar franja" })).toBeVisible();
  const activity = page.getByRole("list", { name: "Actividad reciente" });
  for (const label of ["Franja seleccionada", "Franja reprogramada", "Franja cancelada"]) {
    await expect(activity).toContainText(label);
  }

  // La cookie de acceso venció en el navegador: una página del servidor pasa
  // por el login, renueva con el refresh y vuelve sola al destino.
  await context.clearCookies({ name: "rs_at" });
  await page.goto("/portal/documentos");
  await expect(page).toHaveURL(/\/portal\/documentos$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Y una acción del cliente (pedir la URL firmada) renueva sin interrumpir al usuario.
  await context.clearCookies({ name: "rs_at" });
  const doc = page.getByRole("listitem").filter({ hasText: criticalShipment.trackingNumber });
  const downloading = page.waitForEvent("download");
  await doc.getByRole("button", { name: "Descargar" }).click();
  const download = await downloading;
  expect(new URL(download.url()).searchParams.get("X-Amz-Expires")).toBe("60");
  await expect(page).toHaveURL(/\/portal\/documentos$/);
  expect((await context.cookies()).some((cookie) => cookie.name === "rs_at")).toBe(true);

  expect(problems).toEqual([]);
});

test("rastreo: errores de validación, respuesta uniforme y 429 con cuenta regresiva", async ({
  page,
  browserName,
  rateLimitIp,
}) => {
  // El límite también cuenta por guía: cada motor usa una guía inexistente distinta.
  const unknownGuide = browserName === "chromium" ? "RS9999999996" : "RS9999999997";
  const problems = watchProblems(page);
  await page.setExtraHTTPHeaders({ "x-forwarded-for": rateLimitIp });
  await page.goto("/rastreo");
  const guide = page.getByLabel("Número de guía");
  const digits = page.getByLabel(/Últimos 4 dígitos/);
  const submit = page.getByRole("button", { name: "Consultar estado" });

  // Validación en el cliente, antes de llamar a la API.
  await guide.fill("12345");
  await digits.fill("12");
  await submit.click();
  await expect(
    page.getByText("Escribe la guía con el formato RS seguido de 10 dígitos."),
  ).toBeVisible();
  await expect(page.getByText("Escribe exactamente 4 dígitos.")).toBeVisible();

  // Guía inexistente: mensaje genérico, sin confirmar si la guía existe.
  await guide.fill(unknownGuide);
  await digits.fill("0000");
  await submit.click();
  await expect(
    page.getByText("No pudimos verificar la información. Revisa los datos o intenta más tarde."),
  ).toBeVisible();

  // Ráfaga hasta el 429: aviso con cuenta regresiva y botón deshabilitado.
  const warning = page.getByText("Demasiados intentos.");
  for (let i = 0; i < 8 && !(await warning.isVisible()); i++) {
    await submit.click();
    await expect(submit).toHaveText("Consultar estado");
  }
  await expect(warning).toBeVisible();
  await expect(page.getByText(/Vuelve a intentar en \d{2}:\d{2}\./)).toBeVisible();
  await expect(submit).toBeDisabled();

  expect(problems).toEqual([]);
});

test("servicio caído: página de error genérica y recuperación", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "Detener PostgreSQL una vez basta para ambos motores.");
  test.setTimeout(120_000);

  const email = `caida.${testInfo.project.name}.${Date.now().toString(36)}@flows.test`;
  await registerAndLogin(page, email, "caballo-bateria-grapa-caida");

  const compose = (args: string) =>
    execSync(`docker compose ${args}`, { cwd: REPO_ROOT, stdio: "pipe" });
  const outageStart = new Date().toISOString();
  compose("stop postgres");
  try {
    await page.goto("/portal");
    await expect(page.getByRole("heading", { name: "Algo salió mal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(page.getByText(/Código de referencia/)).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|postgres|stack|at \S+ \(/i,
    );

    const api = await page.request.get("/api/v1/shipments");
    expect(api.status()).toBe(500);
    expect(await api.json()).toEqual({
      error: { code: "internal_error", message: "Ocurrió un error inesperado." },
    });
  } finally {
    compose("up -d --wait postgres");
  }

  // El servidor deja eventos estructurados, no la consulta con sus parámetros.
  const logs = compose(`logs --no-color --since ${outageStart} rutasegura`).toString();
  expect(logs).toContain('"event":"page.unhandled_error"');
  expect(logs).not.toMatch(/Failed query|params:|ENOTFOUND|ECONNREFUSED/);

  await expect(async () => {
    const health = await page.request.get("/api/v1/health");
    expect(health.status()).toBe(200);
  }).toPass({ timeout: 60_000 });

  await page.goto("/portal");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mis envíos");
});
