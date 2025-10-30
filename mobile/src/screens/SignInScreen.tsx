import { useState } from "react";
import { Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { config } from "@/config";
import { gtsClient } from "@/lib/gotosocial";
import { accountStore, statusStore } from "@/store";
import { clearInstanceOverride, getActiveInstanceUrl, getOverriddenInstanceUrl, setInstanceUrl } from "../config/instance";

const PRESET_INSTANCES = [
  { label: "Memos Social", url: "https://memos.social" },
  { label: "GoToSocial Demo", url: "https://gts.demo" },
] as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    borderRadius: 16,
    padding: 24,
    backgroundColor: "#1e293b",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#f8fafc",
    textAlign: "center",
    marginBottom: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 12,
    color: "#94a3b8",
    letterSpacing: 0.6,
  },
  input: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0f172a",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f8fafc",
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: "#38bdf8",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#38bdf8",
    paddingVertical: 10,
    alignItems: "center",
  },
  instanceChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },
  instanceChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "transparent",
  },
  instanceChipActive: {
    borderColor: "#38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
  },
  instanceChipText: {
    color: "#cbd5f5",
    fontSize: 13,
  },
  instanceChipTextActive: {
    color: "#38bdf8",
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryButtonText: {
    color: "#38bdf8",
    fontWeight: "600",
    fontSize: 14,
  },
  resetButton: {
    marginTop: 10,
    alignSelf: "center",
  },
  resetButtonText: {
    color: "#94a3b8",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  helperText: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    color: "#f8fafc",
    textAlign: "center",
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#f87171",
    textAlign: "center",
    marginTop: 12,
  },
  successText: {
    fontSize: 14,
    color: "#4ade80",
    textAlign: "center",
    marginTop: 12,
  },
  urlText: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 12,
  },
});

const SignInScreen = () => {
  const [statusMessage, setStatusMessage] = useState<string>("Ready to connect.");
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instanceInput, setInstanceInput] = useState(() => getActiveInstanceUrl());
  const [isSavingInstance, setIsSavingInstance] = useState(false);
  const [instanceError, setInstanceError] = useState<string | null>(null);
  const [instanceSuccess, setInstanceSuccess] = useState<string | null>(null);
  const [hasCustomInstance, setHasCustomInstance] = useState(() => Boolean(getOverriddenInstanceUrl()));
  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    const active = getActiveInstanceUrl();
    const preset = PRESET_INSTANCES.find((item) => item.url === active);
    return preset?.url ?? "";
  });

  const handleInstanceInputChange = (value: string) => {
    setInstanceInput(value);
    setSelectedPreset("");
    if (instanceError) {
      setInstanceError(null);
    }
    if (instanceSuccess) {
      setInstanceSuccess(null);
    }
  };

  const refreshInstanceState = () => {
    const active = getActiveInstanceUrl();
    setInstanceInput(active);
    setHasCustomInstance(Boolean(getOverriddenInstanceUrl()));
    const preset = PRESET_INSTANCES.find((item) => item.url === active);
    setSelectedPreset(preset?.url ?? "");
  };

  const resetAuthPreparationState = () => {
    setAuthUrl(null);
    setError(null);
    setStatusMessage("Ready to connect.");
  };

  const applyInstanceChange = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setInstanceError("Please enter an instance URL.");
      return;
    }

    if (trimmed === getActiveInstanceUrl()) {
      setSelectedPreset(trimmed);
      setInstanceSuccess("Instance already active.");
      return;
    }

    setIsSavingInstance(true);
    setInstanceError(null);
    setInstanceSuccess(null);

    try {
      if (gtsClient.isAuthenticated()) {
        await accountStore.logout();
      } else {
        gtsClient.clearAll();
      }

      setInstanceUrl(trimmed);
      gtsClient.clearAll();
      statusStore.clearTimelines();
      refreshInstanceState();
      resetAuthPreparationState();
      setInstanceSuccess("Instance updated. Generate a new OAuth URL to continue.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update instance.";
      setInstanceError(message);
    } finally {
      setIsSavingInstance(false);
    }
  };

  const handleSaveInstance = async () => {
    await applyInstanceChange(instanceInput);
  };

  const handleResetInstance = async () => {
    setIsSavingInstance(true);
    setInstanceError(null);
    setInstanceSuccess(null);

    try {
      if (gtsClient.isAuthenticated()) {
        await accountStore.logout();
      } else {
        gtsClient.clearAll();
      }

      clearInstanceOverride();
      gtsClient.clearAll();
      statusStore.clearTimelines();
      refreshInstanceState();
      resetAuthPreparationState();
      setInstanceSuccess("Instance reset to default settings.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reset instance.";
      setInstanceError(message);
    } finally {
      setIsSavingInstance(false);
    }
  };

  const handleGenerateAuthUrl = async () => {
    setIsLoading(true);
    setError(null);
    setInstanceSuccess(null);
    setStatusMessage("Preparing OAuth request…");

    try {
      const url = await gtsClient.getAuthorizationUrl();
      setAuthUrl(url);
      setStatusMessage("OAuth URL generated successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate authorization URL.";
      setError(message);
      setStatusMessage("Unable to prepare OAuth request.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAuthUrl = async () => {
    if (!authUrl) return;
    const supported = await Linking.canOpenURL(authUrl);

    if (!supported) {
      setError("Device cannot open the authorization URL.");
      return;
    }

    await Linking.openURL(authUrl);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Memos Mobile</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Choose an instance</Text>
          <View style={styles.instanceChipRow}>
            {PRESET_INSTANCES.map((item) => {
              const isActive = item.url === selectedPreset && item.url.length > 0;
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.instanceChip, isActive ? styles.instanceChipActive : null]}
                  disabled={isSavingInstance}
                  activeOpacity={0.8}
                  onPress={() => {
                    setInstanceInput(item.url);
                    setSelectedPreset(item.url);
                    void applyInstanceChange(item.url);
                  }}
                >
                  <Text style={[styles.instanceChipText, isActive ? styles.instanceChipTextActive : null]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Custom instance</Text>
          <TextInput
            value={instanceInput}
            onChangeText={handleInstanceInputChange}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://example.social"
            placeholderTextColor="#64748b"
            style={styles.input}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.secondaryButton, isSavingInstance ? styles.buttonDisabled : null]}
            onPress={handleSaveInstance}
            disabled={isSavingInstance}
          >
            <Text style={styles.secondaryButtonText}>{isSavingInstance ? "Saving…" : "Save Instance"}</Text>
          </TouchableOpacity>

          {hasCustomInstance ? (
            <TouchableOpacity
              style={[styles.resetButton, isSavingInstance ? styles.buttonDisabled : null]}
              onPress={handleResetInstance}
              disabled={isSavingInstance}
              activeOpacity={0.8}
            >
              <Text style={styles.resetButtonText}>Reset to default</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.helperText}>Current: {config.instanceUrl}</Text>
          <Text style={styles.helperText}>Redirect URI: {config.redirectUri}</Text>

          {instanceError ? <Text style={styles.errorText}>{instanceError}</Text> : null}
          {instanceSuccess ? <Text style={styles.successText}>{instanceSuccess}</Text> : null}
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.primaryButton, isLoading ? styles.buttonDisabled : null]}
          onPress={handleGenerateAuthUrl}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>{isLoading ? "Loading…" : "Generate OAuth URL"}</Text>
        </TouchableOpacity>

        {authUrl ? (
          <TouchableOpacity onPress={handleOpenAuthUrl}>
            <Text style={[styles.urlText, { textDecorationLine: "underline" }]}>{authUrl}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.statusText}>{statusMessage}</Text>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
};

export default SignInScreen;
