import { connectionOptions } from "@rutasegura/database";
import { describe, expect, it } from "vitest";

describe("connectionOptions", () => {
  it("sin pooler usa sentencias preparadas y un pool normal", () => {
    expect(connectionOptions("postgresql://rutasegura:secreto@localhost:5432/rutasegura")).toEqual({
      max: 10,
      prepare: true,
    });
  });

  it("el pooler de Supabase en modo sesión conserva las sentencias preparadas", () => {
    expect(
      connectionOptions(
        "postgresql://postgres.ref:secreto@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
      ),
    ).toEqual({ max: 10, prepare: true });
  });

  it("el pooler en modo transacción desactiva las sentencias preparadas y abre pocas conexiones", () => {
    expect(
      connectionOptions(
        "postgresql://postgres.ref:secreto@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
      ),
    ).toEqual({ max: 3, prepare: false });
  });
});
