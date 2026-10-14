import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => createElement("a", { href, className }, children),
}));

const { ErrorView } = await import("./error-view");
const { PAGE_ERROR } = await import("@/lib/error-messages");

describe("ErrorView", () => {
  it("muestra un mensaje genérico, el código de referencia y las salidas", () => {
    const html = renderToStaticMarkup(
      createElement(ErrorView, { digest: "1234567890", onRetry: () => {} }),
    );
    expect(html).toContain(PAGE_ERROR.title);
    expect(html).toContain(PAGE_ERROR.body);
    expect(html).toContain("1234567890");
    expect(html).toContain("Reintentar");
    expect(html).toContain('href="/"');
    expect(html).toContain('role="alert"');
  });

  it("no expone el mensaje ni la traza del error real", () => {
    const error = Object.assign(new Error("connect ECONNREFUSED postgres:5432 password=x"), {
      digest: "abc",
    });
    const html = renderToStaticMarkup(
      createElement(ErrorView, { digest: error.digest, onRetry: () => {} }),
    );
    expect(html).not.toContain("ECONNREFUSED");
    expect(html).not.toContain("password");
    expect(html).not.toMatch(/\bat \S+ \(/);
  });

  it("sin digest no muestra la línea de referencia; en el portal vuelve a Mis envíos", () => {
    const html = renderToStaticMarkup(
      createElement(ErrorView, {
        onRetry: () => {},
        homeHref: "/portal",
        homeLabel: "Ir a Mis envíos",
      }),
    );
    expect(html).not.toContain(PAGE_ERROR.reference);
    expect(html).toContain('href="/portal"');
  });
});
