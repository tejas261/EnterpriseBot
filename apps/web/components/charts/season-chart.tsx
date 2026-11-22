"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TeamRecord } from "@ipl/shared";

export default function SeasonChart({ teams }: { teams: TeamRecord[] }) {
  const data = [...teams]
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
    .map((team) => ({
      short: team.short,
      name: team.name,
      wins: team.wins,
      losses: team.losses,
      points: team.points,
    }));

  return (
    <div>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 0, left: -12 }}
            accessibilityLayer
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="short"
              width={48}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                fontSize: 12,
              }}
              labelFormatter={(_label, payload) => {
                const entry = payload?.[0]?.payload as { name?: string; points?: number } | undefined;
                return entry ? `${entry.name} · ${entry.points} pts` : "";
              }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="wins" name="Wins" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} barSize={6} />
            <Bar
              dataKey="losses"
              name="Losses"
              fill="hsl(var(--muted-foreground) / 0.35)"
              radius={[0, 3, 3, 0]}
              barSize={6}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Season record by team</caption>
        <thead>
          <tr>
            <th scope="col">Team</th>
            <th scope="col">Wins</th>
            <th scope="col">Losses</th>
            <th scope="col">Points</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry.short}>
              <th scope="row">{entry.name}</th>
              <td>{entry.wins}</td>
              <td>{entry.losses}</td>
              <td>{entry.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
