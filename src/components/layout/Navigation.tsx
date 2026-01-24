import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { Link, To, useNavigate } from "react-router-dom";

import { NoUserAvatar, UserAvatar } from "@/components/Avatar";
import { IconPatch } from "@/components/buttons/IconPatch";
import { Icons } from "@/components/Icon";
import { LinksDropdown } from "@/components/LinksDropdown";
import { useNotifications } from "@/components/overlays/notificationsModal";
import { Lightbar } from "@/components/utils/Lightbar";
import { useAuth } from "@/hooks/auth/useAuth";
import { BlurEllipsis } from "@/pages/layouts/SubPageLayout";
import { conf } from "@/setup/config";
import { useBannerSize } from "@/stores/banner";
import { usePreferencesStore } from "@/stores/preferences";

import { BrandPill } from "./BrandPill";

export interface NavigationProps {
  bg?: boolean;
  noLightbar?: boolean;
  doBackground?: boolean;
  clearBackground?: boolean;
  focusKey?: string;
}

export function Navigation(props: NavigationProps) {
  const bannerHeight = useBannerSize();
  const navigate = useNavigate();
  const { loggedIn } = useAuth();
  const [scrollPosition, setScrollPosition] = useState(0);
  const { openNotifications, getUnreadCount } = useNotifications();

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = (path: To) => {
    window.scrollTo(0, 0);
    navigate(path);
  };

  const getMaskLength = () => {
    const maxScroll = 300;
    const minLength = 100;
    const maxLength = 180;
    const scrollFactor = Math.min(scrollPosition, maxScroll) / maxScroll;
    return minLength + (maxLength - minLength) * (1 - scrollFactor);
  };

  const enableLowPerformanceMode = usePreferencesStore(
    (s) => s.enableLowPerformanceMode,
  );

  const baseFocusKey = props.focusKey || "navigation";
  const hoveredClasses = "border-2 border-themePreview-primary transform";

  // CREATE A REF MAP for all focusable elements
  const elementRefs = {
    brand: useRef<HTMLDivElement>(null),
    discord: useRef<HTMLDivElement>(null),
    discover: useRef<HTMLDivElement>(null),
    search: useRef<HTMLDivElement>(null),
    notifications: useRef<HTMLDivElement>(null),
    profile: useRef<HTMLDivElement>(null),
  };

  const { ref: brandRef, focused: brandFocused } = useFocusable({
    focusKey: `${baseFocusKey}-brand`,
    onEnterPress: () => {
      window.scrollTo(0, 0);
      navigate("/");
    },
  });

  const { ref: discordRef, focused: discordFocused } = useFocusable({
    focusKey: `${baseFocusKey}-discord`,
    onEnterPress: () => window.open(conf().DISCORD_LINK, "_blank"),
  });

  const { ref: discoverRef, focused: discoverFocused } = useFocusable({
    focusKey: `${baseFocusKey}-discover`,
    onEnterPress: () => handleClick("/discover"),
  });

  const { ref: searchRef, focused: searchFocused } = useFocusable({
    focusKey: `${baseFocusKey}-search`,
    onEnterPress: () => handleClick("/"),
  });

  const { ref: notificationsRef, focused: notificationsFocused } = useFocusable(
    {
      focusKey: `${baseFocusKey}-notifications`,
      onEnterPress: () => openNotifications(),
    },
  );

  const { ref: profileRef, focused: profileFocused } = useFocusable({
    focusKey: `${baseFocusKey}-profile`,
    onEnterPress: () => {
      const dropdown = document.querySelector(
        "[data-links-dropdown]",
      ) as HTMLElement;
      dropdown?.click();
    },
  });

  const mergeRefs =
    (elementRef: any, focusRef: any) => (node: HTMLDivElement | null) => {
      if (elementRef) {
        elementRef.current = node;
      }
      if (focusRef) {
        if (typeof focusRef === "function") {
          focusRef(node);
        } else if (focusRef.current !== undefined) {
          focusRef.current = node;
        }
      }
    };

  return (
    <>
      {!props.noLightbar ? (
        <div
          className="absolute inset-x-0 top-0 flex h-[88px] items-center justify-center"
          style={{
            top: `${bannerHeight}px`,
          }}
        >
          <div className="absolute inset-x-0 -mt-[22%] flex items-center sm:mt-0">
            <Lightbar noParticles={enableLowPerformanceMode} />
          </div>
        </div>
      ) : null}

      <div
        className="top-content fixed z-[20] pointer-events-none left-0 right-0 top-0 min-h-[150px]"
        style={{
          top: `${bannerHeight}px`,
        }}
      >
        <div
          className={classNames(
            "fixed left-0 right-0 top-0 flex items-center",
            "transition-[background-color,backdrop-filter] duration-300 ease-in-out",
            props.doBackground
              ? props.clearBackground
                ? "backdrop-blur-md bg-transparent"
                : "bg-background-main"
              : "bg-transparent",
          )}
        >
          {props.doBackground ? (
            <div className="absolute w-full h-full inset-0 overflow-hidden">
              <BlurEllipsis positionClass="absolute" />
            </div>
          ) : null}
          <div className="opacity-0 absolute inset-0 block h-20 pointer-events-auto" />
          <div
            className={classNames(
              "transition-[background-color,backdrop-filter,opacity] duration-300 ease-in-out",
              props.bg ? "opacity-100" : "opacity-0",
              "absolute inset-0 block h-[11rem]",
              props.clearBackground
                ? "backdrop-blur-md bg-transparent"
                : "bg-background-main",
            )}
            style={{
              maskImage: `linear-gradient(
                to bottom,
                rgba(0, 0, 0, 1),
                rgba(0, 0, 0, 1) calc(100% - ${getMaskLength()}px),
                rgba(0, 0, 0, 0) 100%
              )`,
              WebkitMaskImage: `linear-gradient(
                to bottom,
                rgba(0, 0, 0, 1),
                rgba(0, 0, 0, 1) calc(100% - ${getMaskLength()}px),
                rgba(0, 0, 0, 0) 100%
              )`,
            }}
          />
        </div>
      </div>

      <div
        className="top-content fixed pointer-events-none left-0 right-0 z-[500] top-0 min-h-[150px]"
        style={{
          top: `${bannerHeight}px`,
        }}
      >
        <div className={classNames("fixed left-0 right-0 flex items-center")}>
          <div className="px-7 py-5 relative z-[60] flex flex-1 items-center justify-between">
            <div className="flex items-center space-x-1.5 ssm:space-x-3 pointer-events-auto">
              {/* BRAND */}
              <div
                ref={mergeRefs(elementRefs.brand, brandRef)}
                className={classNames(
                  "block rounded-full text-xs ssm:text-base transition-all",
                  brandFocused ? hoveredClasses : "border-transparent",
                )}
                style={{
                  transition: "all 0.2s ease",
                  boxShadow: brandFocused
                    ? "0 0 20px rgba(var(--themePreview-primary-rgb), 0.5)"
                    : "none",
                }}
              >
                <Link
                  to="/"
                  onClick={() => window.scrollTo(0, 0)}
                  className={classNames("block p-1 rounded-full")}
                >
                  <BrandPill clickable header />
                </Link>
              </div>

              {/* DISCORD */}
              <div
                ref={mergeRefs(elementRefs.discord, discordRef)}
                className={classNames(
                  "text-xl rounded-full backdrop-blur-lg transition-all",
                  discordFocused ? hoveredClasses : "border-transparent",
                )}
                style={{
                  transition: "all 0.2s ease",
                  boxShadow: discordFocused
                    ? "0 0 20px rgba(var(--themePreview-primary-rgb), 0.5)"
                    : "none",
                }}
              >
                <a
                  href={conf().DISCORD_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-2 rounded-full"
                >
                  <IconPatch
                    icon={Icons.DISCORD}
                    clickable
                    downsized
                    navigation
                  />
                </a>
              </div>

              {/* DISCOVER/SEARCH TOGGLE */}
              {!enableLowPerformanceMode && (
                <>
                  <div
                    ref={mergeRefs(elementRefs.discover, discoverRef)}
                    className={classNames(
                      "text-xl rounded-full backdrop-blur-lg transition-all",
                      window.location.pathname !== "/discover" ? "" : "hidden",
                      discoverFocused ? hoveredClasses : "border-transparent",
                    )}
                    style={{
                      transition: "all 0.2s ease",
                      boxShadow: discoverFocused
                        ? "0 0 20px rgba(var(--themePreview-primary-rgb), 0.5)"
                        : "none",
                    }}
                  >
                    <a
                      onClick={() => handleClick("/discover")}
                      className="block p-2 rounded-full"
                    >
                      <IconPatch
                        icon={Icons.RISING_STAR}
                        clickable
                        downsized
                        navigation
                      />
                    </a>
                  </div>

                  <div
                    ref={mergeRefs(elementRefs.search, searchRef)}
                    className={classNames(
                      "text-lg rounded-full backdrop-blur-lg transition-all",
                      window.location.pathname === "/discover" ? "" : "hidden",
                      searchFocused ? hoveredClasses : "border-transparent",
                    )}
                    style={{
                      transition: "all 0.2s ease",
                      boxShadow: searchFocused
                        ? "0 0 20px rgba(var(--themePreview-primary-rgb), 0.5)"
                        : "none",
                    }}
                  >
                    <a
                      onClick={() => handleClick("/")}
                      className="block p-2 rounded-full"
                    >
                      <IconPatch
                        icon={Icons.SEARCH}
                        clickable
                        downsized
                        navigation
                      />
                    </a>
                  </div>
                </>
              )}

              <div
                ref={mergeRefs(elementRefs.notifications, notificationsRef)}
                className={classNames(
                  "text-xl rounded-full backdrop-blur-lg relative transition-all",
                  notificationsFocused ? hoveredClasses : "border-transparent",
                )}
                style={{
                  transition: "all 0.2s ease",
                  boxShadow: notificationsFocused
                    ? "0 0 20px rgba(var(--themePreview-primary-rgb), 0.5)"
                    : "none",
                }}
              >
                <a
                  onClick={() => openNotifications()}
                  className="block p-2 rounded-full"
                >
                  <IconPatch icon={Icons.BELL} clickable downsized navigation />
                  {(() => {
                    const count = getUnreadCount();
                    const shouldShow =
                      typeof count === "number" ? count > 0 : count === "99+";
                    return shouldShow ? (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                        {count}
                      </span>
                    ) : null;
                  })()}
                </a>
              </div>
            </div>

            <div
              ref={mergeRefs(elementRefs.profile, profileRef)}
              className={classNames(
                "relative pointer-events-auto transition-all",
                profileFocused ? hoveredClasses : "border-transparent",
              )}
              style={{
                transition: "all 0.2s ease",
                boxShadow: profileFocused
                  ? "0 0 20px rgba(var(--themePreview-primary-rgb), 0.5)"
                  : "none",
              }}
            >
              <LinksDropdown focusKey={`${baseFocusKey}-profile-dropdown`}>
                {loggedIn ? <UserAvatar withName /> : <NoUserAvatar />}
              </LinksDropdown>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
