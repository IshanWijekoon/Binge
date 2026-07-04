"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type JournalShowStatus } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { statusLabel } from "@/lib/format";
import { LibraryShowCard } from "@/components/journal/show-cards";
import { EmptyState, PageHeader } from "@/components/journal/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const filters: Array<{ id: JournalShowStatus | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "watching", label: "Watching" },
  { id: "completed", label: "Completed" },
  { id: "plan-to-watch", label: "Plan To Watch" },
  { id: "on-hold", label: "On Hold" },
];

export function LibraryPage() {
  const [filter, setFilter] = useState<JournalShowStatus | "all">("all");

  const { data: shows, isLoading, error } = useQuery({
    queryKey: queryKeys.shows,
    queryFn: () => api.publicShows().then((r) => r.shows),
  });

  const filtered = useMemo(() => {
    if (!shows) return [];
    if (filter === "all") return shows;
    return shows.filter((show) => show.status === filter);
  }, [shows, filter]);

  return (
    <div>
      <PageHeader eyebrow="Library" title="Your shows" description={`${shows?.length ?? 0} shows in your journal.`} />

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-all",
              filter === item.id ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <EmptyState title="Failed to load library" description={error.message} /> : null}
      {isLoading ? (
        <div className="grid gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
      ) : filtered.length ? (
        <div className="grid gap-4">
          {filtered.map((show) => (
            <LibraryShowCard key={show.id} show={show} />
          ))}
        </div>
      ) : (
        <EmptyState title={`No ${filter === "all" ? "" : statusLabel(filter as JournalShowStatus).toLowerCase() + " "}shows`} />
      )}
    </div>
  );
}
