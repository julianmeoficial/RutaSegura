import "server-only";

type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const configured = process.env.LOG_LEVEL as Level | undefined;
  return LEVELS[configured ?? "info"] ?? LEVELS.info;
}

export const REDACTED = "[redacted]";

const SENSITIVE_KEY =
  /pass(word)?|token|cookie|authori[sz]ation|secret|e-?mail|phone|tel[eé]fono|tracking|gu[ií]a|^name$|nombre|recipient|address|direcci[oó]n|^ip$/i;

/** Segunda barrera: aunque un llamador pase un campo sensible, no llega al log. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1),
    ]),
  );
}

/**
 * Logger estructurado en JSON. Los campos deben ser metadatos
 * (evento, dependencia, código): nunca secretos, tokens ni datos personales.
 */
function write(level: Level, event: string, fields: Record<string, unknown> = {}) {
  if (LEVELS[level] < threshold()) return;
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    event,
    ...(redact(fields) as Record<string, unknown>),
  });
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (event: string, fields?: Record<string, unknown>) => write("debug", event, fields),
  info: (event: string, fields?: Record<string, unknown>) => write("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => write("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => write("error", event, fields),
};

/** Reduce un error a su nombre: el mensaje puede contener cadenas de conexión. */
export function errorKind(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? `${error.name}:${code}` : error.name;
  }
  return "UnknownError";
}
