import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentRow } from "@/server/repositories/documents";
import type * as Signer from "@/server/storage/signer";

const tx = { tx: true };
const withRlsContext = vi.fn((_context: unknown, fn: (tx: unknown) => unknown) => fn(tx));
vi.mock("@/server/repositories/db", () => ({ withRlsContext }));

const documentsRepo = {
  findDocumentByPublicId: vi.fn(),
  listDocumentsByOwner: vi.fn(),
  listDocumentsByShipment: vi.fn(),
};
vi.mock("@/server/repositories/documents", () => documentsRepo);

const shipmentsRepo = { findShipmentByPublicId: vi.fn(), insertShipmentAudit: vi.fn() };
vi.mock("@/server/repositories/shipments", () => shipmentsRepo);

const storageConfig = vi.fn();
const presignDownload = vi.fn();
vi.mock("@/server/storage/signer", async () => {
  const actual = await vi.importActual<typeof Signer>("@/server/storage/signer");
  return { ...actual, storageConfig, presignDownload };
});

const { OwnershipError } = await import("@/server/authorization/ownership");
const { StorageUnavailableError } = await import("@/server/storage/signer");
const { issueDownloadUrl, listDocumentsForShipment, listDocumentsForUser } =
  await import("./documents");

const ALICE = "0b6f1c1e-8f7a-4c1b-9d7e-2b1f4f0a9c3d";
const BOB = "7d2a5e90-1c3b-4f6a-8e2d-9a0b1c2d3e4f";
const SHIPMENT_PUBLIC_ID = "01J8Z3K4M5N6P7Q8R9S0T1V2W3";
const DOCUMENT_PUBLIC_ID = "01J8Z3K4M5N6P7Q8R9S0T1V2W9";

function document(overrides: Partial<DocumentRow> = {}): DocumentRow {
  return {
    id: "document-1",
    publicId: DOCUMENT_PUBLIC_ID,
    shipmentId: "shipment-1",
    shipmentPublicId: SHIPMENT_PUBLIC_ID,
    ownerId: ALICE,
    objectKey: "documents/k7q2m9x4v1c8b3n6",
    fileName: "Guía de transporte.pdf",
    mimeType: "application/pdf",
    sizeBytes: 679,
    createdAt: new Date("2026-10-13T20:00:00Z"),
    ...overrides,
  };
}

const config = { endpoint: "http://localhost:9000", ttlSeconds: 60 };
const signed = {
  url: "http://localhost:9000/rutasegura-private/documents/k7q2m9x4v1c8b3n6?X-Amz-Expires=60",
  expiresAt: "2026-10-13T20:01:00.000Z",
  expiresIn: 60,
};

beforeEach(() => {
  vi.clearAllMocks();
  storageConfig.mockReturnValue(config);
  presignDownload.mockResolvedValue(signed);
});

describe("issueDownloadUrl", () => {
  it("firma la descarga del dueño y deja un evento en la bitácora", async () => {
    documentsRepo.findDocumentByPublicId.mockResolvedValue(document());

    await expect(issueDownloadUrl(DOCUMENT_PUBLIC_ID, ALICE)).resolves.toEqual(signed);

    expect(withRlsContext).toHaveBeenCalledWith({ userId: ALICE }, expect.any(Function));
    expect(presignDownload).toHaveBeenCalledWith(
      config,
      {
        objectKey: "documents/k7q2m9x4v1c8b3n6",
        fileName: "Guía de transporte.pdf",
        mimeType: "application/pdf",
      },
      expect.any(Date),
    );
    expect(shipmentsRepo.insertShipmentAudit).toHaveBeenCalledWith(tx, {
      shipmentId: "shipment-1",
      actorUserId: ALICE,
      type: "document_url_issued",
    });
  });

  it("documento ajeno: OwnershipError sin firmar ni auditar", async () => {
    documentsRepo.findDocumentByPublicId.mockResolvedValue(document());

    await expect(issueDownloadUrl(DOCUMENT_PUBLIC_ID, BOB)).rejects.toBeInstanceOf(OwnershipError);
    expect(presignDownload).not.toHaveBeenCalled();
    expect(shipmentsRepo.insertShipmentAudit).not.toHaveBeenCalled();
  });

  it("documento inexistente o de un envío sin dueño responde igual que uno ajeno", async () => {
    documentsRepo.findDocumentByPublicId.mockResolvedValue(undefined);
    await expect(issueDownloadUrl(DOCUMENT_PUBLIC_ID, ALICE)).rejects.toBeInstanceOf(
      OwnershipError,
    );

    documentsRepo.findDocumentByPublicId.mockResolvedValue(document({ ownerId: null }));
    await expect(issueDownloadUrl(DOCUMENT_PUBLIC_ID, ALICE)).rejects.toBeInstanceOf(
      OwnershipError,
    );
    expect(presignDownload).not.toHaveBeenCalled();
  });

  it("sin almacenamiento configurado no audita ni devuelve URL", async () => {
    documentsRepo.findDocumentByPublicId.mockResolvedValue(document());
    storageConfig.mockImplementation(() => {
      throw new StorageUnavailableError();
    });

    await expect(issueDownloadUrl(DOCUMENT_PUBLIC_ID, ALICE)).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    expect(shipmentsRepo.insertShipmentAudit).not.toHaveBeenCalled();
  });
});

describe("listDocumentsForShipment", () => {
  it("lista los documentos del envío propio sin clave de objeto", async () => {
    shipmentsRepo.findShipmentByPublicId.mockResolvedValue({ id: "shipment-1", ownerId: ALICE });
    documentsRepo.listDocumentsByShipment.mockResolvedValue([document()]);

    const result = await listDocumentsForShipment(SHIPMENT_PUBLIC_ID, ALICE);
    expect(result).toEqual([
      {
        id: DOCUMENT_PUBLIC_ID,
        shipmentId: SHIPMENT_PUBLIC_ID,
        fileName: "Guía de transporte.pdf",
        mimeType: "application/pdf",
        sizeBytes: 679,
        createdAt: "2026-10-13T20:00:00.000Z",
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("documents/");
  });

  it("envío ajeno: OwnershipError sin consultar documentos", async () => {
    shipmentsRepo.findShipmentByPublicId.mockResolvedValue({ id: "shipment-1", ownerId: ALICE });

    await expect(listDocumentsForShipment(SHIPMENT_PUBLIC_ID, BOB)).rejects.toBeInstanceOf(
      OwnershipError,
    );
    expect(documentsRepo.listDocumentsByShipment).not.toHaveBeenCalled();
  });
});

describe("listDocumentsForUser", () => {
  it("filtra por el usuario de la sesión", async () => {
    documentsRepo.listDocumentsByOwner.mockResolvedValue([document()]);

    await expect(listDocumentsForUser(ALICE)).resolves.toHaveLength(1);
    expect(documentsRepo.listDocumentsByOwner).toHaveBeenCalledWith(tx, ALICE);
    expect(withRlsContext).toHaveBeenCalledWith({ userId: ALICE }, expect.any(Function));
  });
});
