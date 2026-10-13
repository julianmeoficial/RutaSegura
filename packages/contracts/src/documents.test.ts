import { describe, expect, it } from "vitest";
import { documentSummarySchema, downloadUrlResponseSchema } from "./documents";

const summary = {
  id: "01J8Z3K4M5N6P7Q8R9S0T1V2W3",
  shipmentId: "01J8Z3K4M5N6P7Q8R9S0T1V2W4",
  fileName: "Guía de transporte.pdf",
  mimeType: "application/pdf",
  sizeBytes: 679,
  createdAt: "2026-10-13T20:00:00.000Z",
};

describe("documentSummarySchema", () => {
  it("acepta PDF, JPEG y PNG y rechaza otros tipos", () => {
    expect(documentSummarySchema.safeParse(summary).success).toBe(true);
    expect(documentSummarySchema.safeParse({ ...summary, mimeType: "image/png" }).success).toBe(
      true,
    );
    expect(documentSummarySchema.safeParse({ ...summary, mimeType: "text/html" }).success).toBe(
      false,
    );
  });
});

describe("downloadUrlResponseSchema", () => {
  const base = {
    url: "http://localhost:9000/rutasegura-private/documents/x?X-Amz-Expires=60",
    expiresAt: "2026-10-13T20:01:00.000Z",
    expiresIn: 60,
  };

  it("acepta URL http(s) con vigencia de hasta 300 s", () => {
    expect(downloadUrlResponseSchema.safeParse(base).success).toBe(true);
    expect(downloadUrlResponseSchema.safeParse({ ...base, expiresIn: 3600 }).success).toBe(false);
  });

  it("rechaza esquemas que no sean http(s)", () => {
    expect(
      downloadUrlResponseSchema.safeParse({ ...base, url: "javascript:alert(1)" }).success,
    ).toBe(false);
  });
});
