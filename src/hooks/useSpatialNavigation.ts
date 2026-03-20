import { useCallback } from "react";

export type NavigationDirection = "up" | "down" | "left" | "right";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function useSpatialNavigation() {
  const getFocusableElements = useCallback(() => {
    const all = Array.from(
      document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    return all.filter((el) => {
      const style = window.getComputedStyle(el);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        el.offsetWidth > 0 &&
        el.offsetHeight > 0 &&
        !(el as any).disabled
      );
    });
  }, []);

  const navigate = useCallback(
    (direction: NavigationDirection) => {
      const activeElement = document.activeElement as HTMLElement;
      if (!activeElement) return;

      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const currentRect = activeElement.getBoundingClientRect();
      const currentCenter = {
        x: currentRect.left + currentRect.width / 2,
        y: currentRect.top + currentRect.height / 2,
      };

      let bestElement: HTMLElement | null = null;
      let minDistance = Infinity;

      for (const el of elements) {
        if (el === activeElement) continue;
        if (!document.body.contains(el)) continue;

        const elRect = el.getBoundingClientRect();
        const elCenter = {
          x: elRect.left + elRect.width / 2,
          y: elRect.top + elRect.height / 2,
        };

        const dx = elCenter.x - currentCenter.x;
        const dy = elCenter.y - currentCenter.y;

        let isCorrectDirection = false;
        switch (direction) {
          case "up":
            isCorrectDirection = dy < 0 && Math.abs(dx) < Math.abs(dy) * 1.5;
            break;
          case "down":
            isCorrectDirection = dy > 0 && Math.abs(dx) < Math.abs(dy) * 1.5;
            break;
          case "left":
            isCorrectDirection = dx < 0 && Math.abs(dy) < Math.abs(dx) * 1.5;
            break;
          case "right":
            isCorrectDirection = dx > 0 && Math.abs(dy) < Math.abs(dx) * 1.5;
            break;
          default:
            break;
        }

        if (isCorrectDirection) {
          // Weighted distance: prioritize primary direction
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < minDistance) {
            minDistance = distance;
            bestElement = el;
          }
        }
      }

      if (bestElement) {
        try {
          bestElement.focus();
          bestElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
        } catch (err) {
          console.warn("[useSpatialNavigation] focus/scroll failed", err);
        }
      }
    },
    [getFocusableElements],
  );

  return { navigate };
}
