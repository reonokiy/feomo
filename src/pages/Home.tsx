import { LoaderIcon, RefreshCcwIcon } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TimelineStatusCard from "@/components/TimelineStatusCard";
import { Button } from "@/components/ui/button";
import useCurrentAccount from "@/hooks/useCurrentAccount";
import { gtsClient } from "@/lib/gotosocial";
import type { mastodon } from "@/lib/gotosocial";
import { accountStore, statusStore } from "@/store";
import memoFilterStore from "@/store/memoFilter";
import { filterStatuses } from "@/utils/statusFilters";

const Home = observer(() => {
  const currentAccount = useCurrentAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const nextToken = statusStore.state.accountTimelineNextToken;

  const statuses = useMemo(() => {
    return statusStore.state.accountTimeline
      .map((id) => statusStore.state.statusMapById[id])
      .filter((status): status is mastodon.v1.Status => Boolean(status));
  }, [statusStore.state.accountTimeline, statusStore.state.statusMapById]);

  const filters = memoFilterStore.filters;

  const filteredStatuses = useMemo(() => filterStatuses(statuses, filters), [statuses, filters]);
  const hasFilters = filters.length > 0;

  const handleLoadMore = useCallback(async () => {
    const token = statusStore.state.accountTimelineNextToken;
    if (!token || isLoadingMore) {
      return;
    }

    if (!currentAccount) {
      return;
    }

    setIsLoadingMore(true);
    setErrorMessage(null);

    try {
      await statusStore.fetchAccountTimeline(currentAccount.id, { maxId: token });
    } catch (error) {
      console.error("Failed to load more statuses:", error);
      const message = error instanceof Error ? error.message : "Failed to load more statuses";
      setErrorMessage(message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentAccount, isLoadingMore]);

  useEffect(() => {
    if (!gtsClient.isAuthenticated()) {
      return;
    }

    if (!currentAccount) {
      void accountStore.initialize();
      return;
    }

    let cancelled = false;

    const loadTimeline = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        statusStore.clearAccountTimeline();
        await statusStore.fetchAccountTimeline(currentAccount.id);
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("Failed to load home timeline:", error);
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
      statusStore.clearAccountTimeline();
    };
  }, [currentAccount]);

  const handleRefresh = async () => {
    if (!currentAccount) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      statusStore.clearAccountTimeline();
      await statusStore.fetchAccountTimeline(currentAccount.id);
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

    return () => {
      observer.disconnect();
    };
  }, [handleLoadMore, isLoadingMore, nextToken]);

  return (
    <div className="w-full min-h-full bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-2 border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">My posts</h1>
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCcwIcon className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
          {currentAccount && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <img
                src={currentAccount.avatar}
                alt={currentAccount.username}
                className="h-8 w-8 rounded-full border border-border object-cover"
              />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{currentAccount.displayName || currentAccount.username}</span>
                <span>@{currentAccount.acct}</span>
              </div>
            </div>
          )}
        </header>

        {errorMessage && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{errorMessage}</div>
        )}

        {isLoading && statuses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <LoaderIcon className="mb-3 h-6 w-6 animate-spin" />
            <p>Loading timeline…</p>
          </div>
        ) : null}

        {!isLoading && filteredStatuses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
            {hasFilters ? (
              <>
                <p className="font-medium">No posts match the current filters</p>
                <p className="text-sm">Clear filters to see more posts.</p>
              </>
            ) : (
              <>
                <p className="font-medium">You have not posted anything yet</p>
                <p className="text-sm">Create a post from the composer to see it here.</p>
              </>
            )}
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          {statuses.map((status) => (
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

export default Home;
