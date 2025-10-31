import { useFocusEffect } from "expo-router";
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
import type { mastodon } from "@feomo/lib/gotosocial";
import { config } from "@feomo/config";
import statusStore from "@feomo/store/status";
import StatusCard from "@mobile/components/status-card";

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
        <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Timeline</Text>
          <Text numberOfLines={2} style={styles.subtitle}>
            {instanceConfigured
              ? `Browsing posts from ${config.instanceUrl}`
              : "Configure a GoToSocial instance to start reading your timeline."}
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
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#333" />
          }
        />
      ) : null}

        {isLoading && instanceConfigured && statuses.length === 0 ? (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f9fc",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 13,
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
    borderColor: "rgba(15, 23, 42, 0.2)",
    backgroundColor: "rgba(255,255,255,0.9)",
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
    marginBottom: 12,
    fontSize: 13,
    color: "#dc2626",
  },
  listContent: {
    paddingBottom: 32,
    gap: 16,
  },
  separator: {
    height: 12,
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
});

export default TimelineScreen;
