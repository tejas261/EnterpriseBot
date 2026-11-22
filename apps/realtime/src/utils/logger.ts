type Level = "debug" | "info" | "warn" | "error";

/** Structured JSON logs. Never pass secrets, tokens or cookies in `fields`. */
export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    service: "realtime",
    level,
    event,
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
