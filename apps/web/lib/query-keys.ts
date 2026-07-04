export const queryKeys = {
  feed: ["feed"] as const,
  shows: ["shows"] as const,
  show: (id: string) => ["show", id] as const,
  episodes: (showId: string) => ["episodes", showId] as const,
  stats: ["stats"] as const,
  calendar: ["calendar"] as const,
  reviews: ["reviews"] as const,
  adminSession: ["adminSession"] as const,
  search: (query: string) => ["search", query] as const,
};
