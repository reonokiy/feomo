import dayjs from "dayjs";
import DOMPurify from "dompurify";
import { ArrowUpRightIcon, HeartIcon, Loader2Icon, MessageCircleIcon, Repeat2Icon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import ProgressiveImage from "@/components/ProgressiveImage";
import { Button } from "@/components/ui/button";
import type { mastodon } from "@/lib/gotosocial";
import { cn } from "@/lib/utils";
import { Routes } from "@/router";
import { accountStore, statusStore } from "@/store";

interface TimelineStatusCardProps {
  status: mastodon.v1.Status;
}

const getAttachmentMimeType = (attachment: mastodon.v1.MediaAttachment): string | undefined => {
  if ("mimeType" in attachment) {
    const mime = (attachment as { mimeType?: unknown }).mimeType;
    return typeof mime === "string" ? mime : undefined;
  }
  return undefined;
};

const TimelineStatusCard = ({ status }: TimelineStatusCardProps) => {
  const navigate = useNavigate();
  const isBoost = Boolean(status.reblog);
  const targetStatus = status.reblog || status;
  const author = targetStatus.account;
  const displayName = author.displayName?.trim() || author.username;
  const createdAt = dayjs(targetStatus.createdAt).format("YYYY-MM-DD HH:mm");
  const detailPath = `${Routes.STATUS}/${targetStatus.id}`;
  const profilePath = `${Routes.USER}/${encodeURIComponent(author.acct)}`;
  const mediaAttachments = targetStatus.mediaAttachments || [];
  const contentHtml = DOMPurify.sanitize(targetStatus.content || "");

  const handleCardClick: React.MouseEventHandler<HTMLElement> = (event) => {
    if ((event.target as HTMLElement).closest("button, a")) {
      return;
    }
    navigate(detailPath, { replace: false });
  };

  const handleCardKeyDown: React.KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate(detailPath, { replace: false });
    }
  };

  return (
    <article
      className="rounded-md border border-border bg-card p-4 shadow-xs transition-colors hover:border-primary/30 focus-within:border-primary/40"
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      {isBoost && status.account && (
        <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
          <span>@{status.account.acct}</span> boosted
        </div>
      )}
      <div className="relative flex items-start gap-3">
        <img
          src={author.avatarStatic || author.avatar}
          alt={displayName}
          className="h-10 w-10 flex-shrink-0 rounded-full border border-border object-cover"
        />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Link
                to={profilePath}
                className="font-semibold text-foreground hover:text-primary"
                onClick={(event) => event.stopPropagation()}
                viewTransition
              >
                {displayName}
              </Link>
              <Link
                to={profilePath}
                className="text-xs text-muted-foreground hover:text-primary"
                onClick={(event) => event.stopPropagation()}
                viewTransition
              >
                @{author.acct}
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Link
                to={detailPath}
                className="hover:text-primary underline-offset-2 hover:underline"
                onClick={(event) => event.stopPropagation()}
                viewTransition
              >
                <time dateTime={targetStatus.createdAt}>{createdAt}</time>
              </Link>
              {targetStatus.visibility && (
                <span className="rounded-full bg-muted px-2 py-0.5 uppercase tracking-wide text-[0.65rem]">{targetStatus.visibility}</span>
              )}
            </div>
          </div>

          <StatusContent status={targetStatus} contentHtml={contentHtml} />

          {mediaAttachments.length > 0 && (
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              {mediaAttachments.map((attachment) => (
                <MediaAttachmentPreview key={attachment.id} attachment={attachment} />
              ))}
            </div>
          )}

          <TimelineActionBar status={status} actionStatus={targetStatus} />
        </div>

        {targetStatus.url && (
          <a
            href={targetStatus.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-0 top-0 rounded-full border border-border bg-background/80 p-1 text-muted-foreground shadow-sm transition hover:text-primary"
            onClick={(event) => event.stopPropagation()}
          >
            <ArrowUpRightIcon className="h-4 w-4" />
            <span className="sr-only">Open on instance</span>
          </a>
        )}
      </div>
    </article>
  );
};

interface MediaAttachmentPreviewProps {
  attachment: mastodon.v1.MediaAttachment;
}

const MediaAttachmentPreview = ({ attachment }: MediaAttachmentPreviewProps) => {
  const targetUrl = attachment.url ?? attachment.remoteUrl ?? attachment.previewUrl;
  const description = attachment.description ?? "Media attachment";

  if (attachment.type === "image") {
    const previewUrl = attachment.previewUrl;
    return (
      <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-border">
        <ProgressiveImage
          previewUrl={previewUrl}
          fullUrl={targetUrl || previewUrl}
          alt={description}
          className="h-full w-full object-cover"
        />
      </a>
    );
  }

  if (attachment.type === "gifv" || attachment.type === "video") {
    const mediaUrl = targetUrl || attachment.remoteUrl || attachment.previewUrl;
    if (!mediaUrl) {
      return null;
    }

    return (
      <div className="overflow-hidden rounded-md border border-border">
        <video
          className="h-full w-full"
          controls
          playsInline
          loop={attachment.type === "gifv"}
          autoPlay={attachment.type === "gifv"}
          muted={attachment.type === "gifv"}
          poster={attachment.previewUrl || undefined}
          preload="metadata"
          onClick={(event) => event.stopPropagation()}
        >
          <source src={mediaUrl} type={getAttachmentMimeType(attachment) ?? undefined} />
          Your browser does not support embedded video.{" "}
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
            Open media
          </a>
          .
        </video>
      </div>
    );
  }

  if (attachment.type === "audio") {
    const audioUrl = targetUrl || attachment.remoteUrl;
    if (!audioUrl) {
      return null;
    }

    return (
      <div className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm">
        <span className="font-medium capitalize">Audio</span>
        <audio className="w-full" controls preload="none" onClick={(event) => event.stopPropagation()}>
          <source src={audioUrl} type={getAttachmentMimeType(attachment) ?? undefined} />
          Your browser does not support audio playback.{" "}
          <a href={audioUrl} target="_blank" rel="noopener noreferrer">
            Open media
          </a>
          .
        </audio>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm">
      <span className="font-medium">Attachment</span>
      <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline-offset-2 hover:underline">
        {targetUrl}
      </a>
    </div>
  );
};

export default TimelineStatusCard;

const domParser = typeof window !== "undefined" ? new DOMParser() : null;

const resolveMentionAccount = async (mention: mastodon.v1.StatusMention): Promise<string | undefined> => {
  if (!mention.id) {
    return undefined;
  }

  try {
    const account = await accountStore.getOrFetchAccount(mention.id);
    return account.avatarStatic || account.avatar;
  } catch (error) {
    console.warn("Failed to resolve mention avatar", error);
    return undefined;
  }
};

interface StatusContentProps {
  status: mastodon.v1.Status;
  contentHtml: string;
}

const StatusContent = ({ status, contentHtml }: StatusContentProps) => {
  const [mentionAvatars, setMentionAvatars] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMentions = async () => {
      if (!status.mentions?.length) {
        return;
      }

      const updates: Record<string, string> = {};

      await Promise.all(
        status.mentions.map(async (mention) => {
          const key = mention.id || mention.acct;
          if (!key || mentionAvatars[key]) {
            return;
          }

          const avatar = await resolveMentionAccount(mention);
          if (avatar && !cancelled) {
            updates[key] = avatar;
          }
        }),
      );

      if (!cancelled && Object.keys(updates).length > 0) {
        setMentionAvatars((prev) => ({ ...prev, ...updates }));
      }
    };

    void loadMentions();

    return () => {
      cancelled = true;
    };
  }, [status.id, mentionAvatars]);

  const enrichedHtml = useMemo(() => {
    if (!domParser) {
      return contentHtml;
    }

    const doc = domParser.parseFromString(contentHtml, "text/html");
    const mentions = status.mentions || [];

    doc.querySelectorAll<HTMLAnchorElement>("a.mention").forEach((link) => {
      const handle = link.textContent?.trim();
      const href = link.getAttribute("href") || "";
      const mention = mentions.find((candidate) => `@${candidate.acct}` === handle || candidate.url === href);

      if (!mention) {
        return;
      }

      link.classList.add("mention-chip");
      const profilePath = `${Routes.USER}/${encodeURIComponent(mention.acct)}`;
      link.setAttribute("href", profilePath);
      link.removeAttribute("target");
      link.removeAttribute("rel");
      link.dataset.internalProfileLink = "true";

      while (link.firstChild) {
        link.removeChild(link.firstChild);
      }

      const avatarKey = mention.id || mention.acct;
      const avatarUrl = avatarKey ? mentionAvatars[avatarKey] : undefined;

      if (avatarUrl) {
        const img = doc.createElement("img");
        img.src = avatarUrl;
        img.alt = `@${mention.acct}`;
        img.className = "mention-avatar";
        link.appendChild(img);
      } else {
        const fallback = doc.createElement("span");
        fallback.className = "mention-avatar mention-avatar--fallback";
        fallback.textContent = "@";
        link.appendChild(fallback);
      }

      const textSpan = doc.createElement("span");
      textSpan.className = "mention-handle";
      textSpan.textContent = handle || `@${mention.acct}`;
      link.appendChild(textSpan);
    });

    doc.querySelectorAll<HTMLAnchorElement>("a.hashtag, a[rel~='tag']").forEach((link) => {
      link.classList.add("hashtag-chip");
    });

    return doc.body.innerHTML;
  }, [contentHtml, mentionAvatars, status.mentions]);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest<HTMLAnchorElement>("a[data-internal-profile-link='true']");
      if (link && link.getAttribute("href")) {
        event.preventDefault();
        const path = link.getAttribute("href");
        if (path) {
          navigate(path);
        }
      }
    };

    node.addEventListener("click", handleClick);
    return () => {
      node.removeEventListener("click", handleClick);
    };
  }, [navigate, enrichedHtml]);

  return (
    <div
      ref={contentRef}
      className="status-content prose prose-sm dark:prose-invert max-w-none leading-relaxed"
      dangerouslySetInnerHTML={{ __html: enrichedHtml }}
    />
  );
};

interface TimelineActionBarProps {
  status: mastodon.v1.Status;
  actionStatus: mastodon.v1.Status;
}

const TimelineActionBar = ({ status, actionStatus }: TimelineActionBarProps) => {
  const [isFavouritePending, setIsFavouritePending] = useState(false);
  const [isBoostPending, setIsBoostPending] = useState(false);
  const isFavourited = Boolean(actionStatus.favourited);
  const isBoosted = Boolean(actionStatus.reblogged);
  const detailPath = `${Routes.STATUS}/${actionStatus.id}`;
  const isAuthor = status.account?.id === actionStatus.account.id;

  const handleFavouriteToggle = async () => {
    if (isFavouritePending) {
      return;
    }

    setIsFavouritePending(true);
    try {
      const updated = isFavourited
        ? await statusStore.unfavouriteStatus(actionStatus.id)
        : await statusStore.favouriteStatus(actionStatus.id);

      if (status.id !== updated.id) {
        await statusStore.fetchStatus(status.id);
      }
    } catch (error) {
      console.error("Failed to toggle favourite:", error);
      toast.error("Failed to update favourite");
    } finally {
      setIsFavouritePending(false);
    }
  };

  const handleBoostToggle = async () => {
    if (isBoostPending) {
      return;
    }

    setIsBoostPending(true);
    try {
      const updated = isBoosted ? await statusStore.unboostStatus(actionStatus.id) : await statusStore.boostStatus(actionStatus.id);

      if (status.id !== updated.id) {
        await statusStore.fetchStatus(status.id);
      }
    } catch (error) {
      console.error("Failed to toggle boost:", error);
      toast.error("Failed to update boost");
    } finally {
      setIsBoostPending(false);
    }
  };

  const renderIcon = (Icon: typeof HeartIcon, active: boolean) => (
    <Icon className={cn("h-4 w-4", active ? "fill-current" : "fill-transparent")} />
  );

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isFavouritePending}
          onClick={(event) => {
            event.stopPropagation();
            void handleFavouriteToggle();
          }}
          className={cn("gap-2 text-xs font-medium", isFavourited ? "text-rose-500 hover:text-rose-500" : "text-muted-foreground")}
        >
          {isFavouritePending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : renderIcon(HeartIcon, isFavourited)}
          <span>{actionStatus.favouritesCount}</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isBoostPending || isAuthor}
          onClick={(event) => {
            event.stopPropagation();
            void handleBoostToggle();
          }}
          className={cn(
            "gap-2 text-xs font-medium",
            isBoosted ? "text-emerald-500 hover:text-emerald-500" : "text-muted-foreground",
            isAuthor && "opacity-40 cursor-not-allowed hover:text-muted-foreground",
          )}
        >
          {isBoostPending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <Repeat2Icon className="h-4 w-4" />}
          <span>{actionStatus.reblogsCount}</span>
        </Button>

        <Button size="sm" variant="ghost" className="gap-2 text-xs font-medium text-muted-foreground" asChild>
          <Link to={detailPath} onClick={(event) => event.stopPropagation()}>
            <MessageCircleIcon className="h-4 w-4" />
            <span>{actionStatus.repliesCount}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
};
