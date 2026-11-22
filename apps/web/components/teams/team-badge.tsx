import { TEAM_LOGOS, type TeamShort } from "@ipl/shared";

const SIZES = {
  sm: "h-7 w-7 rounded-md",
  md: "h-10 w-10 rounded-lg",
  lg: "h-12 w-12 rounded-lg",
};

export function TeamBadge({
  short,
  size = "md",
  className = "",
  logoUrl,
}: {
  short: string;
  size?: keyof typeof SIZES;
  className?: string;
  logoUrl?: string | null;
}) {
  const src = logoUrl ?? TEAM_LOGOS[short as TeamShort];
  if (!src) return null;
  return (
    <span
      aria-hidden="true"
      title={short}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${SIZES[size]} ${className}`}
    >
      {/* Team logos are remote SVGs; a plain img avoids next/image remote-domain config. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`${short} logo`} className="h-full w-full object-contain" />
    </span>
  );
}
