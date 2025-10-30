import { StatusBar } from "expo-status-bar";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { gtsClient } from "@/lib/gotosocial";
import { accountStore } from "@/store";
import HomeScreen from "./screens/HomeScreen";
import SignInScreen from "./screens/SignInScreen";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    fontSize: 16,
    color: "#f8fafc",
    marginTop: 8,
  },
});

const App = observer(() => {
  const [isInitializingAccount, setIsInitializingAccount] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const currentAccount = accountStore.state.currentAccount;

  // Check authentication status safely after component mounts
  useEffect(() => {
    setIsAuthenticated(gtsClient.isAuthenticated());
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;
    setIsInitializingAccount(true);
    setInitializationError(null);

    const run = async () => {
      try {
        await accountStore.initialize();
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Failed to prepare account information.";
        setInitializationError(message);
      } finally {
        if (!cancelled) {
          setIsInitializingAccount(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {!isAuthenticated ? (
        <SignInScreen />
      ) : isInitializingAccount && !currentAccount ? (
        <SafeAreaView style={styles.container}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.message}>Loading your account…</Text>
        </SafeAreaView>
      ) : initializationError && !currentAccount ? (
        <SafeAreaView style={styles.container}>
          <View>
            <Text style={[styles.message, { color: "#f87171" }]}>{initializationError}</Text>
          </View>
        </SafeAreaView>
      ) : (
        <HomeScreen />
      )}
    </SafeAreaProvider>
  );
});

export default App;
