import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import statusStore from "@feomo/store/status";
import { gtsClient } from "@feomo/lib/gotosocial";

const ComposeScreen = () => {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePost = async () => {
    if (!gtsClient.isAuthenticated()) {
      Alert.alert("Not signed in", "Please sign in before creating a post.");
      router.replace("/login");
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert("Cannot post", "Please enter some content before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      await statusStore.createStatus({ status: trimmed, visibility: "public" });
      setText("");
      Alert.alert("Posted!", "Your status was published successfully.");
      router.back();
    } catch (error) {
      console.error("[Compose] Failed to create status:", error);
      Alert.alert("Failed to post", error instanceof Error ? error.message : "Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.select({ ios: "padding", android: "height" })}
      >
        <View style={styles.container}>
          <Text style={styles.title}>New post</Text>
          <Text style={styles.subtitle}>Share your thoughts with everyone on your instance.</Text>

          <TextInput
            style={styles.input}
            multiline
            placeholder="What’s happening?"
            value={text}
            onChangeText={setText}
            autoFocus
            editable={!isSubmitting}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.postButton, isSubmitting ? styles.disabled : null]}
              onPress={handlePost}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.postText}>{isSubmitting ? "Posting…" : "Post"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  keyboardAvoiding: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(15, 23, 42, 0.6)",
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148,163,184,0.35)",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    textAlignVertical: "top",
    backgroundColor: "#ffffff",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.2)",
  },
  cancelText: {
    fontSize: 15,
    color: "#475569",
    fontWeight: "600",
  },
  postButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#2563eb",
  },
  postText: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.7,
  },
});

export default ComposeScreen;
