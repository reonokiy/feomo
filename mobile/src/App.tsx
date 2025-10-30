import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { config } from "@/config";
import { gtsClient } from "@/lib/gotosocial";

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
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#f8fafc",
  },
  subtitle: {
    fontSize: 14,
    color: "#cbd5f5",
  },
  button: {
    backgroundColor: "#38bdf8",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 16,
  },
  urlText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  statusText: {
    fontSize: 14,
    color: "#f8fafc",
  },
  errorText: {
    fontSize: 14,
    color: "#f87171",
  },
});

const App = () => {
  const [statusMessage, setStatusMessage] = useState<string>("Ready to connect.");
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAuthUrl = async () => {
    setIsLoading(true);
    setError(null);
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
      <StatusBar style="light" />
      <View style={styles.card}>
        <Text style={styles.title}>Memos Mobile</Text>
        <Text style={styles.subtitle}>Instance: {config.instanceUrl}</Text>
        <Text style={styles.subtitle}>Redirect URI: {config.redirectUri}</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.button, isLoading ? styles.buttonDisabled : null]}
          onPress={handleGenerateAuthUrl}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>{isLoading ? "Loading…" : "Generate OAuth URL"}</Text>
        </TouchableOpacity>

        {authUrl ? (
          <>
            <Text style={styles.statusText}>Authorization URL ready:</Text>
            <TouchableOpacity onPress={handleOpenAuthUrl}>
              <Text style={[styles.urlText, { textDecorationLine: "underline" }]}>{authUrl}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.statusText}>{statusMessage}</Text>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
};

export default App;

