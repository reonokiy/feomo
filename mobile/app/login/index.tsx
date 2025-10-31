import * as Linking from "expo-linking";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  APP_CONFIG_OVERRIDE_KEYS,
  config,
  getAppConfigOverrides,
  setAppConfigOverrides,
} from "@feomo/config";
import { gtsClient } from "@feomo/lib/gotosocial";
import { getPlatformEnvironment } from "@feomo/core/platform/environment";

const DEFAULT_SCHEME =
  Constants.expoConfig?.scheme && !Constants.expoConfig.scheme.includes("exp")
    ? Constants.expoConfig.scheme
    : "feomo";

const LoginScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [instanceUrl, setInstanceUrl] = useState(() => {
    const overrides = getAppConfigOverrides();
    return overrides[APP_CONFIG_OVERRIDE_KEYS.INSTANCE_URL] ?? config.instanceUrl ?? "";
  });

  useEffect(() => {
    if (gtsClient.isAuthenticated()) {
      router.replace("/");
    }
  }, []);

  const handleSignIn = async () => {
    const trimmedInstance = instanceUrl.trim();
    if (!trimmedInstance) {
      setErrorMessage("Please enter your GoToSocial instance URL.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const redirectSchemeFromConfig = config.redirectUri?.split("://")[0];
      const redirectScheme =
        redirectSchemeFromConfig && !redirectSchemeFromConfig.startsWith("http")
          ? redirectSchemeFromConfig
          : DEFAULT_SCHEME;
      const redirectUri = Linking.createURL("login/callback", { scheme: redirectScheme });
      const currentOverrides = getAppConfigOverrides();
      const currentInstance =
        currentOverrides[APP_CONFIG_OVERRIDE_KEYS.INSTANCE_URL] ?? config.instanceUrl ?? "";
      const instanceChanged = currentInstance.trim() !== trimmedInstance;

      if (instanceChanged) {
        const storage = getPlatformEnvironment().storage;
        storage.removeItem("gts_client_id");
        storage.removeItem("gts_client_secret");
        storage.removeItem("gts_access_token");
        storage.removeItem("gts_current_account");
      }

      setAppConfigOverrides({
        [APP_CONFIG_OVERRIDE_KEYS.INSTANCE_URL]: trimmedInstance,
        [APP_CONFIG_OVERRIDE_KEYS.REDIRECT_URI]: redirectUri,
        [APP_CONFIG_OVERRIDE_KEYS.CLIENT_ID]: "",
        [APP_CONFIG_OVERRIDE_KEYS.CLIENT_SECRET]: "",
      });
      setInstanceUrl(trimmedInstance);

      const authUrl = await gtsClient.getAuthorizationUrl();
      await Linking.openURL(authUrl);
    } catch (error) {
      console.error("[Login] Failed to initiate sign in:", error);
      const message =
        error instanceof Error ? error.message : "Failed to open GoToSocial authorization page.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.title}>Sign in to Feomo</Text>
          <Text style={styles.subtitle}>
            We will redirect you to your GoToSocial instance so you can authorise this device. Set
            the instance you want to use, then continue with GoToSocial.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>GoToSocial instance URL</Text>
          <TextInput
            value={instanceUrl}
            onChangeText={setInstanceUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />
          <Text style={styles.helperText}>
            Example: https://example.social. You can change this later from the Mine tab.
          </Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, isLoading ? styles.buttonDisabled : null]}
          onPress={handleSignIn}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Continue with GoToSocial</Text>
          )}
        </TouchableOpacity>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Need help?</Text>
          <Text style={styles.instructionsText}>
            1. Tap the button above and log into your GoToSocial instance.
          </Text>
          <Text style={styles.instructionsText}>
            2. After authorising, you will be redirected back to Feomo.
          </Text>
          <Text style={styles.instructionsText}>
            3. If the browser does not return automatically, come back to the app manually.
          </Text>
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
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 24,
  },
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148,163,184,0.28)",
    shadowColor: "rgba(15,23,42,0.06)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 1,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(15, 23, 42, 0.7)",
  },
  section: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148,163,184,0.35)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "rgba(248,250,252,0.95)",
    color: "#0f172a",
  },
  helperText: {
    fontSize: 12,
    color: "rgba(15, 23, 42, 0.6)",
  },
  errorText: {
    fontSize: 13,
    color: "#dc2626",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  instructions: {
    gap: 6,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  instructionsText: {
    fontSize: 13,
    color: "rgba(15, 23, 42, 0.65)",
  },
});

export default LoginScreen;
