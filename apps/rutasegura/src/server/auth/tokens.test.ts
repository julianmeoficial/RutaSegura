import { SignJWT, UnsecuredJWT } from "jose";
import { describe, expect, it } from "vitest";
import {
  ACCESS_TOKEN_AUDIENCE,
  createRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from "./tokens";

const config = {
  secret: "test_only_secret_value_with_32_chars_min",
  issuer: "http://localhost:3000",
  ttlSeconds: 900,
};

const claims = {
  userId: "7f1c2a4e-3b5d-4c6e-8f90-a1b2c3d4e5f6",
  role: "customer" as const,
  sessionId: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
};

describe("access token", () => {
  it("emite un JWT HS256 que se valida y conserva los claims", async () => {
    const token = await signAccessToken(claims, config);
    expect(JSON.parse(atob(token.split(".")[0]!)).alg).toBe("HS256");
    expect(await verifyAccessToken(token, config)).toEqual(claims);
  });

  it("rechaza un token vencido", async () => {
    const token = await new SignJWT({ role: "customer", sid: claims.sessionId })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(claims.userId)
      .setIssuer(config.issuer)
      .setAudience(ACCESS_TOKEN_AUDIENCE)
      .setJti("jti")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(config.secret));
    expect(await verifyAccessToken(token, config)).toBeNull();
  });

  it("rechaza tokens sin firma (alg none)", async () => {
    const token = new UnsecuredJWT({ role: "admin", sid: claims.sessionId })
      .setSubject(claims.userId)
      .setIssuer(config.issuer)
      .setAudience(ACCESS_TOKEN_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime("15m")
      .encode();
    expect(await verifyAccessToken(token, config)).toBeNull();
  });

  it("rechaza otra audiencia, otro emisor y otra clave", async () => {
    const token = await signAccessToken(claims, config);
    expect(
      await verifyAccessToken(token, { ...config, issuer: "https://otro.example" }),
    ).toBeNull();
    expect(
      await verifyAccessToken(token, {
        ...config,
        secret: "otra_clave_de_prueba_con_32_caracteres",
      }),
    ).toBeNull();

    const foreign = await new SignJWT({ role: "customer", sid: claims.sessionId })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(claims.userId)
      .setIssuer(config.issuer)
      .setAudience("otra-api")
      .setJti("jti")
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode(config.secret));
    expect(await verifyAccessToken(foreign, config)).toBeNull();
  });

  it("rechaza un token alterado para escalar el rol", async () => {
    const [header, payload, signature] = (await signAccessToken(claims, config)).split(".");
    const tampered = JSON.parse(Buffer.from(payload!, "base64url").toString());
    tampered.role = "admin";
    const forged = [
      header,
      Buffer.from(JSON.stringify(tampered)).toString("base64url"),
      signature,
    ].join(".");
    expect(await verifyAccessToken(forged, config)).toBeNull();
  });
});

describe("refresh token", () => {
  it("genera 256 bits aleatorios distintos en cada llamada", () => {
    const token = createRefreshToken();
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(createRefreshToken()).not.toBe(token);
  });
});
