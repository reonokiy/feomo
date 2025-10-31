import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { memo, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import type { mastodon } from "@feomo/lib/gotosocial";
import { gtsClient } from "@feomo/lib/gotosocial";
import statusStore from "@feomo/store/status";

interface StatusCardProps {
  status: mastodon.v1.Status;
  onPress?: () => void;
  showActions?: boolean;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const StatusCard = memo(({ status, onPress, showActions = true }: StatusCardProps) => {
  const content = useMemo(() => stripHtml(status.content ?? ""), [status.content]);
  const createdAt = status.createdAt ? new Date(status.createdAt) : null;
  const formattedDate = createdAt
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(createdAt)
    : "";
  const displayName = status.account.displayName?.trim() || status.account.username;
  const acct = status.account.acct || status.account.username;
  const firstImage = status.mediaAttachments?.find((attachment) => attachment.type === "image");
  const windowWidth = useWindowDimensions().width;
  const cardWidth = Math.min(windowWidth - 32, 600);

  const [isActionPending, setIsActionPending] = useState(false);

  const stats = [
    {
      icon: status.favourited ? "heart" : "heart-outline",
      label: status.favouritesCount ?? 0,
      action: async () => {
        if (!ensureAuthenticated()) {
          return;
        }

        setIsActionPending(true);
        try {
          if (status.favourited) {
            await statusStore.unfavouriteStatus(status.id);
          } else {
            await statusStore.favouriteStatus(status.id);
          }
        } catch (error) {
          console.error("[StatusCard] toggle favourite failed:", error);
          Alert.alert("Failed to update favourite", error instanceof Error ? error.message : "Please try again later.");
        } finally {
          setIsActionPending(false);
        }
      },
      active: Boolean(status.favourited),
    },
    {
      icon: status.reblogged ? "repeat" : "repeat-outline",
      label: status.reblogsCount ?? 0,
      action: async () => {
        if (!ensureAuthenticated()) {
          return;
        }
        setIsActionPending(true);
        try {
          if (status.reblogged) {
            await statusStore.unboostStatus(status.id);
          } else {
            await statusStore.boostStatus(status.id);
          }
        } catch (error) {
          console.error("[StatusCard] toggle boost failed:", error);
          Alert.alert("Failed to update boost", error instanceof Error ? error.message : "Please try again later.");
        } finally {
          setIsActionPending(false);
        }
      },
      active: Boolean(status.reblogged),
    },
    {
      icon: "chatbubble-ellipses-outline",
      label: status.repliesCount ?? 0,
      action: () => {
        if (onPress) {
          onPress();
        } else {
          router.push({ pathname: "/status/[id]", params: { id: status.id } });
        }
      },
      active: false,
    },
  ];

  const ensureAuthenticated = (): boolean => {
    if (!gtsClient.isAuthenticated()) {
      router.push("/login");
      return false;
    }
    return true;
  };

  const handleBookmark = async () => {
    if (!ensureAuthenticated()) {
      return;
    }
    setIsActionPending(true);
    try {
      if (status.bookmarked) {
        await statusStore.unbookmarkStatus(status.id);
      } else {
        await statusStore.bookmarkStatus(status.id);
      }
    } catch (error) {
      console.error("[StatusCard] toggle bookmark failed:", error);
      Alert.alert("Failed to update bookmark", error instanceof Error ? error.message : "Please try again later.");
    } finally {
      setIsActionPending(false);
    }
  };

  const CardWrapper = onPress ? Pressable : View;

  return (
    <View style={[styles.outer, { width: cardWidth }]}>
      <CardWrapper
        {...(onPress
          ? {
              onPress: () => {
                if (onPress) {
                  onPress();
                }
              },
              android_ripple: { color: "rgba(148,163,184,0.2)" },
              style: ({ pressed }: { pressed: boolean }) => [
                styles.card,
                pressed ? styles.cardPressed : null,
              ],
            }
          : { style: styles.card })}
      >
        <View style={styles.header}>
          <Image
            source={status.account.avatar || undefined}
            style={styles.avatar}
            contentFit="cover"
          recyclingKey={status.account.id}
        />
        <View style={styles.author}>
          <Text numberOfLines={1} style={styles.displayName}>
            {displayName}
          </Text>
          <Text numberOfLines={1} style={styles.acct}>
            @{acct}
          </Text>
        </View>
        {formattedDate ? (
          <View style={styles.timestampPill}>
            <Text numberOfLines={1} style={styles.timestamp}>
              {formattedDate}
            </Text>
          </View>
        ) : null}
      </View>

      {content ? <Text style={styles.content}>{content}</Text> : null}

      {firstImage?.url ? (
        <View style={styles.attachmentWrapper}>
          <Image source={firstImage.url} style={styles.attachment} contentFit="cover" />
        </View>
      ) : null}

      {status.tags && status.tags.length ? (
        <View style={styles.tagRow}>
          {status.tags.slice(0, 4).map((tag) => (
            <TouchableOpacity key={tag.name} activeOpacity={0.7} style={styles.tagChip}>
              <Text style={styles.tagText}>#{tag.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {showActions ? (
        <View style={styles.metaRow}>
          {stats.map(({ icon, label, action, active }) => (
            <TouchableOpacity
              key={icon}
              style={styles.metaItem}
              onPress={action}
              disabled={isActionPending}
              activeOpacity={0.8}
            >
              <Ionicons
                name={icon as keyof typeof Ionicons.glyphMap}
                size={18}
                color={active ? "#2563eb" : "#475569"}
              />
              <Text style={[styles.metaText, active ? styles.metaTextActive : null]}>{label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={handleBookmark}
            style={styles.metaBadge}
            disabled={isActionPending}
            activeOpacity={0.85}
          >
            <Ionicons
              name={status.bookmarked ? "bookmark" : "bookmark-outline"}
              size={16}
              color={status.bookmarked ? "#2563eb" : "#475569"}
            />
            <Text
              style={[
                styles.metaBadgeText,
                status.bookmarked ? styles.metaTextActive : null,
              ]}
            >
              {status.visibility}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      </CardWrapper>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    alignItems: "center",
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148, 163, 184, 0.35)",
    borderRadius: 16,
    padding: 18,
    backgroundColor: "#ffffff",
    gap: 14,
    shadowColor: "rgba(15, 23, 42, 0.1)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
    alignSelf: "center",
    width: "100%",
  },
  cardPressed: {
    opacity: 0.9,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  author: {
    flex: 1,
    gap: 4,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148, 163, 184, 0.4)",
    backgroundColor: "rgba(148, 163, 184, 0.15)",
  },
  displayName: {
    fontWeight: "700",
    color: "#0f172a",
    fontSize: 16,
  },
  acct: {
    fontSize: 12,
    color: "rgba(15, 23, 42, 0.5)",
  },
  timestampPill: {
    backgroundColor: "rgba(226, 232, 240, 0.65)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  timestamp: {
    fontSize: 11,
    color: "rgba(15, 23, 42, 0.6)",
    fontWeight: "500",
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: "#1f2937",
  },
  attachmentWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(148,163,184,0.1)",
  },
  attachment: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    backgroundColor: "rgba(96, 165, 250, 0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    flexWrap: "wrap",
    gap: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.14)",
  },
  metaText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },
  metaTextActive: {
    color: "#2563eb",
  },
  metaBadge: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: "rgba(148, 163, 184, 0.18)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaBadgeText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
});

export default StatusCard;
