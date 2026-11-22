"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TeamRecord } from "@ipl/shared";

export default function TitlesChart({
  teams,
  followed,
}: {
  teams: TeamRecord[];
  followed: string[];
}) {
  const data = [...teams].sort((a, b) => b.titles - a.titles).map((team) => ({
    short: team.short,
    titles: team.titles,
    name: team.name,
  }));
  const followedSet = new Set(followed);

  return (
    <div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -18 }} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="short" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                fontSize: 12,
              }}
              formatter={(value) => [String(value ?? ""), "Titles"]}
              labelFormatter={(_label, payload) => {
                const entry = payload?.[0]?.payload as { name?: string } | undefined;
                return entry?.name ?? "";
              }}
            />
            <Bar dataKey="titles" radius={[4, 4, 0, 0]} maxBarSize={34}>
              {data.map((entry) => (
                <Cell
                  key={entry.short}
                  fill={
                    followedSet.has(entry.short)
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted-foreground) / 0.35)"
                  }
                />
              ))}
              <LabelList dataKey="titles" position="top" fontSize={10} fill="hsl(var(--muted-foreground))" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>IPL titles by team</caption>
        <thead>
          <tr>
            <th scope="col">Team</th>
            <th scope="col">Titles</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry.short}>
              <th scope="row">{entry.name}</th>
              <td>{entry.titles}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-primary" /> Followed
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-muted-foreground/35" /> Other teams
        </span>
      </p>
    </div>
  );
}
