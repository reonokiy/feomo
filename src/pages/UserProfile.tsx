import DOMPurify from "dompurify";
import { CalendarIcon, ExternalLinkIcon, LoaderIcon, UsersIcon } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ProgressiveImage from "@/components/ProgressiveImage";
import TimelineStatusCard from "@/components/TimelineStatusCard";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import type { mastodon } from "@/lib/gotosocial";
import { accountStore, statusStore } from "@/store";

const UserProfile = observer(() => {
  const { username } = useParams<{ username: string }>();
  const [account, setAccount] = useState<mastodon.v1.Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const accountIdRef = useRef<string | null>(null);

  const timelineAccountId = statusStore.state.accountTimelineAccountId;

  const statuses = useMemo(() => {
    if (!account || timelineAccountId !== account.id) {
      return [];
    }
    return statusStore.state.accountTimeline
      .map((id) => statusStore.state.statusMapById[id])
      .filter((status): status is mastodon.v1.Status => Boolean(status));
  }, [account, timelineAccountId, statusStore.state.accountTimeline, statusStore.state.statusMapById]);

  const nextToken = account && timelineAccountId === account.id ? statusStore.state.accountTimelineNextToken : null;

  const handleLoadMore = useCallback(async () => {
    if (!account || timelineAccountId !== account.id || !nextToken || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setErrorMessage(null);

    try {
      await statusStore.fetchAccountTimeline(account.id, { maxId: nextToken });
    } catch (error) {
      console.error("Failed to load more statuses:", error);
      const message = error instanceof Error ? error.message : "Failed to load more statuses";
      setErrorMessage(message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [account, timelineAccountId, nextToken, isLoadingMore]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !nextToken || !account || timelineAccountId !== account.id) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoadingMore) {
            void handleLoadMore();
          }
        });
      },
      { rootMargin: "200px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [account, timelineAccountId, nextToken, handleLoadMore, isLoadingMore]);

  useEffect(() => {
    if (!username) {
      setErrorMessage("Missing account handle");
      setIsLoading(false);
      return;
    }

    const acct = decodeURIComponent(username);
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const accountData = await accountStore.lookupAccount(acct);
        if (cancelled) {
          return;
        }

        setAccount(accountData);
        accountIdRef.current = accountData.id;
        await statusStore.fetchAccountTimeline(accountData.id);
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("Failed to load account:", error);
        const message = error instanceof Error ? error.message : "Failed to load account";
        setErrorMessage(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (accountIdRef.current && statusStore.state.accountTimelineAccountId === accountIdRef.current) {
        statusStore.clearAccountTimeline();
      }
    };
  }, [username]);

  const handleOpenProfile = () => {
    if (!account?.url) {
      return;
    }
    window.open(account.url, "_blank", "noopener,noreferrer");
  };

  const headerPreview = account?.headerStatic || account?.header;
  const headerFull = account?.header || account?.headerStatic;
  const noteHtml = account?.note ? DOMPurify.sanitize(account.note) : "";

  return (
    <div className="w-full min-h-full bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-4 border-b border-border pb-6">
          {headerPreview && (
            <div className="relative h-40 overflow-hidden rounded-lg border border-border">
              <ProgressiveImage
                previewUrl={headerPreview}
                fullUrl={headerFull}
                alt={`${account?.acct ?? ""} header`}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          )}

          <div className="flex flex-wrap items-start gap-4">
            <UserAvatar
              className="h-20 w-20 rounded-3xl border-4 border-background shadow-lg"
              avatarUrl={account?.avatar}
              previewUrl={account?.avatarStatic}
              alt={account ? `${account.acct} avatar` : "User avatar"}
            />

            <div className="flex flex-1 flex-col gap-2">
              <div>
                <h1 className="text-2xl font-semibold leading-tight text-foreground">
                  {account?.displayName || account?.username || "User"}
                </h1>
                <p className="text-sm text-muted-foreground">@{account?.acct}</p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <UsersIcon className="h-4 w-4" />
                  <span>
                    <strong className="text-foreground">{account?.followersCount ?? 0}</strong> followers
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <UsersIcon className="h-4 w-4 rotate-180" />
                  <span>
                    <strong className="text-foreground">{account?.followingCount ?? 0}</strong> following
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Joined {account ? new Date(account.createdAt).toLocaleDateString() : "—"}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {account?.url && (
                  <Button variant="outline" size="sm" onClick={handleOpenProfile}>
                    View on instance
                    <ExternalLinkIcon className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {noteHtml && (
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: noteHtml }}
            />
          )}

          {account?.fields?.length ? (
            <div className="grid gap-2">
              {account.fields.map((field) => (
                <div key={`${field.name}-${field.value}`} className="flex flex-col rounded-md border border-border px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{field.name}</span>
                  <span className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(field.value) }} />
                </div>
              ))}
            </div>
          ) : null}
        </header>

        {errorMessage && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{errorMessage}</div>
        )}

        {isLoading && !account ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <LoaderIcon className="mb-3 h-6 w-6 animate-spin" />
            <p>Loading profile…</p>
          </div>
        ) : null}

        {!isLoading && account && statuses.length === 0 && !errorMessage ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
            <p className="font-medium">No posts yet</p>
            <p className="text-sm">This user has not posted anything that you can see.</p>
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

        {!isLoading && !isLoadingMore && !nextToken && statuses.length > 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">No more posts</div>
        ) : null}
      </div>
    </div>
  );
});

export default UserProfile;
