import { Tabs, TabList, TabSlot, TabTrigger } from "expo-router/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, type PressableProps } from "react-native";

import { useColorScheme } from "@mobile/hooks/use-color-scheme";

type TabItem = {
  name: "index" | "mine";
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFilled: keyof typeof Ionicons.glyphMap;
};

const TAB_ITEMS: TabItem[] = [
  {
    name: "index",
    href: "/",
    label: "Timeline",
    icon: "albums-outline",
    iconFilled: "albums",
  },
  {
    name: "mine",
    href: "/mine",
    label: "Mine",
    icon: "person-circle-outline",
    iconFilled: "person-circle",
  },
];

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? "light";

  const palette = useMemo(() => {
    const active = colorScheme === "dark" ? "#60a5fa" : "#2563eb";
    const inactive = colorScheme === "dark" ? "rgba(226,232,240,0.85)" : "rgba(15,23,42,0.55)";
    const background = colorScheme === "dark" ? "rgba(15,23,42,0.78)" : "rgba(255,255,255,0.96)";
    const border = colorScheme === "dark" ? "rgba(94,110,130,0.45)" : "rgba(148,163,184,0.35)";
    return { active, inactive, background, border };
  }, [colorScheme]);

  return (
    <Tabs>
      <TabSlot />
      <TabList
        style={[
          styles.tabList,
          { backgroundColor: palette.background, borderColor: palette.border },
        ]}
      >
        {TAB_ITEMS.map((item) => (
          <TabTrigger key={item.name} name={item.name} href={item.href} asChild>
            <TabBarButton
              label={item.label}
              icon={item.icon}
              iconFilled={item.iconFilled}
              activeColor={palette.active}
              inactiveColor={palette.inactive}
            />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

interface TabBarButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFilled: keyof typeof Ionicons.glyphMap;
  activeColor: string;
  inactiveColor: string;
  isFocused?: boolean;
}

function TabBarButton({
  label,
  icon,
  iconFilled,
  activeColor,
  inactiveColor,
  isFocused,
  ...pressableProps
}: TabBarButtonProps) {
  const tint = isFocused ? activeColor : inactiveColor;

  return (
    <Pressable
      {...pressableProps}
      style={({ pressed }) => [
        styles.tabTrigger,
        pressed ? styles.tabTriggerPressed : null,
      ]}
    >
      <View style={styles.triggerContent}>
        <Ionicons name={isFocused ? iconFilled : icon} size={22} color={tint} />
        <Text style={[styles.triggerLabel, { color: tint }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabList: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabTrigger: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  tabTriggerPressed: {
    opacity: 0.85,
  },
  triggerContent: {
    alignItems: "center",
    gap: 4,
  },
  triggerLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});
