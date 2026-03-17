import classNames from "classnames";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { SavedCustomTheme, useThemeStore } from "@/stores/theme";
import { colorToRgbString, rgbStringToHex } from "@/utils/color";
import {
  primaryOptions,
  secondaryOptions,
  tertiaryOptions,
} from "@themes/custom";

import { OverlayPortal } from "./OverlayDisplay";

// Stable identifiers for mock UI elements to satisfy linter key unique requirements
const MOCK_STARS = Array.from({ length: 20 }, (_, i) => `star-${i}`);
const MOCK_CARDS = Array.from({ length: 4 }, (_, i) => `card-${i}`);

/**
 * Symbolic "Card" Preview Component (Lovable style)
 */
function CardPreview({
  vars,
  scale = 1,
}: {
  vars: Record<string, string>;
  scale?: number;
}) {
  return (
    <div
      className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/5 bg-background-main shadow-2xl transition-all duration-500 flex flex-col items-center justify-center p-8 space-y-6"
      style={
        {
          ...vars,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        } as any
      }
    >
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-themePreview-primary shadow-[0_0_20px_rgba(var(--colors-themePreview-primary),0.4)]" />
          <span className="text-white font-black uppercase tracking-widest text-sm">
            Primary Color
          </span>
        </div>
        <span className="text-white/30 text-[9px] font-mono uppercase tracking-[0.2em]">
          Branding & Interaction
        </span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-type-text shadow-[0_0_20px_rgba(var(--colors-type-text),0.4)]" />
          <span className="text-white font-black uppercase tracking-widest text-sm">
            Secondary Color
          </span>
        </div>
        <span className="text-white/30 text-[9px] font-mono uppercase tracking-[0.2em]">
          Typography & Elements
        </span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-themePreview-secondary shadow-[0_0_20px_rgba(var(--colors-themePreview-secondary),0.4)]" />
          <span className="text-white font-black uppercase tracking-widest text-sm">
            Tertiary Color
          </span>
        </div>
        <span className="text-white/30 text-[9px] font-mono uppercase tracking-[0.2em]">
          Surfaces & Accents
        </span>
      </div>
    </div>
  );
}

/**
 * High-fidelity Detailed Preview Component (P-Stream Home)
 */
function DetailedPreview({
  vars,
  scale = 1,
}: {
  vars: Record<string, string>;
  scale?: number;
}) {
  return (
    <div
      className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/5 bg-background-main shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] transition-all duration-500 group"
      style={
        {
          ...vars,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        } as any
      }
    >
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top Glow */}
        <div className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[150%] h-1/2 bg-themePreview-primary/20 blur-[120px] rounded-[100%] opacity-60" />
        {/* Particles / Stars Mock */}
        <div className="absolute inset-0 opacity-20">
          {MOCK_STARS.map((id) => (
            <div
              key={id}
              className="absolute bg-white rounded-full"
              style={{
                width: `${(Math.random() * 2 + 1).toFixed(2)}px`,
                height: `${(Math.random() * 2 + 1).toFixed(2)}px`,
                top: `${(Math.random() * 100).toFixed(2)}%`,
                left: `${(Math.random() * 100).toFixed(2)}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Navbar Mock */}
      <div className="relative z-10 p-5 flex justify-between items-center">
        <div className="flex items-center gap-5">
          {/* Logo Symbol */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md">
            <div className="w-5 h-5 flex items-center justify-center text-themePreview-primary drop-shadow-[0_0_8px_rgba(var(--colors-themePreview-primary),0.5)]">
              <Icon icon={Icons.LOGO} className="text-xl" />
            </div>
            <span className="font-black tracking-tighter text-sm text-type-text hidden sm:block">
              P-Stream
            </span>
          </div>
          {/* Nav Icons mimicking Picture 4 */}
          <div className="flex items-center gap-3.5 text-type-text/40">
            <div className="p-1 px-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
              <Icon icon={Icons.DISCORD} className="text-base" />
            </div>
            <Icon icon={Icons.RISING_STAR} className="text-sm" />
            <Icon icon={Icons.BELL} className="text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-type-text/10 border border-white/5 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-themePreview-primary to-themePreview-primary/40 opacity-20" />
          </div>
          <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-type-text/60">
            <Icon icon={Icons.MENU} className="text-sm" />
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 mt-2 flex flex-col items-center px-12 text-center">
        <div className="p-3 mb-6 relative">
          <h2 className="text-3xl sm:text-4xl font-black text-type-text tracking-tight mb-4 leading-tight">
            What would you like to
            <br />
            watch tonight?
          </h2>
        </div>

        {/* Search Bar Mock */}
        <div className="w-full max-w-xl relative group/search">
          <div className="absolute inset-y-0 left-5 flex items-center text-type-text/20">
            <Icon icon={Icons.SEARCH} />
          </div>
          <div className="w-full h-14 bg-type-text/5 border border-white/5 rounded-2xl backdrop-blur-xl flex items-center px-14 text-type-text/20 text-md font-medium shadow-2xl">
            What do you want to watch?
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-8 mt-12 border-b border-white/5">
          {["Movies", "TV Shows", "Editor Picks"].map((tab, i) => (
            <div
              key={tab}
              className={classNames(
                "text-sm font-black transition-all relative pb-4 tracking-tight",
                i === 0
                  ? "text-themePreview-primary scale-110"
                  : "text-type-text/30",
              )}
            >
              {tab}
              {i === 0 && (
                <div className="absolute bottom-[-1px] left-[-20%] right-[-20%] h-[3px] bg-themePreview-primary rounded-full shadow-[0_0_15px_rgba(var(--colors-themePreview-primary),0.8)]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Grid Mock */}
      <div className="relative z-10 mt-10 px-8 pb-12">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-type-text tracking-tighter flex items-center gap-3">
            Most Popular
            <div className="flex items-center gap-1.5 opacity-30 text-[10px] uppercase tracking-widest">
              View more
              <Icon icon={Icons.ARROW_RIGHT} />
            </div>
          </h3>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {MOCK_CARDS.map((id) => (
            <div key={id} className="space-y-3 group/card">
              <div className="aspect-[2/3] rounded-2xl bg-type-text/5 border border-white/5 relative overflow-hidden transition-all duration-500 group-hover/card:scale-[1.05] shadow-2xl group-hover/card:border-themePreview-primary/30">
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60" />
                {/* Micro menu icon mock */}
                <div className="absolute top-3 right-3 w-7 h-7 rounded-xl bg-black/60 backdrop-blur-md opacity-0 group-hover/card:opacity-100 transition-all flex items-center justify-center border border-white/10">
                  <Icon icon={Icons.MENU} className="text-[10px] text-white" />
                </div>
                {/* Poster Mock Art */}
                <div className="absolute inset-0 p-4 flex flex-col justify-end gap-2">
                  <div className="h-3 w-3/4 bg-white/20 rounded-full" />
                  <div className="h-2 w-1/2 bg-white/10 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ColorOption({
  opt,
  selected,
  onClick,
  colorKey1,
  colorKey2,
}: {
  opt: any;
  selected: boolean;
  onClick: () => void;
  colorKey1: string;
  colorKey2?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "relative w-12 h-12 md:w-14 md:h-14 rounded-xl flex-shrink-0 cursor-pointer overflow-hidden transition-all duration-300 ease-out outline-none",
        selected
          ? "ring-2 ring-white ring-offset-2 ring-offset-background-main scale-100 shadow-xl shadow-white/10"
          : "hover:scale-110 opacity-60 hover:opacity-100 shadow-lg",
      )}
    >
      <div className="absolute inset-0 flex">
        <div
          className="flex-1 h-full"
          style={{
            backgroundColor: opt.colors[colorKey1]
              ? `rgb(${opt.colors[colorKey1]})`
              : "transparent",
          }}
        />
        {colorKey2 && opt.colors[colorKey2] && (
          <div
            className="flex-1 h-full"
            style={{ backgroundColor: `rgb(${opt.colors[colorKey2]})` }}
          />
        )}
      </div>
      {selected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Icon
            icon={Icons.CHECKMARK}
            className="text-white text-xl drop-shadow-md"
          />
        </div>
      )}
    </button>
  );
}

function CustomColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 md:w-14 md:h-14 rounded-xl cursor-pointer border-2 border-white/20 hover:border-white/50 transition-colors bg-transparent"
        />
      </div>
      <div>
        <p className="text-white/60 text-[10px] uppercase tracking-wider font-bold">
          {label}
        </p>
        <p className="text-white font-mono text-xs">{value.toUpperCase()}</p>
      </div>
    </div>
  );
}

export function CustomThemeModal(props: {
  id: string;
  isShown: boolean;
  onHide: () => void;
  themeToEdit?: SavedCustomTheme | null;
  onSave?: (theme: SavedCustomTheme) => void;
}) {
  const { t } = useTranslation();

  const saveCustomTheme = useThemeStore((s) => s.saveCustomTheme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const [name, setName] = useState("");
  const [primary, setPrimary] = useState(primaryOptions[0].id);
  const [secondary, setSecondary] = useState(secondaryOptions[0].id);
  const [tertiary, setTertiary] = useState(tertiaryOptions[0].id);

  // Scaling and Modes
  const [scale, setScale] = useState(0.8);
  const [isFullPreview, setIsFullPreview] = useState(false);

  // Custom color picker state
  const [useCustomPrimary, setUseCustomPrimary] = useState(false);
  const [useCustomSecondary, setUseCustomSecondary] = useState(false);
  const [useCustomTertiary, setUseCustomTertiary] = useState(false);

  const [customPrimary, setCustomPrimary] = useState("#BE95FF");
  const [customSecondaryText, setCustomSecondaryText] = useState("#FFFFFF");
  const [customSecondaryButton, setCustomSecondaryButton] = useState("#1A1A1E");
  const [customTertiaryBg, setCustomTertiaryBg] = useState("#0C0C0F");
  const [customTertiaryAccent, setCustomTertiaryAccent] = useState("#1A1A1E");

  const [unlockMainBg, setUnlockMainBg] = useState(false);

  const [wasShown, setWasShown] = useState(false);
  const [previewMode, setPreviewMode] = useState<"detailed" | "card">(
    "detailed",
  );

  useEffect(() => {
    if (props.isShown && !wasShown) {
      setWasShown(true);
      if (props.themeToEdit) {
        setName(props.themeToEdit.name);
        setPrimary(props.themeToEdit.primary);
        setSecondary(props.themeToEdit.secondary);
        setTertiary(props.themeToEdit.tertiary);
      } else {
        setName("");
        setPrimary(primaryOptions[0].id);
        setSecondary(secondaryOptions[0].id);
        setTertiary(tertiaryOptions[0].id);
      }
      setUseCustomPrimary(false);
      setUseCustomSecondary(false);
      setUseCustomTertiary(false);
      setUnlockMainBg(false);
      setIsFullPreview(false);
      setPreviewMode("detailed");
      setScale(0.8);
    } else if (!props.isShown && wasShown) {
      setWasShown(false);
    }
  }, [props.isShown, wasShown, props.themeToEdit]);

  // Calculate local CSS variables for scoped injection
  const previewVars = useMemo(() => {
    const vars: Record<string, string> = {};

    // 1. Primary
    if (useCustomPrimary) {
      const rgb = colorToRgbString(customPrimary);
      vars["--colors-themePreview-primary"] = rgb;
      vars["--colors-type-logo"] = rgb;
      vars["--colors-buttons-primary"] = rgb;
    } else {
      const opt = primaryOptions.find((o) => o.id === primary);
      if (opt) Object.assign(vars, opt.colors);
    }

    // 2. Secondary
    if (useCustomSecondary) {
      vars["--colors-type-text"] = colorToRgbString(customSecondaryText);
      vars["--colors-buttons-secondary"] = colorToRgbString(
        customSecondaryButton,
      );
    } else {
      const opt = secondaryOptions.find((o) => o.id === secondary);
      if (opt) Object.assign(vars, opt.colors);
    }

    // 3. Tertiary
    if (useCustomTertiary) {
      vars["--colors-background-main"] = colorToRgbString(customTertiaryBg);
      vars["--colors-themePreview-secondary"] =
        colorToRgbString(customTertiaryAccent);
    } else {
      const opt = tertiaryOptions.find((o) => o.id === tertiary);
      if (opt) Object.assign(vars, opt.colors);
    }

    return vars;
  }, [
    primary,
    secondary,
    tertiary,
    useCustomPrimary,
    useCustomSecondary,
    useCustomTertiary,
    customPrimary,
    customSecondaryText,
    customSecondaryButton,
    customTertiaryBg,
    customTertiaryAccent,
  ]);

  const handleClose = () => {
    props.onHide();
  };

  const handleSave = () => {
    const themeName = name.trim() || "Untitled Theme";
    const id = props.themeToEdit
      ? props.themeToEdit.id
      : `custom-${Date.now()}`;
    const newTheme: SavedCustomTheme = {
      id,
      name: themeName,
      primary: useCustomPrimary ? `custom:${customPrimary}` : primary,
      secondary: useCustomSecondary
        ? `custom:${customSecondaryText},${customSecondaryButton}`
        : secondary,
      tertiary: useCustomTertiary
        ? `custom:${customTertiaryBg},${customTertiaryAccent}`
        : tertiary,
    };

    if (props.onSave) {
      props.onSave(newTheme);
    } else {
      saveCustomTheme(newTheme);
      setTheme(id);
    }

    props.onHide();
  };

  return (
    <OverlayPortal show={props.isShown}>
      <div className="absolute inset-0 z-[1000] flex flex-col lg:flex-row bg-background-main text-white pointer-events-auto overflow-hidden animate-in fade-in duration-500">
        {/* Full Modal Live Preview Overlay */}
        {isFullPreview && (
          <div className="absolute inset-0 z-[1100] bg-black/40 backdrop-blur-md flex items-center justify-center p-8 animate-in zoom-in-95 duration-300 pointer-events-auto">
            <div className="relative w-full h-full max-w-6xl max-h-[85vh] flex items-center justify-center overflow-hidden">
              {previewMode === "detailed" ? (
                <DetailedPreview vars={previewVars} scale={1} />
              ) : (
                <CardPreview vars={previewVars} scale={1} />
              )}
              <button
                type="button"
                onClick={() => setIsFullPreview(false)}
                className="absolute -top-12 right-0 flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black font-black hover:bg-gray-200 transition-all shadow-2xl active:scale-95 z-[1200]"
              >
                <Icon icon={Icons.X} />
                Exit Preview
              </button>
            </div>
          </div>
        )}

        {/* Left Section - Identity & Detailed Preview */}
        <div className="flex-1 flex flex-col p-8 md:p-12 border-b lg:border-b-0 lg:border-r border-white/5 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase leading-none">
              Create
              <br />
              <span className="text-white/40">Your Own</span>
              <br />
              Theme
            </h1>
            <div className="flex gap-2">
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setPreviewMode("card")}
                  className={classNames(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                    previewMode === "card"
                      ? "bg-white text-black shadow-lg"
                      : "text-white/40 hover:text-white/80",
                  )}
                >
                  Card View
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("detailed")}
                  className={classNames(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                    previewMode === "detailed"
                      ? "bg-white text-black shadow-lg"
                      : "text-white/40 hover:text-white/80",
                  )}
                >
                  Detailed View
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsFullPreview(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-tighter transition-all border border-white/5"
              >
                <Icon icon={Icons.EYE} />
                Full Preview
              </button>
            </div>
          </div>

          <div className="mb-10">
            <input
              type="text"
              id="theme-name-input"
              name="theme-name"
              className="w-full text-3xl font-black bg-transparent border-none outline-none text-white placeholder-white/10 transition-colors"
              placeholder="Name your theme..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Scale Control & High-Fidelity Preview Container */}
          <div className="flex-1 flex flex-col justify-center items-center min-h-[400px]">
            <div className="w-full max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-white/30">
                  Live Concept Preview
                </p>
                <div className="flex items-center gap-4">
                  <Icon icon={Icons.SEARCH} className="text-xs opacity-20" />
                  <input
                    type="range"
                    min="0.3"
                    max="1"
                    step="0.01"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer hover:bg-white/20 transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                  />
                  <span className="text-[10px] font-mono text-white/40 w-8">
                    {Math.round(scale * 100)}%
                  </span>
                </div>
              </div>

              <div className="relative rounded-2xl p-4 bg-black/20 border border-white/5 overflow-hidden flex items-center justify-center min-h-[360px]">
                {previewMode === "detailed" ? (
                  <DetailedPreview vars={previewVars} scale={scale} />
                ) : (
                  <CardPreview vars={previewVars} scale={scale} />
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col md:flex-row items-center gap-4 mt-12 w-full">
            <Button
              className="w-full md:w-auto md:flex-1 !bg-white/5 hover:!bg-white/10 !text-white !font-bold !px-6 !py-5 !rounded-2xl border border-white/5 transition-all"
              onClick={handleClose}
            >
              {t("global.cancel", "Cancel")}
            </Button>
            <Button
              className="w-full md:w-auto md:flex-[2] !bg-white hover:!bg-gray-200 !text-black !font-black !px-12 !py-5 !rounded-2xl transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_20px_40px_-10px_rgba(255,255,255,0.1)]"
              onClick={handleSave}
              disabled={name.trim().length === 0}
            >
              {t("global.save", "Save")}
            </Button>
          </div>
        </div>

        {/* Right Section - Advanced Color Configuration */}
        <div className="w-full lg:w-[420px] xl:w-[480px] flex flex-col gap-10 p-8 md:p-12 overflow-y-auto overflow-x-hidden custom-scrollbar bg-black/10">
          {/* Section: Primary */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-white/40 uppercase tracking-widest">
                  Primary Theme
                </h2>
                <p className="text-[10px] text-white/20 mt-1 uppercase tracking-wider">
                  Branding & Interaction
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!useCustomPrimary) {
                    const opt = primaryOptions.find((o) => o.id === primary);
                    if (opt) {
                      setCustomPrimary(
                        rgbStringToHex(
                          opt.colors["--colors-themePreview-primary"] ||
                            "0 0 0",
                        ),
                      );
                    }
                  }
                  setUseCustomPrimary(!useCustomPrimary);
                }}
                className={classNames(
                  "flex items-center gap-2 text-[10px] px-3 py-2 rounded-xl transition-all font-black uppercase tracking-tighter border",
                  useCustomPrimary
                    ? "bg-white text-black border-white"
                    : "bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white/80",
                )}
              >
                <Icon icon={Icons.BRUSH} />
                Custom
              </button>
            </div>
            {useCustomPrimary ? (
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 animate-in slide-in-from-top-2">
                <CustomColorPicker
                  label="Accent highlight"
                  value={customPrimary}
                  onChange={setCustomPrimary}
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {primaryOptions.map((opt) => (
                  <ColorOption
                    key={opt.id}
                    opt={opt}
                    selected={primary === opt.id}
                    onClick={() => setPrimary(opt.id)}
                    colorKey1="--colors-type-logo"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-white/5" />

          {/* Section: Secondary */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-white/40 uppercase tracking-widest">
                  Secondary Details
                </h2>
                <p className="text-[10px] text-white/20 mt-1 uppercase tracking-wider">
                  Typography & Elements
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!useCustomSecondary) {
                    const opt = secondaryOptions.find(
                      (o) => o.id === secondary,
                    );
                    if (opt) {
                      setCustomSecondaryText(
                        rgbStringToHex(
                          opt.colors["--colors-type-text"] || "0 0 0",
                        ),
                      );
                      setCustomSecondaryButton(
                        rgbStringToHex(
                          opt.colors["--colors-buttons-secondary"] || "0 0 0",
                        ),
                      );
                    }
                  }
                  setUseCustomSecondary(!useCustomSecondary);
                }}
                className={classNames(
                  "flex items-center gap-2 text-[10px] px-3 py-2 rounded-xl transition-all font-black uppercase tracking-tighter border",
                  useCustomSecondary
                    ? "bg-white text-black border-white"
                    : "bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white/80",
                )}
              >
                <Icon icon={Icons.BRUSH} />
                Custom
              </button>
            </div>
            {useCustomSecondary ? (
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-6 animate-in slide-in-from-top-2">
                <CustomColorPicker
                  label="Primary text color"
                  value={customSecondaryText}
                  onChange={setCustomSecondaryText}
                />
                <div className="h-px bg-white/5" />
                <CustomColorPicker
                  label="Secondary buttons"
                  value={customSecondaryButton}
                  onChange={setCustomSecondaryButton}
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {secondaryOptions.map((opt) => (
                  <ColorOption
                    key={opt.id}
                    opt={opt}
                    selected={secondary === opt.id}
                    onClick={() => setSecondary(opt.id)}
                    colorKey1="--colors-type-text"
                    colorKey2="--colors-buttons-secondary"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-white/5" />

          {/* Section: Tertiary */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-white/40 uppercase tracking-widest">
                  Tertiary Base
                </h2>
                <p className="text-[10px] text-white/20 mt-1 uppercase tracking-wider">
                  Surfaces & Accents
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!useCustomTertiary) {
                    const opt = tertiaryOptions.find((o) => o.id === tertiary);
                    if (opt) {
                      setCustomTertiaryBg(
                        rgbStringToHex(
                          opt.colors["--colors-background-main"] || "0 0 0",
                        ),
                      );
                      setCustomTertiaryAccent(
                        rgbStringToHex(
                          opt.colors["--colors-themePreview-secondary"] ||
                            "0 0 0",
                        ),
                      );
                    }
                  }
                  setUseCustomTertiary(!useCustomTertiary);
                }}
                className={classNames(
                  "flex items-center gap-2 text-[10px] px-3 py-2 rounded-xl transition-all font-black uppercase tracking-tighter border",
                  useCustomTertiary
                    ? "bg-white text-black border-white"
                    : "bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white/80",
                )}
              >
                <Icon icon={Icons.BRUSH} />
                Custom
              </button>
            </div>
            {useCustomTertiary ? (
              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-6 animate-in slide-in-from-top-2">
                {!unlockMainBg ? (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/10 rounded-2xl bg-black/20 gap-3">
                    <Icon
                      icon={Icons.LOCK}
                      className="text-white/30 text-2xl"
                    />
                    <p className="text-[10px] text-white/50 uppercase tracking-widest text-center">
                      Main Background Locked
                      <br />
                      <span className="text-white/30 lowercase tracking-normal">
                        Prevents entire website color change
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setUnlockMainBg(true)}
                      className="px-4 py-2 mt-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all"
                    >
                      Unlock to Edit
                    </button>
                  </div>
                ) : (
                  <CustomColorPicker
                    label="Main background"
                    value={customTertiaryBg}
                    onChange={setCustomTertiaryBg}
                  />
                )}
                <div className="h-px bg-white/5" />
                <CustomColorPicker
                  label="Accent surfaces"
                  value={customTertiaryAccent}
                  onChange={setCustomTertiaryAccent}
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {tertiaryOptions.map((opt) => (
                  <ColorOption
                    key={opt.id}
                    opt={opt}
                    selected={tertiary === opt.id}
                    onClick={() => setTertiary(opt.id)}
                    colorKey1="--colors-themePreview-primary"
                    colorKey2="--colors-themePreview-secondary"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
