import { router, useFocusEffect } from "expo-router";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { mastodon } from "@feomo/lib/gotosocial";
import { config } from "@feomo/config";
import statusStore from "@feomo/store/status";
import StatusCard from "@mobile/components/status-card";
import { gtsClient } from "@feomo/lib/gotosocial";
import { loadTimelineCache, saveTimelineCache } from "@mobile/setup/timeline-cache";

const PLACEHOLDER_HOSTS = ["placeholder.invalid", "your-instance.social"];

function isInstanceConfigured(url: string): boolean {
  if (!url) {
    return false;
  }
  return !PLACEHOLDER_HOSTS.some((host) => url.includes(host));
}

const TimelineScreen = observer(() => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [localOnly, setLocalOnly] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [configVersion, setConfigVersion] = useState(0);
  const lastInstanceRef = useRef(config.instanceUrl);

  useFocusEffect(
    useCallback(() => {
      const current = config.instanceUrl;
      if (current !== lastInstanceRef.current) {
        lastInstanceRef.current = current;
        setConfigVersion((value) => value + 1);
      }
    }, []),
  );

  const instanceConfigured = isInstanceConfigured(config.instanceUrl);

  useEffect(() => {
    const cached = loadTimelineCache("public");
    if (cached.statuses.length > 0) {
      const statusMap = { ...statusStore.state.statusMapById };
      cached.statuses.forEach((cachedStatus) => {
        statusMap[cachedStatus.id] = cachedStatus;
      });

      statusStore.state.setPartial({
        statusMapById: statusMap,
        publicTimeline: cached.statuses.map((item) => item.id),
        publicTimelineNextToken: cached.nextToken,
      });
    }
  }, []);

  useEffect(() => {
    if (!instanceConfigured) {
      statusStore.clearPublicTimeline();
      return;
    }

    let cancelled = false;

    const fetchTimeline = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        statusStore.clearPublicTimeline();
        await statusStore.fetchPublicTimeline({
          local: localOnly ? true : undefined,
        });
        persistTimeline();
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("[Timeline] Failed to load timeline:", error);
        const message = error instanceof Error ? error.message : "Failed to load timeline";
        setErrorMessage(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchTimeline();

    return () => {
      cancelled = true;
    };
  }, [localOnly, instanceConfigured, configVersion]);

  const statuses = statusStore.state.publicTimeline
    .map((id) => statusStore.state.statusMapById[id])
    .filter((status): status is mastodon.v1.Status => Boolean(status));

  const persistTimeline = () => {
    const orderedStatuses = statusStore.state.publicTimeline
      .map((id) => statusStore.state.statusMapById[id])
      .filter((status): status is mastodon.v1.Status => Boolean(status));

    saveTimelineCache("public", orderedStatuses, statusStore.state.publicTimelineNextToken);
  };

  const handleRefresh = useCallback(async () => {
    if (!instanceConfigured) {
      return;
    }
    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      statusStore.clearPublicTimeline();
      await statusStore.fetchPublicTimeline({
        local: localOnly ? true : undefined,
      });
      persistTimeline();
    } catch (error) {
      console.error("[Timeline] Failed to refresh timeline:", error);
      const message = error instanceof Error ? error.message : "Failed to refresh timeline";
      setErrorMessage(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [instanceConfigured, localOnly]);

  const handleLoadMore = useCallback(async () => {
    if (!instanceConfigured || isLoadingMore) {
      return;
    }

    const nextToken = statusStore.state.publicTimelineNextToken;
    if (!nextToken) {
      return;
    }

    setIsLoadingMore(true);
    setErrorMessage(null);

    try {
      await statusStore.fetchPublicTimeline({
        local: localOnly ? true : undefined,
        maxId: nextToken,
      });
      persistTimeline();
    } catch (error) {
      console.error("[Timeline] Failed to load more statuses:", error);
      const message = error instanceof Error ? error.message : "Failed to load more posts";
      setErrorMessage(message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [instanceConfigured, isLoadingMore, localOnly]);

  const renderStatus = useCallback(
    ({ item }: { item: mastodon.v1.Status }) => <StatusCard status={item} />,
    [],
  );

  const listFooter = isLoadingMore ? (
    <View style={styles.footer}>
      <ActivityIndicator />
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroText}>
            <Text style={styles.title}>Timeline</Text>
            <Text numberOfLines={2} style={styles.subtitle}>
              {instanceConfigured
                ? `You're connected to ${config.instanceUrl}`
                : "Select your GoToSocial instance in Mine to start browsing your feed."}
            </Text>
          </View>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleButton, localOnly ? styles.toggleActive : null]}
              onPress={() => setLocalOnly(true)}
            >
              <Text style={[styles.toggleText, localOnly ? styles.toggleTextActive : null]}>Local</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, !localOnly ? styles.toggleActive : null]}
              onPress={() => setLocalOnly(false)}
            >
              <Text style={[styles.toggleText, !localOnly ? styles.toggleTextActive : null]}>Federated</Text>
            </TouchableOpacity>
          </View>
        </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {!instanceConfigured ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Instance not configured</Text>
          <Text style={styles.emptyDescription}>
            Set your GoToSocial instance URL in the Mine tab to browse the public timeline.
          </Text>
        </View>
      ) : null}

      {instanceConfigured ? (
        <FlatList
          data={statuses}
          keyExtractor={(item) => item.id}
          renderItem={renderStatus}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No posts yet</Text>
                <Text style={styles.emptyDescription}>Try refreshing or check back later.</Text>
              </View>
            ) : null
          }
          ListFooterComponent={listFooter}
          onEndReachedThreshold={0.5}
          onEndReached={handleLoadMore}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#0f172a"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : null}

        {isLoading && instanceConfigured && statuses.length === 0 ? (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" />
          </View>
        ) : null}

        {gtsClient.isAuthenticated() ? (
          <TouchableOpacity
            style={styles.composeButton}
            activeOpacity={0.85}
            onPress={() => router.push("/compose")}
          >
            <Ionicons name="create" size={20} color="white" />
            <Text style={styles.composeButtonLabel}>Post</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148,163,184,0.28)",
    shadowColor: "rgba(15,23,42,0.05)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 1,
    marginBottom: 18,
  },
  heroText: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(15, 23, 42, 0.6)",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  toggleButton: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(248,250,252,0.92)",
  },
  toggleActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  toggleText: {
    fontSize: 13,
    color: "rgba(15, 23, 42, 0.7)",
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#fff",
  },
  errorText: {
    marginBottom: 16,
    fontSize: 13,
    color: "#dc2626",
  },
  listContent: {
    paddingBottom: 36,
    gap: 18,
    alignItems: "center",
  },
  separator: {
    height: 16,
  },
  footer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyState: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.15)",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0f172a",
  },
  emptyDescription: {
    fontSize: 13,
    color: "rgba(15, 23, 42, 0.6)",
    textAlign: "center",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  composeButton: {
    position: "absolute",
    right: 24,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#2563eb",
    shadowColor: "rgba(15,23,42,0.25)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 4,
  },
  composeButtonLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default TimelineScreen;
