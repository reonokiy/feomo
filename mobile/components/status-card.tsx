import { Image } from "expo-image";
import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { mastodon } from "@feomo/lib/gotosocial";

interface StatusCardProps {
  status: mastodon.v1.Status;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const StatusCard = memo(({ status }: StatusCardProps) => {
  const content = useMemo(() => stripHtml(status.content ?? ""), [status.content]);
  const createdAt = status.createdAt ? new Date(status.createdAt) : null;
  const formattedDate = createdAt ? createdAt.toLocaleString() : "";
  const displayName = status.account.displayName?.trim() || status.account.username;
  const acct = status.account.acct || status.account.username;
  const firstImage = status.mediaAttachments?.find((attachment) => attachment.type === "image");

  return (
    <View style={styles.card}>
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
          <Text numberOfLines={1} style={styles.timestamp}>
            {formattedDate}
          </Text>
        ) : null}
      </View>

      {content ? <Text style={styles.content}>{content}</Text> : null}

      {firstImage?.url ? (
        <Image source={firstImage.url} style={styles.attachment} contentFit="cover" />
      ) : null}

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>❤ {status.favouritesCount ?? 0}</Text>
        <Text style={styles.metaText}>🔁 {status.reblogsCount ?? 0}</Text>
        <Text style={styles.metaText}>💬 {status.repliesCount ?? 0}</Text>
        <Text style={styles.metaText}>{status.visibility}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  author: {
    flex: 1,
    gap: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  displayName: {
    fontWeight: "600",
    color: "#111",
  },
  acct: {
    fontSize: 12,
    color: "rgba(0,0,0,0.55)",
  },
  timestamp: {
    marginLeft: 8,
    fontSize: 11,
    color: "rgba(0,0,0,0.45)",
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: "#222",
  },
  attachment: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  metaText: {
    fontSize: 12,
    color: "rgba(0,0,0,0.5)",
  },
});

export default StatusCard;
