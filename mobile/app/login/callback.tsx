import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { gtsClient } from "@feomo/lib/gotosocial";
import accountStore from "@feomo/store/account";
import statusStore from "@feomo/store/status";

type ScreenState = "processing" | "success" | "error";

const CallbackScreen = () => {
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [state, setState] = useState<ScreenState>("processing");
  const [message, setMessage] = useState<string>("Completing sign in…");

  useEffect(() => {
    const handleCallback = async () => {
      if (params.error) {
        setState("error");
        setMessage(params.error_description || params.error);
        return;
      }

      if (!params.code || typeof params.code !== "string") {
        setState("error");
        setMessage("No authorization code received.");
        return;
      }

      try {
        setState("processing");
        setMessage("Authorising your account…");
        await gtsClient.exchangeCodeForToken(params.code);
        await accountStore.initialize();
        statusStore.clearTimelines();

        setState("success");
        setMessage("Signed in successfully. Redirecting…");
        setTimeout(() => {
          router.replace("/");
        }, 800);
      } catch (error) {
        console.error("[LoginCallback] Failed to complete login:", error);
        setState("error");
        setMessage(error instanceof Error ? error.message : "Failed to complete authentication.");
      }
    };

    handleCallback();
  }, [params.code, params.error, params.error_description]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.card}>
          {state === "processing" ? (
            <ActivityIndicator size="large" color="#2563eb" />
          ) : null}
          <Text style={[styles.title, state === "error" ? styles.errorTitle : undefined]}>
            {state === "success"
              ? "You're signed in"
              : state === "error"
                ? "Something went wrong"
                : "Finishing up"}
          </Text>
          <Text style={styles.message}>{message}</Text>

          {state === "error" ? (
            <Text style={styles.tip}>
              You can close this window and start the login flow again from the app.
            </Text>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    padding: 24,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148,163,184,0.28)",
    alignItems: "center",
    gap: 16,
    shadowColor: "rgba(15,23,42,0.08)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  errorTitle: {
    color: "#dc2626",
  },
  message: {
    fontSize: 14,
    color: "rgba(15, 23, 42, 0.65)",
    textAlign: "center",
  },
  tip: {
    fontSize: 12,
    color: "rgba(15, 23, 42, 0.55)",
    textAlign: "center",
  },
});

export default CallbackScreen;
