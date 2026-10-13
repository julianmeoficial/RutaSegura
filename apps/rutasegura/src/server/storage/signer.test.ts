import { describe, expect, it } from "vitest";
import { contentDisposition, presignDownload, type StorageConfig } from "./signer";

const config: StorageConfig = {
  endpoint: "http://localhost:9000",
  region: "us-east-1",
  bucket: "rutasegura-private",
  accessKeyId: "rutasegura-app",
  secretAccessKey: "unit_test_secret_value",
  ttlSeconds: 60,
};

const object = {
  objectKey: "documents/k7q2m9x4v1c8b3n6",
  fileName: "Guía de transporte.pdf",
  mimeType: "application/pdf",
};

describe("presignDownload", () => {
  it("firma con SigV4 y una vigencia de 60 s", async () => {
    const now = new Date("2026-10-13T20:00:00Z");
    const signed = await presignDownload(config, object, now);
    const url = new URL(signed.url);

    expect(url.origin).toBe("http://localhost:9000");
    expect(url.pathname).toBe("/rutasegura-private/documents/k7q2m9x4v1c8b3n6");
    expect(url.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("60");
    expect(url.searchParams.get("X-Amz-Date")).toBe("20261013T200000Z");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
    expect(signed.expiresIn).toBe(60);
    expect(signed.expiresAt).toBe("2026-10-13T20:01:00.000Z");
  });

  it("fuerza descarga, tipo declarado y sin caché", async () => {
    const url = new URL((await presignDownload(config, object)).url);
    expect(url.searchParams.get("response-content-disposition")).toMatch(/^attachment;/);
    expect(url.searchParams.get("response-content-type")).toBe("application/pdf");
    expect(url.searchParams.get("response-cache-control")).toBe("no-store");
  });

  it("nunca incluye el secreto en la URL", async () => {
    const { url } = await presignDownload(config, object);
    expect(url).not.toContain(config.secretAccessKey);
  });

  it("respeta una vigencia configurada distinta", async () => {
    const url = new URL((await presignDownload({ ...config, ttlSeconds: 5 }, object)).url);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("5");
  });
});

describe("contentDisposition", () => {
  it("neutraliza comillas, barras y punto y coma del nombre", () => {
    const header = contentDisposition('a"b\\c/d;e.pdf');
    expect(header).toContain('filename="a_b_c_d_e.pdf"');
  });

  it("conserva el nombre UTF-8 codificado", () => {
    expect(contentDisposition("Guía.pdf")).toContain("filename*=UTF-8''Gu%C3%ADa.pdf");
    expect(contentDisposition("Guía.pdf")).toContain('filename="Guia.pdf"');
  });
});
