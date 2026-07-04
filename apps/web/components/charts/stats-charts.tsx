"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { JournalStats } from "@/lib/api";

const COLORS = ["#8B5CF6", "#6366F1", "#3B82F6", "#22C55E", "#F59E0B"];

export function StatusDonut({ stats }: { stats: JournalStats }) {
  const data = [
    { name: "Watching", value: stats.watching_shows },
    { name: "Completed", value: stats.completed_shows },
    { name: "Plan", value: stats.plan_to_watch_shows },
    { name: "On Hold", value: stats.on_hold_shows },
    { name: "Dropped", value: stats.dropped_shows },
  ].filter((item) => item.value > 0);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MonthlyBarChart({ data }: { data: Array<{ month: string; count: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 18%)" />
        <XAxis dataKey="month" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
        <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBarChart({ data, dataKey = "count" }: { data: Array<{ name: string; count: number }>; dataKey?: string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 18%)" horizontal={false} />
        <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={100} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey={dataKey} fill="#6366F1" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ data }: { data: Array<{ month: string; watching: number; completed: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 18%)" />
        <XAxis dataKey="month" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
        <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="watching" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="completed" fill="#22C55E" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
