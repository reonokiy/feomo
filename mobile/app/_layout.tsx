import "react-native-reanimated";

import "@mobile/setup/polyfills";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "@feomo/store/config";
import { useColorScheme } from "@mobile/hooks/use-color-scheme";
import { ensurePlatformEnvironment, isPlatformEnvironmentReady } from "@mobile/setup/environment";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [ready, setReady] = useState(isPlatformEnvironmentReady());

  useEffect(() => {
    if (ready) {
      return;
    }

    let cancelled = false;
    void ensurePlatformEnvironment()
      .catch((error) => {
        console.error("[RootLayout] Failed to initialize platform environment:", error);
      })
      .finally(() => {
        if (!cancelled) {
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: "Sign in" }} />
          <Stack.Screen name="login/callback" options={{ title: "Authorising" }} />
          <Stack.Screen name="compose" options={{ title: "Compose", presentation: "modal" }} />
          <Stack.Screen name="status/[id]" options={{ title: "Post" }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
