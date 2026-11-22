# IPL 2026 seed data

Files:
- `teams.json`: one document per IPL franchise. Contains all required assignment fields, franchise logo URLs, 2026 league-stage results, and cumulative titles.
- `squads.json`: flat player roster records with `teamShort`, `teamName`, and `playerName`.
- `metadata.json`: season, data caveats, and source URLs.

## Important data semantics
- `wins`, `losses`, `points`, `matchesPlayed`, `noResults`, and `netRunRate` describe the **2026 league stage**.
- `titles` and `titleYears` are cumulative through the 2026 season.
- Captains and head coaches are 2026 season leadership data.
- Squads are a 2026 season snapshot, not a guarantee of each player's current contract or availability after the season.
- The 2026 squads list is a roster seed, not a player-statistics database.
- The source assignment does not require squads; they are an optional UI enhancement.

## MongoDB seed guidance
Upsert teams by `short` and players by `{ teamShort, playerName }` to make seeding repeatable. Do not overwrite team edits every time the app starts. Run seed scripts explicitly.
