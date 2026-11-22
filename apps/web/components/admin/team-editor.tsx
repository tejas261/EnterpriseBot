"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { TeamRecord } from "@ipl/shared";
import { ApiClientError, api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TeamBadge } from "@/components/teams/team-badge";

type EditableFields = Pick<
  TeamRecord,
  "name" | "captain" | "headCoach" | "homeGround" | "titles" | "wins" | "losses" | "points"
>;

const TEXT_FIELDS: Array<{ key: keyof EditableFields; label: string }> = [
  { key: "name", label: "Team name" },
  { key: "captain", label: "Captain" },
  { key: "headCoach", label: "Head coach" },
  { key: "homeGround", label: "Home ground" },
];

const NUMBER_FIELDS: Array<{ key: keyof EditableFields; label: string }> = [
  { key: "titles", label: "Titles" },
  { key: "wins", label: "Wins" },
  { key: "losses", label: "Losses" },
  { key: "points", label: "Points" },
];

function TeamForm({ team }: { team: TeamRecord }) {
  const [values, setValues] = useState<EditableFields>({
    name: team.name,
    captain: team.captain,
    headCoach: team.headCoach,
    homeGround: team.homeGround,
    titles: team.titles,
    wins: team.wins,
    losses: team.losses,
    points: team.points,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { team: updated } = await api.patch<{ team: TeamRecord }>(
        `/api/admin/teams/${team.short}`,
        values,
      );
      setValues({
        name: updated.name,
        captain: updated.captain,
        headCoach: updated.headCoach,
        homeGround: updated.homeGround,
        titles: updated.titles,
        wins: updated.wins,
        losses: updated.losses,
        points: updated.points,
      });
      toast.success(`${updated.short} updated. Subscribers will be notified by the Change Stream.`);
    } catch (cause) {
      toast.error(cause instanceof ApiClientError ? cause.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-3">
        <TeamBadge short={team.short} size="lg" logoUrl={team.logoUrl} />
        <div>
          <p className="text-sm font-semibold">{team.name}</p>
          <p className="text-xs text-muted-foreground">
            {team.short} · IPL {team.season}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TEXT_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={`field-${field.key}`}>{field.label}</Label>
            <Input
              id={`field-${field.key}`}
              value={String(values[field.key])}
              maxLength={120}
              onChange={(event) =>
                setValues((current) => ({ ...current, [field.key]: event.target.value }))
              }
              required
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {NUMBER_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={`field-${field.key}`}>{field.label}</Label>
            <Input
              id={`field-${field.key}`}
              type="number"
              min={0}
              max={field.key === "points" ? 200 : 100}
              value={values[field.key]}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [field.key]: Number(event.target.value),
                }))
              }
              required
            />
          </div>
        ))}
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save changes
      </Button>
    </form>
  );
}

export function TeamEditor({ teams }: { teams: TeamRecord[] }) {
  const [selected, setSelected] = useState(teams[0]?.short ?? "");
  const team = teams.find((candidate) => candidate.short === selected);

  if (!team) return <p className="text-sm text-muted-foreground">Seed the teams before editing.</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Update a team</CardTitle>
        <CardDescription className="text-xs">
          Writes go straight to MongoDB. Notifications are generated once, by the Change Stream
          pipeline — never by this API.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="team-select">Team</Label>
          <select
            id="team-select"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {[...teams]
              .sort((a, b) => a.short.localeCompare(b.short))
              .map((option) => (
                <option key={option.short} value={option.short}>
                  {option.short} — {option.name}
                </option>
              ))}
          </select>
        </div>
        <TeamForm key={team.short} team={team} />
      </CardContent>
    </Card>
  );
}
