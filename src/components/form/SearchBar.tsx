import {
  setFocus,
  useFocusable,
} from "@noriginmedia/norigin-spatial-navigation";
import c from "classnames";
import { forwardRef, useEffect, useRef, useState } from "react";

import { Flare } from "@/components/utils/Flare";

import { Icon, Icons } from "../Icon";
import { TextInputControl } from "../text-inputs/TextInputControl";

export interface SearchBarProps {
  placeholder?: string;
  onChange: (value: string, force: boolean) => void;
  onUnFocus: (newSearch?: string) => void;
  value: string;
  isSticky?: boolean;
  isInFeatured?: boolean;
  hideTooltip?: boolean;
  autoFocus?: boolean;
}

export const SearchBarInput = forwardRef<HTMLInputElement, SearchBarProps>(
  (props, ref) => {
    const [focused, setFocused] = useState(false);
    const [lightTheme, setLightTheme] = useState(
      Boolean(props.isInFeatured) && window.scrollY < 600,
    );
    const [showTooltip, setShowTooltip] = useState(false);

    function setSearch(value: string) {
      props.onChange(value, true);
    }

    useEffect(() => {
      const handleScroll = () => {
        setLightTheme(Boolean(props.isInFeatured) && window.scrollY < 600);
      };
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, [props.isInFeatured]);

    const inputRef = useRef<HTMLInputElement>(null);

    const { ref: focusRef, focused: navFocused } = useFocusable({
      focusKey: "search-bar-input",
      onFocus: () => {
        inputRef.current?.focus();
      },
      onArrowPress: (direction) => {
        if (direction === "down") {
          const firstWatching = document.querySelector(
            '[data-focuskey^="watching-"]',
          );
          const firstBookmark = document.querySelector(
            '[data-focuskey^="bookmark-"]',
          );
          const firstDiscover = document.querySelector(
            '[data-focuskey^="discover-"]',
          );

          const firstAvailable =
            firstWatching || firstBookmark || firstDiscover;
          if (firstAvailable) {
            const focusKey = firstAvailable.getAttribute("data-focuskey");
            if (focusKey) {
              setFocus(focusKey);
              return false;
            }
          }
        }
        return true;
      },
    }) as {
      ref:
        | ((node: HTMLInputElement | null) => void)
        | React.RefObject<HTMLInputElement>;
      focused: boolean;
    };

    useEffect(() => {
      if (props.autoFocus) {
        setTimeout(() => {
          setFocus("search-bar-input");
        }, 300);
      }
    }, [props.autoFocus]);

    const mergedRef = (node: HTMLInputElement | null) => {
      (inputRef as any).current = node;

      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }

      if (typeof focusRef === "function") {
        focusRef(node);
      } else if (focusRef) {
        (focusRef as React.MutableRefObject<HTMLInputElement | null>).current =
          node;
      }
    };

    return (
      <div
        className={c({
          "hover:flare-enabled group flex flex-col rounded-[28px] transition-colors sm:flex-row sm:items-center relative backdrop-blur-sm border-themePreview-primary": true,
          "transition-colors duration-300": true,
          "bg-search-background/50": !focused && lightTheme,
          "bg-search-background":
            focused || props.isSticky || !props.isInFeatured,
          "border-2": navFocused,
        })}
      >
        <Flare.Light
          flareSize={400}
          enabled={focused}
          className="rounded-[28px]"
          backgroundClass={c({
            "transition-colors": true,
            "bg-search-background": !focused,
            "bg-search-focused": focused,
          })}
        />
        <Flare.Child className="flex flex-1 flex-col">
          <div
            className={c(
              "absolute bottom-0 left-5 top-0 flex max-h-14 items-center text-search-icon cursor-pointer z-10",
              "transition-colors duration-300",
              props.isInFeatured
                ? lightTheme
                  ? "text-white/50"
                  : ""
                : "text-search-icon",
            )}
            onClick={(e) => {
              e.preventDefault();
              setShowTooltip(!showTooltip);
              inputRef.current?.focus();
            }}
          >
            <Icon icon={Icons.SEARCH} />
          </div>

          <TextInputControl
            ref={mergedRef}
            onUnFocus={() => {
              setFocused(false);
              props.onUnFocus();
            }}
            onFocus={() => setFocused(true)}
            onChange={(val) => setSearch(val)}
            value={props.value}
            className={c(
              "w-full flex-1 bg-transparent px-4 py-4 pl-12 !text-search-text focus:outline-none sm:py-4 sm:pr-2 transition-colors duration-300",
              "transition-colors duration-300",
              props.isInFeatured
                ? lightTheme
                  ? "text-white/50"
                  : "placeholder-search-placeholder"
                : "placeholder-search-placeholder",
            )}
            placeholder={props.placeholder}
          />

          {showTooltip && !props.hideTooltip && (
            <div className="py-4">
              <p className="font-bold text-sm mb-1 text-search-text">Search:</p>
              <div className="space-y-1.5 text-xs text-search-text">
                <div>
                  <p className="mb-0.5">TMDB ID search:</p>
                  <p className="text-type-secondary italic pl-2">
                    tmdb:123456 - For movies
                  </p>
                  <p className="text-type-secondary italic pl-2">
                    tmdb:123456:tv - For TV shows
                  </p>
                </div>
              </div>
            </div>
          )}

          {props.value.length > 0 && (
            <div
              onClick={() => {
                props.onUnFocus("");
                inputRef.current?.focus();
              }}
              className="cursor-pointer hover:text-white absolute bottom-0 right-2 top-0 flex justify-center my-auto h-10 w-10 items-center hover:bg-search-hoverBackground active:scale-110 text-search-icon rounded-full transition-[transform,background-color] duration-200"
            >
              <Icon icon={Icons.X} className="transition-colors duration-200" />
            </div>
          )}
        </Flare.Child>
      </div>
    );
  },
);
