import dayjs from "dayjs";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { gtsClient, type mastodon } from "@/lib/gotosocial";
import { accountStore, memoFilterStore, statusStore } from "@/store";
import { filterStatuses } from "@/utils/statusFilters";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: {
    fontSize: 24,
    fontWeight: "600",
    color: "#f8fafc",
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#38bdf8",
  },
  refreshButtonText: {
    color: "#38bdf8",
    fontSize: 14,
    fontWeight: "600",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1e293b",
    marginRight: 12,
  },
  accountTextContainer: {
    flex: 1,
  },
  accountName: {
    color: "#f8fafc",
    fontWeight: "600",
  },
  accountHandle: {
    color: "#94a3b8",
    marginTop: 2,
  },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(248, 113, 113, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.3)",
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
    textAlign: "center",
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f8fafc",
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    padding: 16,
  },
  boostedBy: {
    fontSize: 12,
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardAuthorMeta: {
    flex: 1,
  },
  authorName: {
    color: "#f8fafc",
    fontWeight: "600",
    fontSize: 16,
  },
  authorHandle: {
    color: "#94a3b8",
    fontSize: 13,
  },
  timestampRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  timestamp: {
    color: "#94a3b8",
    fontSize: 12,
    marginRight: 8,
  },
  visibilityBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  visibilityText: {
    fontSize: 11,
    color: "#cbd5f5",
    textTransform: "uppercase",
  },
  cardContent: {
    color: "#e2e8f0",
    fontSize: 15,
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  footerText: {
    color: "#94a3b8",
    fontSize: 13,
  },
  spacingSmall: {
    marginTop: 8,
  },
  spacingMedium: {
    marginTop: 12,
  },
  footerSpacing: {
    marginTop: 12,
  },
  listSeparator: {
    height: 16,
  },
});

const stripHtml = (html: string): string => {
  return html
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const StatusListItem = ({ status }: { status: mastodon.v1.Status }) => {
  const isBoost = Boolean(status.reblog);
  const targetStatus = status.reblog || status;
  const author = targetStatus.account;
  const displayName = author.displayName?.trim() || author.username;
  const createdAt = targetStatus.createdAt ? dayjs(targetStatus.createdAt).format("YYYY-MM-DD HH:mm") : "Unknown time";
  const content = stripHtml(targetStatus.content || "");

  return (
    <View style={styles.card}>
      {isBoost && status.account ? <Text style={[styles.boostedBy, styles.spacingSmall]}>@{status.account.acct} boosted</Text> : null}
      <View style={styles.cardHeader}>
        <Image source={{ uri: author.avatarStatic || author.avatar }} style={styles.avatar} />
        <View style={styles.cardAuthorMeta}>
          <Text style={styles.authorName}>{displayName}</Text>
          <Text style={[styles.authorHandle, styles.spacingSmall]}>@{author.acct}</Text>
          <View style={[styles.timestampRow, styles.spacingSmall]}>
            <Text style={styles.timestamp}>{createdAt}</Text>
            {targetStatus.visibility ? (
              <View style={styles.visibilityBadge}>
                <Text style={styles.visibilityText}>{targetStatus.visibility}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {content ? <Text style={[styles.cardContent, styles.spacingSmall]}>{content}</Text> : null}
    </View>
  );
};

const HomeScreen = observer(() => {
  const currentAccount = accountStore.state.currentAccount;
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nextToken = statusStore.state.accountTimelineNextToken;
  const timelineStatuses = statusStore.state.accountTimeline
    .map((id) => statusStore.state.statusMapById[id])
    .filter((item): item is mastodon.v1.Status => Boolean(item));
  const filters = memoFilterStore.filters;
  const filteredStatuses = filterStatuses(timelineStatuses, filters);
  const hasFilters = filters.length > 0;

  useEffect(() => {
    if (!gtsClient.isAuthenticated() || !currentAccount) {
      return;
    }

    let cancelled = false;
    setIsInitialLoading(true);
    setErrorMessage(null);

    statusStore.clearAccountTimeline();

    statusStore
      .fetchAccountTimeline(currentAccount.id)
      .catch((error) => {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Failed to load timeline.";
        setErrorMessage(message);
      })
      .finally(() => {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      });

    return () => {
      cancelled = true;
      statusStore.clearAccountTimeline();
    };
  }, [currentAccount?.id]);

  const handleRefresh = useCallback(async () => {
    if (!currentAccount) {
      return;
    }

    setIsRefreshing(true);
    setErrorMessage(null);

    statusStore.clearAccountTimeline();

    try {
      await statusStore.fetchAccountTimeline(currentAccount.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh timeline.";
      setErrorMessage(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentAccount?.id]);

  const handleLoadMore = useCallback(async () => {
    if (!currentAccount || !nextToken || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setErrorMessage(null);

    try {
      await statusStore.fetchAccountTimeline(currentAccount.id, { maxId: nextToken });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load more posts.";
      setErrorMessage(message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentAccount?.id, nextToken, isLoadingMore]);

  if (!currentAccount) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={styles.emptyStateTitle}>Sign in to view your posts.</Text>
      </SafeAreaView>
    );
  }

  const showEmptyState = !isInitialLoading && filteredStatuses.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredStatuses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StatusListItem status={item} />}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headingRow}>
              <Text style={styles.heading}>My posts</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={isRefreshing || isInitialLoading}>
                <Text style={styles.refreshButtonText}>{isRefreshing ? "Refreshing…" : "Refresh"}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.accountRow, styles.spacingMedium]}>
              <Image source={{ uri: currentAccount.avatar }} style={styles.avatar} />
              <View style={styles.accountTextContainer}>
                <Text style={styles.accountName}>{currentAccount.displayName || currentAccount.username}</Text>
                <Text style={styles.accountHandle}>@{currentAccount.acct}</Text>
              </View>
            </View>
            {errorMessage ? (
              <View style={[styles.errorBanner, styles.spacingMedium]}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          showEmptyState ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>
                {hasFilters ? "No posts match the current filters" : "You have not posted anything yet"}
              </Text>
              <Text style={[styles.emptyStateText, styles.spacingSmall]}>
                {hasFilters ? "Clear filters to see more posts." : "Create a post from the web app to see it here."}
              </Text>
            </View>
          ) : isInitialLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#38bdf8" />
              <Text style={[styles.emptyStateText, styles.spacingSmall]}>Loading timeline…</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          filteredStatuses.length > 0 ? (
            <View style={[styles.footer, styles.footerSpacing]}>
              {isLoadingMore ? <ActivityIndicator size="small" color="#38bdf8" /> : null}
              {!nextToken && !isLoadingMore ? <Text style={styles.footerText}>No more posts</Text> : null}
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
      />
    </SafeAreaView>
  );
});

export default HomeScreen;
