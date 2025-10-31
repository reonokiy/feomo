import * as Linking from "expo-linking";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  APP_CONFIG_OVERRIDE_KEYS,
  clearAppConfigOverrides,
  config,
  getAppConfigOverrides,
  setAppConfigOverrides,
} from "@feomo/config";
import { gtsClient } from "@feomo/lib/gotosocial";
import accountStore from "@feomo/store/account";
import statusStore from "@feomo/store/status";

const PLACEHOLDER_HOSTS = ["placeholder.invalid", "your-instance.social"];

function getInitialValue(value: string | undefined, fallback: string): string {
  if (value && value.trim().length > 0) {
    return value.trim();
  }
  if (!PLACEHOLDER_HOSTS.some((host) => fallback.includes(host))) {
    return fallback;
  }
  return "";
}

const MineScreen = observer(() => {
  const account = accountStore.state.currentAccount;
  const overrides = useMemo(() => getAppConfigOverrides(), []);

  const [instanceUrl, setInstanceUrl] = useState(() =>
    getInitialValue(overrides[APP_CONFIG_OVERRIDE_KEYS.INSTANCE_URL], config.instanceUrl),
  );
  const [clientId, setClientId] = useState(
    () => overrides[APP_CONFIG_OVERRIDE_KEYS.CLIENT_ID] ?? "",
  );
  const [clientSecret, setClientSecret] = useState(
    () => overrides[APP_CONFIG_OVERRIDE_KEYS.CLIENT_SECRET] ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const redirectPreview = Linking.createURL("auth/callback");

  const handleSave = async () => {
    const sanitizedInstance = instanceUrl.trim();
    if (!sanitizedInstance) {
      setStatusMessage("Please enter a valid GoToSocial instance URL.");
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      if (gtsClient.isAuthenticated()) {
        await accountStore.logout();
      }

      setAppConfigOverrides({
        [APP_CONFIG_OVERRIDE_KEYS.INSTANCE_URL]: sanitizedInstance,
        [APP_CONFIG_OVERRIDE_KEYS.CLIENT_ID]: clientId.trim(),
        [APP_CONFIG_OVERRIDE_KEYS.CLIENT_SECRET]: clientSecret.trim(),
        [APP_CONFIG_OVERRIDE_KEYS.REDIRECT_URI]: redirectPreview,
      });

      statusStore.clearTimelines();

      setStatusMessage("Instance settings saved.");
    } catch (error) {
      console.error("[Mine] Failed to save configuration:", error);
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to update instance configuration.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setStatusMessage(null);

    try {
      if (gtsClient.isAuthenticated()) {
        await accountStore.logout();
      }

      clearAppConfigOverrides();
      statusStore.clearTimelines();

      setInstanceUrl("");
      setClientId("");
      setClientSecret("");
      setStatusMessage("Configuration reset. Please add your instance to continue.");
    } catch (error) {
      console.error("[Mine] Failed to reset configuration:", error);
      setStatusMessage(error instanceof Error ? error.message : "Failed to reset configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      await accountStore.logout();
      statusStore.clearTimelines();
      setStatusMessage("Signed out.");
    } catch (error) {
      console.error("[Mine] Failed to sign out:", error);
      setStatusMessage(error instanceof Error ? error.message : "Failed to sign out.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          <Image
            source={
              account?.avatar
                ? { uri: account.avatar }
                : require("@mobile/assets/images/icon.png")
            }
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.title}>{account?.displayName || account?.username || "Guest"}</Text>
            <Text style={styles.subtitle}>
              {account ? `@${account.acct}` : "Not signed in"}
            </Text>
            <Text style={styles.muted}>Instance: {config.instanceUrl}</Text>
          </View>
        </View>
        {account ? (
          <TouchableOpacity
            disabled={saving}
            onPress={handleSignOut}
            style={[styles.secondaryButton, styles.signOutButton]}
          >
            <Text style={styles.secondaryButtonText}>{saving ? "Signing out…" : "Sign out"}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.helperText}>
            Configure your GoToSocial instance below, then use the web app to authorise this device.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instance configuration</Text>
        <Text style={styles.description}>
          Update the GoToSocial instance that powers your timeline. Provide client credentials if
          you have already registered the mobile app, or leave them blank to auto-register.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Instance URL</Text>
        <TextInput
          value={instanceUrl}
          onChangeText={setInstanceUrl}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="https://example.social"
          keyboardType="url"
          style={styles.input}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Client ID (optional)</Text>
        <TextInput
          value={clientId}
          onChangeText={setClientId}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Leave empty to auto-create"
          style={styles.input}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Client secret (optional)</Text>
        <TextInput
          value={clientSecret}
          onChangeText={setClientSecret}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Leave empty to auto-create"
          style={styles.input}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Redirect URI</Text>
        <Text style={styles.code}>{redirectPreview}</Text>
        <Text style={styles.helpText}>
          Add this redirect URI to your GoToSocial OAuth application or leave the credentials empty
          and the app will register one for you during sign-in.
        </Text>
      </View>

      {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}

      <View style={styles.actions}>
        <TouchableOpacity
          disabled={saving}
          style={[styles.primaryButton, saving ? styles.disabled : null]}
          onPress={handleSave}
        >
          <Text style={styles.primaryButtonText}>{saving ? "Saving…" : "Save changes"}</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={saving} style={styles.secondaryButton} onPress={handleReset}>
          <Text style={styles.secondaryButtonText}>Reset configuration</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f9fc",
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 20,
    backgroundColor: "transparent",
  },
  profileCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.12)",
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 20,
    gap: 16,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(15, 23, 42, 0.1)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.1)",
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(15, 23, 42, 0.65)",
  },
  muted: {
    fontSize: 12,
    color: "rgba(15, 23, 42, 0.45)",
  },
  helperText: {
    fontSize: 12,
    color: "rgba(15, 23, 42, 0.6)",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  description: {
    fontSize: 13,
    color: "rgba(15, 23, 42, 0.6)",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(15, 23, 42, 0.8)",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.2)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  code: {
    fontFamily: "Courier",
    fontSize: 13,
    color: "rgba(15, 23, 42, 0.75)",
  },
  helpText: {
    fontSize: 12,
    color: "rgba(15, 23, 42, 0.55)",
  },
  status: {
    fontSize: 13,
    color: "#2563eb",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.25)",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  secondaryButtonText: {
    color: "rgba(15, 23, 42, 0.8)",
    fontSize: 15,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.7,
  },
  signOutButton: {
    marginTop: 4,
  },
});

export default MineScreen;
