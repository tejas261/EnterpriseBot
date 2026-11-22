import { TEAM_LOGOS, TEAM_SHORTS } from "@ipl/shared";

export function AuthPanel() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-panel p-12 text-white lg:flex xl:p-16">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold">
          IL
        </span>
        <span className="text-sm font-semibold tracking-wide">IPL Live</span>
        <span className="ml-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-white/50">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-live" />
          Live
        </span>
      </div>

      <div className="max-w-lg">
        <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight xl:text-6xl">
          Your team changes.
          <br />
          <span className="text-white/55">You know first.</span>
        </h1>
        <p className="mt-6 max-w-md text-[15px] leading-7 text-white/60">
          Follow the franchises you care about and get a notification the moment a captain, coach,
          squad stat or home ground changes — pushed from the database, not a refresh.
        </p>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
          Ten franchises · one feed
        </p>
        <div className="flex flex-row items-center justify-between gap-3">
          {TEAM_SHORTS.map((short) => (
            <span key={short} className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={TEAM_LOGOS[short]} alt={`${short} logo`} className="h-8 w-8 object-contain" />
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function MobileBrand() {
  return (
    <div className="mb-8 flex items-center gap-2.5 lg:hidden">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        IL
      </span>
      <span className="text-sm font-semibold tracking-wide">IPL Live</span>
      <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-live" />
        Live
      </span>
    </div>
  );
}
