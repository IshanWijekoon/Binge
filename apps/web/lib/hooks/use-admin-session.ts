"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useAdminSession() {
  return useQuery({
    queryKey: queryKeys.adminSession,
    queryFn: async () => {
      try {
        const response = await api.adminMe();
        return response.admin;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });
}
