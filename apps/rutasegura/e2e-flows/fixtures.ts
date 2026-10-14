import { test as base, expect, type Page } from "@playwright/test";

type SeedShipment = { trackingNumber: string; phoneLast4: string };

export type FlowOptions = {
  /** Guía de la semilla reservada para el motor en el flujo del portal. */
  shipment: SeedShipment;
  /** Guía de la semilla reservada para el motor en el smoke de flujos críticos. */
  criticalShipment: SeedShipment;
  /** IP propia del motor para agotar el rate limit del rastreo sin afectar a los demás. */
  rateLimitIp: string;
};

export const test = base.extend<FlowOptions>({
  shipment: [{ trackingNumber: "RS0000000004", phoneLast4: "1111" }, { option: true }],
  criticalShipment: [{ trackingNumber: "RS0000000006", phoneLast4: "3333" }, { option: true }],
  rateLimitIp: ["198.51.100.51", { option: true }],
});

export { expect };

/** Nombre con carga XSS: la UI debe mostrarlo como texto, sin ejecutarlo. */
export const XSS_NAME = `Cliente <img src=x onerror="window.__xss=1">`;

/** Registra la cuenta y entra al portal, ambos pasos por la UI. */
export async function registerAndLogin(page: Page, email: string, password: string) {
  await page.goto("/registro");
  await page.getByLabel("Nombre completo").fill(XSS_NAME);
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("Recibimos tu registro")).toBeVisible();

  await page.goto("/ingresar");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/portal$/);
}
