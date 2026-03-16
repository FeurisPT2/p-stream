import { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  primaryOptions,
  secondaryOptions,
  tertiaryOptions,
} from "@themes/custom";

import { colorToRgbString } from "@/utils/color";

export interface SavedCustomTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  tertiary: string;
}

export interface ThemeStore {
  theme: string | null;
  customTheme: {
    // kept for backwards compat or default 'custom'
    primary: string;
    secondary: string;
    tertiary: string;
  };
  savedCustomThemes: SavedCustomTheme[];
  hiddenDefaultThemes: string[];
  setTheme(v: string | null): void;
  setCustomTheme(v: {
    primary: string;
    secondary: string;
    tertiary: string;
  }): void;
  saveCustomTheme(v: SavedCustomTheme): void;
  deleteCustomTheme(id: string): void;
  hideDefaultTheme(id: string): void;
}

const currentDate = new Date();
const is420 = currentDate.getMonth() + 1 === 4 && currentDate.getDate() === 20;
const isHalloween =
  currentDate.getMonth() + 1 === 10 && currentDate.getDate() === 31;
// Make default theme green if its 4/20 (bc the marijauna plant is green :3)
// Make default theme autumn if its Halloween (spooky autumn vibes 🎃)
export const useThemeStore = create(
  persist(
    immer<ThemeStore>((set) => ({
      theme: is420 ? "green" : isHalloween ? "autumn" : null,
      customTheme: {
        primary: "classic",
        secondary: "classic",
        tertiary: "classic",
      },
      savedCustomThemes: [],
      hiddenDefaultThemes: [],
      setTheme(v) {
        set((s) => {
          s.theme = v;
        });
      },
      setCustomTheme(v) {
        set((s) => {
          s.customTheme = v;
        });
      },
      saveCustomTheme(v) {
        set((s) => {
          const existing = s.savedCustomThemes.findIndex((t) => t.id === v.id);
          if (existing !== -1) s.savedCustomThemes[existing] = v;
          else s.savedCustomThemes.push(v);
        });
      },
      deleteCustomTheme(id) {
        set((s) => {
          s.savedCustomThemes = s.savedCustomThemes.filter((t) => t.id !== id);
          if (s.theme === id) {
            s.theme = null; // reset to default if deleted theme was active
          }
        });
      },
      hideDefaultTheme(id) {
        set((s) => {
          if (!s.hiddenDefaultThemes.includes(id)) {
            s.hiddenDefaultThemes.push(id);
          }
          if (s.theme === id) {
            s.theme = null;
          }
        });
      },
    })),
    {
      name: "__MW::theme",
    },
  ),
);

export interface PreviewThemeStore {
  previewTheme: string | null;
  previewSavedCustomThemes: SavedCustomTheme[] | null;
  setPreviewTheme(v: string | null): void;
  setPreviewSavedCustomThemes(v: SavedCustomTheme[] | null): void;
}

export const usePreviewThemeStore = create(
  immer<PreviewThemeStore>((set) => ({
    previewTheme: null,
    previewSavedCustomThemes: null,
    setPreviewTheme(v) {
      set((s) => {
        s.previewTheme = v;
      });
    },
    setPreviewSavedCustomThemes(v) {
      set((s) => {
        s.previewSavedCustomThemes = v;
      });
    },
  })),
);

export function ThemeProvider(props: {
  children?: ReactNode;
  applyGlobal?: boolean;
}) {
  const previewTheme = usePreviewThemeStore((s) => s.previewTheme);
  const previewSavedCustomThemes = usePreviewThemeStore(
    (s) => s.previewSavedCustomThemes,
  );
  const theme = useThemeStore((s) => s.theme);
  const customTheme = useThemeStore((s) => s.customTheme);

  const savedCustomThemesStore = useThemeStore((s) => s.savedCustomThemes);
  const savedCustomThemes = previewSavedCustomThemes ?? savedCustomThemesStore;

  const themeToDisplay = previewTheme ?? theme;
  const themeSelector = themeToDisplay ? `theme-${themeToDisplay}` : undefined;

  const parseCustomColor = (
    colorStr: string,
    keys: string[],
  ): Record<string, string> => {
    if (!colorStr.startsWith("custom:")) return {};
    const values = colorStr.replace("custom:", "").split(",");
    const vars: Record<string, string> = {};
    keys.forEach((key, i) => {
      if (values[i]) {
        vars[key] = colorToRgbString(values[i]);
      }
    });
    return vars;
  };

  let styleContent = "";
  if (themeToDisplay === "custom" && customTheme) {
    const primary = customTheme.primary.startsWith("custom:")
      ? parseCustomColor(customTheme.primary, ["--colors-buttons-primary", "--colors-type-logo", "--colors-themePreview-primary"])
      : primaryOptions.find((o) => o.id === customTheme.primary)?.colors || {};
    
    const secondary = customTheme.secondary.startsWith("custom:")
      ? parseCustomColor(customTheme.secondary, ["--colors-type-text", "--colors-buttons-secondary"])
      : secondaryOptions.find((o) => o.id === customTheme.secondary)?.colors || {};
      
    const tertiary = customTheme.tertiary.startsWith("custom:")
      ? parseCustomColor(customTheme.tertiary, ["--colors-background-main", "--colors-themePreview-secondary"])
      : tertiaryOptions.find((o) => o.id === customTheme.tertiary)?.colors || {};

    const vars = { ...primary, ...secondary, ...tertiary };
    const cssVars = Object.entries(vars)
      .map(([k, v]) => `${k}: ${v};`)
      .join(" ");

    styleContent += `.theme-custom { ${cssVars} }\n`;
  }

  // Inject CSS rules for all saved custom themes so their previews render correctly
  savedCustomThemes.forEach((savedTheme) => {
    const primary = savedTheme.primary.startsWith("custom:")
      ? parseCustomColor(savedTheme.primary, ["--colors-buttons-primary", "--colors-type-logo", "--colors-themePreview-primary"])
      : primaryOptions.find((o) => o.id === savedTheme.primary)?.colors || {};
      
    const secondary = savedTheme.secondary.startsWith("custom:")
      ? parseCustomColor(savedTheme.secondary, ["--colors-type-text", "--colors-buttons-secondary"])
      : secondaryOptions.find((o) => o.id === savedTheme.secondary)?.colors || {};
      
    const tertiary = savedTheme.tertiary.startsWith("custom:")
      ? parseCustomColor(savedTheme.tertiary, ["--colors-background-main", "--colors-themePreview-secondary"])
      : tertiaryOptions.find((o) => o.id === savedTheme.tertiary)?.colors || {};

    const vars = { ...primary, ...secondary, ...tertiary };
    const cssVars = Object.entries(vars)
      .map(([k, v]) => `${k}: ${v};`)
      .join(" ");

    const safeId = savedTheme.id.replace(/[^a-zA-Z0-9-]/g, "");
    styleContent += `.theme-${safeId} { ${cssVars} }\n`;
  });

  return (
    <div className={themeSelector}>
      {styleContent ? (
        <Helmet>
          <style>{styleContent}</style>
        </Helmet>
      ) : null}
      {props.applyGlobal ? (
        <Helmet>
          <body className={themeSelector} />
        </Helmet>
      ) : null}
      {props.children}
    </div>
  );
}
