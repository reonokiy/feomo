import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { gtsClient } from "@feomo/lib/gotosocial";
import type { mastodon } from "@feomo/lib/gotosocial";
import statusStore from "@feomo/store/status";
import StatusCard from "@mobile/components/status-card";

const StatusDetailScreen = observer(() => {
  const params = useLocalSearchParams<{ id?: string }>();
  const statusId = params.id as string | undefined;
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [context, setContext] = useState<mastodon.v1.Context | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const status = statusId ? statusStore.state.statusMapById[statusId] : undefined;

  const loadStatus = useCallback(async () => {
    if (!statusId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await statusStore.getOrFetchStatus(statusId);
      const fetchedContext = await statusStore.fetchStatusContext(statusId);
      setContext(fetchedContext);
    } catch (error) {
      console.error("[StatusDetail] Failed to load status detail:", error);
      const message = error instanceof Error ? error.message : "Failed to load status";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [statusId]);

  useFocusEffect(
    useCallback(() => {
      void loadStatus();
    }, [loadStatus]),
  );

  const handleRefresh = useCallback(async () => {
    if (!statusId) {
      return;
    }

    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      await statusStore.fetchStatus(statusId);
      const fetchedContext = await statusStore.fetchStatusContext(statusId);
      setContext(fetchedContext);
    } catch (error) {
      console.error("[StatusDetail] Failed to refresh detail:", error);
      const message = error instanceof Error ? error.message : "Failed to refresh status";
      setErrorMessage(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [statusId]);

  const replies = useMemo(() => context?.descendants ?? [], [context?.descendants]);
  const ancestors = useMemo(() => context?.ancestors ?? [], [context?.ancestors]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#0f172a" />
        }
      >
        {isLoading && !status ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" />
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {ancestors.length > 0 ? (
          <View style={styles.threadSection}>
            <Text style={styles.sectionTitle}>Earlier in this thread</Text>
            {ancestors.map((ancestor) => (
              <View key={ancestor.id} style={styles.threadItem}>
                <StatusCard status={ancestor} onPress={() => {}} showActions={false} />
              </View>
            ))}
          </View>
        ) : null}

        {status ? (
          <View style={styles.mainStatus}>
            <StatusCard
              status={status}
              onPress={() => {}}
              showActions={gtsClient.isAuthenticated()}
            />
          </View>
        ) : null}

        <View style={styles.divider} />

        {replies.length > 0 ? (
          <View style={styles.threadSection}>
            <Text style={styles.sectionTitle}>Replies</Text>
            {replies.map((reply) => (
              <View key={reply.id} style={styles.threadItem}>
                <StatusCard status={reply} onPress={() => {}} />
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyState}>No replies yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 18,
  },
  loader: {
    paddingVertical: 40,
    alignItems: "center",
  },
  errorText: {
    fontSize: 13,
    color: "#dc2626",
    textAlign: "center",
  },
  threadSection: {
    gap: 14,
  },
  threadItem: {
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    paddingHorizontal: 4,
  },
  mainStatus: {
    alignItems: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(148,163,184,0.4)",
    marginVertical: 12,
    marginHorizontal: 40,
  },
  emptyState: {
    fontSize: 13,
    textAlign: "center",
    color: "rgba(15, 23, 42, 0.6)",
    paddingVertical: 20,
  },
});

export default StatusDetailScreen;
