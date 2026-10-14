import { XSS_NAME, expect, registerAndLogin, test } from "./fixtures";

const UNKNOWN_ID = "01J8Z3K4M5N6P7Q8R9S0T1V2W3";

test("sin sesión, el portal redirige al login y conserva el destino", async ({ page }) => {
  await page.goto("/portal/documentos");
  await expect(page).toHaveURL(/\/ingresar\?next=%2Fportal%2Fdocumentos/);
  await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
});

test("rastreo público con guía y segundo dato", async ({ page, shipment }) => {
  await page.goto("/rastreo");
  await page.getByLabel("Número de guía").fill(shipment.trackingNumber);
  await page.getByLabel(/Últimos 4 dígitos/).fill(shipment.phoneLast4);
  await page.getByRole("button", { name: "Consultar estado" }).click();
  await expect(page.getByRole("list", { name: "Recorrido del envío" })).toBeVisible();
  await expect(page.getByText(shipment.trackingNumber).first()).toBeVisible();
});

test("flujo completo: registro, login, reclamo, agenda y descarga firmada", async ({
  page,
  shipment,
}, testInfo) => {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  await page.clock.install();

  const email = `e2e.${testInfo.project.name}.${Date.now().toString(36)}@flows.test`;
  await registerAndLogin(page, email, "caballo-bateria-grapa-e2e");

  // El nombre con carga XSS se pinta como texto escapado y no ejecuta nada.
  await expect(page.getByText(XSS_NAME)).toBeVisible();
  expect(await page.locator("img[src='x']").count()).toBe(0);
  expect(await page.evaluate(() => "__xss" in window)).toBe(false);

  // Mis envíos: vincular la guía con el doble dato.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tus envíos, y solo los tuyos");
  await page.getByLabel("Número de guía").fill(shipment.trackingNumber);
  await page.getByLabel("Últimos 4 dígitos del teléfono").fill(shipment.phoneLast4);
  await page.getByRole("button", { name: "Vincular guía" }).click();
  await expect(page.getByText(`La guía ${shipment.trackingNumber} quedó vinculada`)).toBeVisible();
  const row = page.getByRole("listitem").filter({ hasText: shipment.trackingNumber });
  await expect(row.getByText("Por agendar")).toBeVisible();

  // Agenda: el selector aparece tras verificar la propiedad.
  await row.getByRole("link", { name: "Agendar" }).click();
  await expect(page).toHaveURL(/\/portal\/envios\/[0-9A-Z]{26}\/agenda$/);
  await expect(page.getByText("Propiedad verificada")).toBeVisible();
  await page
    .getByRole("group", { name: /Día de entrega/ })
    .getByRole("radio")
    .nth(1)
    .check();
  await page.getByRole("radio", { name: /10:00 – 12:00/ }).check();
  await page.getByRole("button", { name: "Confirmar franja" }).click();
  await expect(page.getByText(/^Franja confirmada:/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Actividad reciente" })).toContainText(
    "Franja seleccionada",
  );
  const shipmentPath = new URL(page.url()).pathname.replace(/\/agenda$/, "");

  // Documentos: la URL firmada se crea al pulsar y descarga el PDF como adjunto.
  await page
    .getByRole("navigation", { name: "Mi cuenta" })
    .getByRole("link", { name: "Documentos" })
    .click();
  await expect(page).toHaveURL(/\/portal\/documentos$/);
  const doc = page.getByRole("listitem").filter({ hasText: "Guía de transporte.pdf" });
  const downloading = page.waitForEvent("download");
  await doc.getByRole("button", { name: "Descargar" }).click();
  const download = await downloading;
  // WebKit entrega el nombre en NFD; el contenido es el mismo.
  expect(download.suggestedFilename().normalize("NFC")).toBe("Guía de transporte.pdf");
  expect(new URL(download.url()).searchParams.get("X-Amz-Expires")).toBe("60");
  await expect(doc.getByText(/Enlace vigente · 00:[0-5]\d/)).toBeVisible();

  // Al vencer los 60 s la interfaz ofrece generar un enlace nuevo.
  await page.clock.fastForward("01:05");
  await expect(doc.getByText("Enlace expirado")).toBeVisible();
  await expect(doc.getByRole("button", { name: "Generar enlace" })).toBeEnabled();

  // El detalle del envío registra la emisión en la bitácora.
  await page.goto(shipmentPath);
  await expect(page.getByRole("list", { name: "Actividad reciente" })).toContainText(
    "Enlace de descarga generado",
  );

  // Sin errores de consola, CSP ni hidratación en el recorrido. Lo que sigue
  // provoca un 404 a propósito.
  expect(problems).toEqual([]);

  // Un envío ajeno o inexistente: la misma página 404, sin pistas.
  const missing = await page.goto(`/portal/envios/${UNKNOWN_ID}`);
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "No encontramos lo que buscas" })).toBeVisible();

  // Cerrar sesión revoca el acceso al portal.
  await page.goto("/portal/seguridad");
  await page
    .getByRole("region", { name: "Sesión actual" })
    .getByRole("button", { name: "Cerrar sesión" })
    .click();
  await expect(page).toHaveURL(/\/ingresar$/);
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/ingresar\?next=/);
});
