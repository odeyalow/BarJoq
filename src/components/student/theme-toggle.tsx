"use client";

import { useSyncExternalStore } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { IconButton } from "@/components/ui";
import { css } from "styled-system/css";

const subscribe = () => () => undefined;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const isDark = resolvedTheme === "dark";

  if (!mounted) {
    return (
      <IconButton
        aria-label="Переключить тему"
        className={css({
          h: "12",
          minW: "12",
        })}
        colorPalette="gray"
        variant="surface"
      >
        <MoonStar />
      </IconButton>
    );
  }

  return (
    <IconButton
      aria-label={
        isDark ? "Включить светлую тему" : "Включить темную тему"
      }
      className={css({
        h: "12",
        minW: "12",
      })}
      colorPalette="gray"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      variant="surface"
    >
      {isDark ? <SunMedium /> : <MoonStar />}
    </IconButton>
  );
}
