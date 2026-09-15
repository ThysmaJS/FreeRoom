"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY } from "./theme-constants";

export type ThemePreference = "system" | "light" | "dark";

const ORDER: ThemePreference[] = ["system", "light", "dark"];

const LABELS: Record<ThemePreference, string> = {
  system: "Thème automatique",
  light: "Thème clair",
  dark: "Thème sombre",
};

const ICONS: Record<ThemePreference, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return preference;
}

function applyTheme(preference: ThemePreference) {
  document.documentElement.setAttribute("data-theme", resolveTheme(preference));
}

export default function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    setPreference(
      stored === "light" || stored === "dark" ? stored : "system",
    );
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system");
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preference]);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length];
    setPreference(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  }

  const Icon = ICONS[preference];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${LABELS[preference]} — changer de thème`}
      title={LABELS[preference]}
      className="flex size-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-cyan"
    >
      <Icon className="size-4.5" strokeWidth={2.25} aria-hidden />
    </button>
  );
}
