"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Search, Tv } from "lucide-react";
import { toast } from "sonner";
import { api, type JournalShowStatus } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { adminShowPath } from "@/lib/admin-path";
import { statusLabel } from "@/lib/format";
import { AdminShell } from "@/components/layout/app-shell";
import { PageHeader, EmptyState } from "@/components/journal/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const statuses: JournalShowStatus[] = ["watching", "completed", "plan-to-watch", "on-hold", "dropped"];

export function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();

  const login = useMutation({
    mutationFn: () => api.adminLogin(password),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminSession });
      toast.success("Signed in");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
      <div className="card-glow w-full rounded-2xl border bg-card p-6 md:p-8">
        <PageHeader title="Admin sign-in" description="Enter your journal password to manage shows and track episodes." />
        <div className="space-y-4">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" onKeyDown={(e) => e.key === "Enter" && login.mutate()} />
          <Button className="w-full" onClick={() => login.mutate()} disabled={login.isPending || !password}>
            {login.isPending ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
          </Button>
          <Link href="/" className="block text-center text-sm text-muted-foreground hover:text-foreground">Back to journal</Link>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<JournalShowStatus>("plan-to-watch");
  const queryClient = useQueryClient();

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: queryKeys.adminSession,
    queryFn: async () => {
      try {
        return (await api.adminMe()).admin;
      } catch {
        return null;
      }
    },
  });

  const { data: shows } = useQuery({
    queryKey: queryKeys.shows,
    queryFn: () => api.adminShows().then((r) => r.shows),
    enabled: Boolean(session),
  });

  const search = useMutation({
    mutationFn: () => api.adminSearchShows(query.trim()),
  });

  const addShow = useMutation({
    mutationFn: (showId: string) => api.adminAddShow(showId, status),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shows });
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      toast.success("Show added");
      window.location.href = adminShowPath(data.show.id);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const logout = useMutation({
    mutationFn: () => api.adminLogout(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminSession });
      toast.success("Signed out");
    },
  });

  if (sessionLoading) return <Skeleton className="m-8 h-64 rounded-2xl" />;
  if (!session) return <AdminLoginPage />;

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-4 md:space-y-8 md:px-8 md:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader eyebrow="Admin" title="Journal workspace" description="Search TVmaze and add shows to your library." />
          <Button variant="secondary" className="w-full sm:w-auto" onClick={() => logout.mutate()}>Sign out</Button>
        </div>

        <section className="card-glow rounded-2xl border bg-card p-4 md:p-6">
          <h2 className="mb-4 text-lg font-semibold">Search & add shows</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search TVmaze…" onKeyDown={(e) => e.key === "Enter" && search.mutate()} />
            <Button className="w-full sm:w-auto" onClick={() => search.mutate()} disabled={search.isPending || !query.trim()}>
              {search.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1 text-xs ${status === s ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {statusLabel(s)}
              </button>
            ))}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(search.data?.results ?? []).map((result) => (
              <div key={result.show.id} className="flex gap-4 rounded-2xl border bg-background/40 p-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {result.show.image?.medium ? <Image src={result.show.image.medium} alt={result.show.name} fill sizes="80px" className="object-cover" /> : <Tv className="m-auto size-6 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{result.show.name}</p>
                  <p className="text-xs text-muted-foreground">{[result.show.premiered?.slice(0, 4), result.show.network, ...result.show.genres.slice(0, 2)].filter(Boolean).join(" · ")}</p>
                  <Button size="sm" className="mt-3" onClick={() => addShow.mutate(result.show.id)} disabled={addShow.isPending}>Add to library</Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Library ({shows?.length ?? 0})</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {(shows ?? []).slice(0, 12).map((show) => (
              <Link key={show.id} href={adminShowPath(show.id) as "/"} className="card-glow flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40">
                <div className="relative size-14 overflow-hidden rounded-lg bg-muted">
                  {show.imageSnapshot ? <Image src={show.imageSnapshot} alt={show.showNameSnapshot} fill sizes="56px" className="object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{show.showNameSnapshot}</p>
                  <p className="text-xs text-muted-foreground">{show.episodesWatched ?? 0}/{show.totalEpisodes ?? 0} episodes</p>
                </div>
                <Badge>{statusLabel(show.status)}</Badge>
              </Link>
            ))}
          </div>
          {(shows?.length ?? 0) > 12 ? <p className="mt-4 text-sm text-muted-foreground"><Link href="/library" className="text-primary hover:underline">View full library →</Link></p> : null}
        </section>
      </div>
    </AdminShell>
  );
}
