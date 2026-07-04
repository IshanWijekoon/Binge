"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useEpisodeMutations() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    void queryClient.invalidateQueries({ queryKey: queryKeys.shows });
    void queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    void queryClient.invalidateQueries({ queryKey: queryKeys.calendar });
  };

  const markWatched = useMutation({
    mutationFn: (episodeId: string) => api.adminMarkEpisodeWatched(episodeId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.show(data.show.id), { show: data.show });
      invalidateAll();
      toast.success("Episode marked watched");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const unmarkWatched = useMutation({
    mutationFn: (episodeId: string) => api.adminUnmarkEpisodeWatched(episodeId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.show(data.show.id), { show: data.show });
      invalidateAll();
      toast.success("Episode unmarked");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const markNext = useMutation({
    mutationFn: (showId: string) => api.adminMarkNextEpisode(showId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.show(data.show.id), { show: data.show });
      invalidateAll();
      toast.success("Next episode marked watched");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const markSeasonWatched = useMutation({
    mutationFn: ({ showId, season }: { showId: string; season: number }) => api.adminMarkSeasonWatched(showId, season),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.show(data.show.id), { show: data.show });
      invalidateAll();
      toast.success("Season marked watched");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const markSeasonsWatched = useMutation({
    mutationFn: ({ showId, seasons }: { showId: string; seasons: number[] }) => api.adminMarkSeasonsWatched(showId, seasons),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.show(data.show.id), { show: data.show });
      invalidateAll();
      toast.success(`${variables.seasons.length} season${variables.seasons.length === 1 ? "" : "s"} marked watched`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const markEpisodesWatched = useMutation({
    mutationFn: (episodeIds: string[]) => api.adminMarkEpisodesWatched(episodeIds),
    onSuccess: (data, episodeIds) => {
      queryClient.setQueryData(queryKeys.show(data.show.id), { show: data.show });
      invalidateAll();
      toast.success(`${episodeIds.length} episode${episodeIds.length === 1 ? "" : "s"} marked watched`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleEpisode = (episodeId: string, watched: boolean) => {
    if (watched) {
      unmarkWatched.mutate(episodeId);
    } else {
      markWatched.mutate(episodeId);
    }
  };

  return {
    markWatched,
    unmarkWatched,
    markNext,
    markSeasonWatched,
    markSeasonsWatched,
    markEpisodesWatched,
    toggleEpisode,
    isPending:
      markWatched.isPending ||
      unmarkWatched.isPending ||
      markNext.isPending ||
      markSeasonWatched.isPending ||
      markSeasonsWatched.isPending ||
      markEpisodesWatched.isPending,
  };
}
