export const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:4000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000";

export function notificationsStreamUrl(): string {
  return `${REALTIME_URL}/api/realtime/notifications`;
}

export function matchSocketUrl(): string {
  return `${WS_URL}/ws/match`;
}
