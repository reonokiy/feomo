import { Globe2Icon, LoaderIcon, RefreshCcwIcon, UsersIcon } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TimelineStatusCard from "@/components/TimelineStatusCard";
import { Button } from "@/components/ui/button";
import { gtsClient } from "@/lib/gotosocial";
import type { mastodon } from "@/lib/gotosocial";
import { statusStore } from "@/store";
import memoFilterStore from "@/store/memoFilter";
import { filterStatuses } from "@/utils/statusFilters";

const Explore = observer(() => {
  const isAuthenticated = gtsClient.isAuthenticated();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localOnly, setLocalOnly] = useState(!isAuthenticated);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const nextToken = statusStore.state.publicTimelineNextToken;

  const statuses = useMemo(() => {
    return statusStore.state.publicTimeline
      .map((id) => statusStore.state.statusMapById[id])
      .filter((status): status is mastodon.v1.Status => Boolean(status));
  }, [statusStore.state.publicTimeline, statusStore.state.statusMapById]);

  const filters = memoFilterStore.filters;
  const filteredStatuses = useMemo(() => filterStatuses(statuses, filters), [statuses, filters]);

  const handleLoadMore = useCallback(async () => {
    const token = statusStore.state.publicTimelineNextToken;
    if (!token || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setErrorMessage(null);

    try {
      await statusStore.fetchPublicTimeline({
        maxId: token,
        local: localOnly || !isAuthenticated ? true : undefined,
      });
    } catch (error) {
      console.error("Failed to load more statuses:", error);
      const message = error instanceof Error ? error.message : "Failed to load more statuses";
      setErrorMessage(message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, localOnly, isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    const loadTimeline = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        statusStore.clearPublicTimeline();
        await statusStore.fetchPublicTimeline({
          local: localOnly || !isAuthenticated ? true : undefined,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("Failed to load public timeline:", error);
        const message = error instanceof Error ? error.message : "Failed to load timeline";
        setErrorMessage(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadTimeline();

    return () => {
      cancelled = true;
      statusStore.clearPublicTimeline();
    };
  }, [localOnly, isAuthenticated]);

  const handleRefresh = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      statusStore.clearPublicTimeline();
      await statusStore.fetchPublicTimeline({
        local: localOnly || !isAuthenticated ? true : undefined,
      });
    } catch (error) {
      console.error("Failed to refresh timeline:", error);
      const message = error instanceof Error ? error.message : "Failed to refresh timeline";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !nextToken) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !isLoadingMore) {
            void handleLoadMore();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [handleLoadMore, isLoadingMore, nextToken]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocalOnly(true);
    }
  }, [isAuthenticated]);

  return (
    <div className="w-full min-h-full bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-3 border-b border-border pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Explore timeline</h1>
              <p className="text-sm text-muted-foreground">See what everyone is posting across your GoToSocial instance.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant={localOnly ? "default" : "outline"} onClick={() => setLocalOnly(true)}>
                <UsersIcon className="mr-2 h-4 w-4" />
                Local
              </Button>
              <Button
                size="sm"
                variant={!localOnly ? "default" : "outline"}
                disabled={!isAuthenticated}
                onClick={() => {
                  if (!isAuthenticated) return;
                  setLocalOnly(false);
                }}
              >
                <Globe2Icon className="mr-2 h-4 w-4" />
                Federated
              </Button>
              <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCcwIcon className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
          {!isAuthenticated && <p className="text-xs text-muted-foreground">Sign in to browse the federated timeline.</p>}
        </header>

        {errorMessage && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{errorMessage}</div>
        )}

        {isLoading && statuses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <LoaderIcon className="mb-3 h-6 w-6 animate-spin" />
            <p>Loading public timeline…</p>
          </div>
        ) : null}

        {!isLoading && filteredStatuses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
            <p className="font-medium">No posts found</p>
            <p className="text-sm">
              {filters.length > 0
                ? "No posts match the current filters."
                : isAuthenticated
                  ? "Try switching between local and federated timelines or check back later."
                  : "Create an account or sign in to browse more posts."}
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          {filteredStatuses.map((status) => (
            <TimelineStatusCard key={status.id} status={status} />
          ))}
        </div>

        <div ref={loadMoreRef} className="h-4 w-full" />

        {isLoadingMore ? (
          <div className="flex justify-center py-4 text-muted-foreground">
            <LoaderIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
          </div>
        ) : null}

        {!nextToken && filteredStatuses.length > 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">No more posts</div>
        ) : null}
      </div>
    </div>
  );
});

export default Explore;
