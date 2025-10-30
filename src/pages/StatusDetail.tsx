import dayjs from "dayjs";
import { LoaderIcon } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TimelineStatusCard from "@/components/TimelineStatusCard";
import { Button } from "@/components/ui/button";
import { gtsClient } from "@/lib/gotosocial";
import type { mastodon } from "@/lib/gotosocial";
import { Routes } from "@/router";
import { statusStore } from "@/store";

const StatusDetail = observer(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [context, setContext] = useState<mastodon.v1.Context | null>(null);

  const status = id ? (statusStore.state.statusMapById[id] as mastodon.v1.Status | undefined) : undefined;

  useEffect(() => {
    if (!id) {
      setErrorMessage("Missing status identifier");
      return;
    }

    if (!gtsClient.isAuthenticated()) {
      navigate(Routes.AUTH, { replace: true });
      return;
    }

    let cancelled = false;

    const loadStatus = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        await statusStore.getOrFetchStatus(id);
        const thread = await statusStore.fetchStatusContext(id);
        if (!cancelled) {
          setContext(thread);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load status thread:", error);
          setErrorMessage(error instanceof Error ? error.message : "Failed to load status");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const ancestors = useMemo(() => {
    if (!context) {
      return [];
    }
    return [...context.ancestors].sort((a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf());
  }, [context]);

  const descendants = useMemo(() => {
    if (!context) {
      return [];
    }
    return [...context.descendants].sort((a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf());
  }, [context]);

  const rootStatus = status;

  return (
    <div className="w-full min-h-full bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              ← Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Conversation</h1>
              <p className="text-sm text-muted-foreground">View replies and boosts for this status.</p>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{errorMessage}</div>
        )}

        {isLoading && !rootStatus ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <LoaderIcon className="mb-3 h-6 w-6 animate-spin" />
            <p>Loading status…</p>
          </div>
        ) : null}

        {!isLoading && !rootStatus && !errorMessage ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
            <p className="font-medium">This status could not be found</p>
            <p className="text-sm">It may have been deleted or you may not have permission to view it.</p>
          </div>
        ) : null}

        {ancestors.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Earlier in the conversation</h2>
            <div className="flex flex-col gap-4">
              {ancestors.map((ancestor) => (
                <TimelineStatusCard key={`ancestor-${ancestor.id}`} status={ancestor} />
              ))}
            </div>
          </section>
        ) : null}

        {rootStatus ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Original post</h2>
            <TimelineStatusCard status={rootStatus} />
          </section>
        ) : null}

        {descendants.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Replies</h2>
            <div className="flex flex-col gap-4">
              {descendants.map((reply) => (
                <TimelineStatusCard key={`reply-${reply.id}`} status={reply} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
});

export default StatusDetail;
