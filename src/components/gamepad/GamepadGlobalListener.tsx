import { useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useGamepadPolling } from "@/hooks/useGamepad";
import { useSpatialNavigation } from "@/hooks/useSpatialNavigation";
import { usePreferencesStore } from "@/stores/preferences";

export function GamepadGlobalListener() {
  const { navigate: navigateSpatial } = useSpatialNavigation();
  const location = useLocation();
  const enableGamepadControls = usePreferencesStore(
    (s) => s.enableGamepadControls,
  );

  const gamepadInputMode = usePreferencesStore((s) => s.gamepadInputMode);

  const handleAction = useCallback(
    (action: string) => {
      if (gamepadInputMode === "kbm") return;

      // Add gamepad-active class to body to show custom focus outlines
      document.body.classList.add("gamepad-active");

      // Don't intercept if we're in the player (it has its own listener)
      if (location.pathname.startsWith("/media/")) return;

      switch (action) {
        case "navigate-up":
          navigateSpatial("up");
          break;
        case "navigate-down":
          navigateSpatial("down");
          break;
        case "navigate-left":
          navigateSpatial("left");
          break;
        case "navigate-right":
          navigateSpatial("right");
          break;
        case "confirm":
          (document.activeElement as HTMLElement)?.click();
          break;
        case "back":
          window.history.back();
          break;
        default:
          break;
      }
    },
    [navigateSpatial, location.pathname, gamepadInputMode],
  );

  useGamepadPolling({
    onAction: handleAction,
    enabled: enableGamepadControls,
  });

  // Remove gamepad-active class on mouse move (optional, but nice for hybrid use)
  useEffect(() => {
    const handleMouseMove = () => {
      document.body.classList.remove("gamepad-active");
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return null;
}
