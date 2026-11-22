/** Cricket overs helpers. "12.5" means 12 completed overs and 5 legal balls. */

export function ballsToOvers(balls: number): string {
  if (!Number.isInteger(balls) || balls < 0) throw new Error("Invalid ball count");
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

/** Returns the number of legal balls, or NaN when the notation is invalid. */
export function oversToBalls(overs: string): number {
  const match = /^(\d{1,2})\.([0-5])$/.exec(overs);
  if (!match) return Number.NaN;
  return Number(match[1]) * 6 + Number(match[2]);
}

export function isValidOvers(overs: string): boolean {
  return !Number.isNaN(oversToBalls(overs));
}

export function formatRunRate(runs: number, balls: number): string {
  if (balls <= 0) return "0.00";
  return (runs / (balls / 6)).toFixed(2);
}
