import {
  setFocus,
  useFocusable,
} from "@noriginmedia/norigin-spatial-navigation";
import classNames from "classnames";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAsync } from "react-use";

import { base64ToBuffer, decryptData } from "@/backend/accounts/crypto";
import { getBackendMeta } from "@/backend/accounts/meta";
import { getRoomStatuses } from "@/backend/player/status";
import { UserAvatar } from "@/components/Avatar";
import { Icon, Icons } from "@/components/Icon";
import { Spinner } from "@/components/layout/Spinner";
import { Transition } from "@/components/utils/Transition";
import { useAuth } from "@/hooks/auth/useAuth";
import { useBackendUrl } from "@/hooks/auth/useBackendUrl";
import { conf } from "@/setup/config";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";

function Divider() {
  return <hr className="border-0 w-full h-px bg-dropdown-border" />;
}

const GoToLink = forwardRef<
  any,
  {
    children: React.ReactNode;
    href?: string;
    className?: string;
    onClick?: () => void;
  }
>((props, ref) => {
  const navigate = useNavigate();

  const goTo = (href: string) => {
    if (href.startsWith("http")) {
      window.open(href, "_blank");
    } else {
      window.scrollTo(0, 0);
      navigate(href);
    }
  };

  return (
    <a
      ref={ref}
      tabIndex={0}
      href={props.href}
      onClick={(evt) => {
        evt.preventDefault();
        if (props.href) goTo(props.href);
        else props.onClick?.();
      }}
      className={props.className}
    >
      {props.children}
    </a>
  );
});

GoToLink.displayName = "GoToLink";

const DropdownLink = forwardRef<
  any,
  {
    children: React.ReactNode;
    href?: string;
    icon?: Icons;
    highlight?: boolean;
    className?: string;
    onClick?: () => void;
    focusKey?: string;
  }
>((props) => {
  const { ref, focused } = useFocusable({
    focusKey: props.focusKey,
    onEnterPress: () => {
      if (props.onClick) props.onClick();
      else if (props.href) {
        if (props.href.startsWith("http")) window.open(props.href, "_blank");
        else window.location.href = props.href;
      }
    },
    onFocus: () => {
      // Scroll element into view if it's out of viewport
      if (props.focusKey) {
        setTimeout(() => {
          const element = document.querySelector(
            `[data-focuskey="${props.focusKey}"]`,
          );
          if (element) {
            element.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
              inline: "nearest",
            });
          }
        }, 0);
      }
    },
  });

  return (
    <GoToLink
      onClick={props.onClick}
      href={props.href}
      className={classNames(
        "tabbable cursor-pointer flex gap-3 items-center m-3 p-1 rounded font-medium transition-colors duration-100 border-2",
        props.highlight
          ? "text-dropdown-highlight hover:text-dropdown-highlightHover"
          : "text-dropdown-text hover:text-white",
        props.className,
        focused
          ? "border-type-link ring-2 ring-type-link"
          : "border-transparent",
      )}
      ref={ref}
    >
      {props.icon ? <Icon icon={props.icon} className="text-xl" /> : null}
      {props.children}
    </GoToLink>
  );
});

DropdownLink.displayName = "DropdownLink";

const CircleDropdownLink = forwardRef<
  any,
  {
    icon: Icons;
    href: string;
    focusKey?: string;
  }
>((props) => {
  const { ref, focused } = useFocusable({
    focusKey: props.focusKey,
    onEnterPress: () => {
      if (props.href.startsWith("http")) window.open(props.href, "_blank");
      else window.location.href = props.href;
    },
    onFocus: () => {
      // Scroll element into view if it's out of viewport
      if (props.focusKey) {
        setTimeout(() => {
          const element = document.querySelector(
            `[data-focuskey="${props.focusKey}"]`,
          );
          if (element) {
            element.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
              inline: "nearest",
            });
          }
        }, 0);
      }
    },
  });

  return (
    <GoToLink
      href={props.href}
      onClick={() => window.scrollTo(0, 0)}
      className={classNames(
        "tabbable w-11 h-11 rounded-full bg-dropdown-contentBackground text-dropdown-text hover:text-white transition-colors duration-100 flex justify-center items-center border-2",
        focused
          ? "border-type-link ring-2 ring-type-link"
          : "border-transparent",
      )}
      ref={ref}
    >
      <Icon className="text-2xl" icon={props.icon} />
    </GoToLink>
  );
});

CircleDropdownLink.displayName = "CircleDropdownLink";

function WatchPartyInputLink({ focusKey }: { focusKey?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backendUrl = useBackendUrl();
  const account = useAuthStore((s) => s.account);

  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: () => {
      ref.current?.querySelector("input")?.focus();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !backendUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getRoomStatuses(
        backendUrl,
        account,
        code.trim().toUpperCase(),
      );
      const users = Object.values(response.users);

      if (users.length === 0) {
        setError(t("watchParty.emptyRoom"));
        return;
      }

      const hostUser = users.find((user) => user[0].isHost)?.[0];
      if (!hostUser) {
        setError(t("watchParty.noHost"));
        return;
      }

      const { content } = hostUser;

      let targetUrl = "";
      if (
        content.type.toLowerCase() === "tv show" &&
        content.seasonId &&
        content.episodeId
      ) {
        targetUrl = `/media/tmdb-tv-${content.tmdbId}/${content.seasonId}/${content.episodeId}`;
      } else {
        targetUrl = `/media/tmdb-movie-${content.tmdbId}`;
      }

      const url = new URL(targetUrl, window.location.origin);
      url.searchParams.set("watchparty", code.trim().toUpperCase());

      navigate(url.pathname + url.search);
      setCode("");
    } catch (err) {
      console.error("Failed to fetch room data:", err);
      setError(t("watchParty.invalidRoom"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      ref={ref}
      onSubmit={handleSubmit}
      className={classNames(
        "m-3 p-1 rounded font-medium transition-colors duration-100 group border-2",
        "text-dropdown-text hover:text-white",
        isFocused || focused
          ? "bg-dropdown-contentBackground border-type-link ring-2 ring-type-link"
          : "border-transparent",
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <Icon icon={Icons.WATCH_PARTY} className="text-xl" />
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={t("watchParty.joinParty")}
            className="bg-transparent border-none outline-none w-full text-base placeholder:text-dropdown-text group-hover:placeholder:text-white"
            maxLength={10}
            disabled={isLoading}
          />
          <button
            type="submit"
            className={classNames(
              "p-1 rounded hover:bg-dropdown-contentBackground transition-colors",
              isLoading && "opacity-50 cursor-not-allowed",
              !code.trim() && "opacity-0 pointer-events-none",
            )}
            disabled={!code.trim() || isLoading}
          >
            {isLoading ? (
              <Spinner className="w-5 h-5" />
            ) : (
              <Icon
                icon={Icons.ARROW_RIGHT}
                className="text-xl transition-opacity duration-200"
              />
            )}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 px-1 ml-8">{error}</p>}
      </div>
    </form>
  );
}

export function LinksDropdown(props: {
  children: React.ReactNode;
  focusKey?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const deviceName = useAuthStore((s) => s.account?.deviceName);
  const seed = useAuthStore((s) => s.account?.seed);
  const bufferSeed = useMemo(
    () => (seed ? base64ToBuffer(seed) : null),
    [seed],
  );
  const { logout } = useAuth();
  const backendUrl = useBackendUrl();
  const firstFocusKey = useRef<string | null | undefined>(null);

  const backendMeta = useAsync(async () => {
    if (!backendUrl) return;
    return getBackendMeta(backendUrl);
  }, [backendUrl]);

  const backendSupportsWatchParty = backendMeta?.value?.version
    ? backendMeta.value.version >= "2.0.1"
    : false;

  useEffect(() => {
    function onWindowClick(evt: MouseEvent) {
      if ((evt.target as HTMLElement).closest(".is-dropdown")) return;
      setOpen(false);
    }
    window.addEventListener("click", onWindowClick);
    return () => window.removeEventListener("click", onWindowClick);
  }, []);

  const enableLowPerformanceMode = usePreferencesStore(
    (s) => s.enableLowPerformanceMode,
  );

  const dropdownFocusKey = `${props.focusKey || "links-dropdown"}-content`;

  // Main dropdown trigger
  const { ref: triggerRef, focused: triggerFocused } = useFocusable({
    focusKey: props.focusKey || "links-dropdown",
    onEnterPress: () => {
      const newOpen = !open;
      setOpen(newOpen);
      if (newOpen && firstFocusKey.current) {
        // Focus first item when dropdown opens
        setTimeout(() => {
          setFocus(firstFocusKey.current!);
        }, 100);
      }
    },
  });

  // Track the first focusable item
  useEffect(() => {
    if (open && firstFocusKey.current) {
      setTimeout(() => {
        setFocus(firstFocusKey.current!);
      }, 100);
    }
  }, [open]);

  const dropdownItems = [
    deviceName && bufferSeed
      ? {
          key: "item-account",
          focusKey: `${dropdownFocusKey}-account`,
          element: (
            <DropdownLink
              focusKey={`${dropdownFocusKey}-account`}
              className="text-white"
              href="/settings"
            >
              <UserAvatar />
              {(() => {
                try {
                  return decryptData(deviceName, bufferSeed);
                } catch (error) {
                  console.warn(
                    "Failed to decrypt device name in LinksDropdown, using fallback:",
                    error,
                  );
                  return t("settings.account.unknownDevice");
                }
              })()}
            </DropdownLink>
          ),
        }
      : {
          key: "item-register",
          focusKey: `${dropdownFocusKey}-register`,
          element: (
            <DropdownLink
              focusKey={`${dropdownFocusKey}-register`}
              href="/login"
              icon={Icons.RISING_STAR}
              highlight
            >
              {t("navigation.menu.register")}
            </DropdownLink>
          ),
        },
    {
      key: "item-divider-1",
      element: <Divider />,
    },
    {
      key: "item-settings",
      focusKey: `${dropdownFocusKey}-settings`,
      element: (
        <DropdownLink
          focusKey={`${dropdownFocusKey}-settings`}
          href="/settings"
          icon={Icons.SETTINGS}
        >
          {t("navigation.menu.settings")}
        </DropdownLink>
      ),
    },
    {
      key: "item-history",
      focusKey: `${dropdownFocusKey}-history`,
      element: (
        <DropdownLink
          focusKey={`${dropdownFocusKey}-history`}
          href="/watch-history"
          icon={Icons.CLOCK}
        >
          {t("home.watchHistory.sectionTitle")}
        </DropdownLink>
      ),
    },
    process.env.NODE_ENV === "development"
      ? {
          key: "item-dev",
          focusKey: `${dropdownFocusKey}-dev`,
          element: (
            <DropdownLink
              focusKey={`${dropdownFocusKey}-dev`}
              href="/dev"
              icon={Icons.COMPRESS}
            >
              {t("navigation.menu.development")}
            </DropdownLink>
          ),
        }
      : null,
    {
      key: "item-about",
      focusKey: `${dropdownFocusKey}-about`,
      element: (
        <DropdownLink
          focusKey={`${dropdownFocusKey}-about`}
          href="/about"
          icon={Icons.CIRCLE_QUESTION}
        >
          {t("navigation.menu.about")}
        </DropdownLink>
      ),
    },
    !enableLowPerformanceMode
      ? {
          key: "item-discover",
          focusKey: `${dropdownFocusKey}-discover`,
          element: (
            <DropdownLink
              focusKey={`${dropdownFocusKey}-discover`}
              href="/discover"
              icon={Icons.RISING_STAR}
            >
              {t("navigation.menu.discover")}
            </DropdownLink>
          ),
        }
      : null,
    backendSupportsWatchParty
      ? {
          key: "item-watchparty",
          focusKey: `${dropdownFocusKey}-watchparty`,
          element: (
            <WatchPartyInputLink focusKey={`${dropdownFocusKey}-watchparty`} />
          ),
        }
      : null,
    deviceName
      ? {
          key: "item-logout",
          focusKey: `${dropdownFocusKey}-logout`,
          element: (
            <DropdownLink
              focusKey={`${dropdownFocusKey}-logout`}
              className="!text-type-danger opacity-75 hover:opacity-100"
              icon={Icons.LOGOUT}
              onClick={logout}
            >
              {t("navigation.menu.logout")}
            </DropdownLink>
          ),
        }
      : null,
    {
      key: "item-divider-2",
      element: <Divider />,
    },
    {
      key: "item-social",
      element: (
        <div className="my-4 flex justify-center items-center gap-4">
          {conf().GITHUB_LINK && (
            <CircleDropdownLink
              focusKey={`${dropdownFocusKey}-github`}
              href={conf().GITHUB_LINK}
              icon={Icons.GITHUB}
            />
          )}
          <CircleDropdownLink
            focusKey={`${dropdownFocusKey}-discord`}
            href={conf().DISCORD_LINK}
            icon={Icons.DISCORD}
          />
          <CircleDropdownLink
            focusKey={`${dropdownFocusKey}-support`}
            href="/support"
            icon={Icons.SUPPORT}
          />
          <CircleDropdownLink
            focusKey={`${dropdownFocusKey}-tipjar`}
            href="https://rentry.co/nnqtas3e"
            icon={Icons.TIP_JAR}
          />
        </div>
      ),
    },
  ].filter(Boolean);

  // Set the first focusable item's key
  useEffect(() => {
    const firstItem = dropdownItems.find((item) => item && "focusKey" in item);
    if (firstItem && "focusKey" in firstItem) {
      firstFocusKey.current = firstItem.focusKey;
    }
  }, [dropdownItems]);

  return (
    <div className="relative is-dropdown" data-links-dropdown>
      <div
        ref={triggerRef}
        className={classNames(
          "cursor-pointer tabbable rounded-full flex gap-2 text-white items-center py-2 px-3 bg-pill-background hover:bg-pill-backgroundHover backdrop-blur-lg transition-all duration-100 hover:scale-105",
          open ? "bg-opacity-100" : "bg-opacity-50",
          triggerFocused
            ? "ring-2 ring-type-link border-2 border-type-link"
            : "",
        )}
        tabIndex={0}
        onClick={() => setOpen((s) => !s)}
        onKeyUp={(evt) => evt.key === "Enter" && setOpen((s) => !s)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {props.children}
        <Icon
          className={classNames(
            "text-xl transition-transform duration-100",
            open ? "rotate-180" : "",
          )}
          icon={Icons.CHEVRON_DOWN}
        />
      </div>
      <Transition animation="slide-down" show={open}>
        <div className="rounded-xl absolute w-64 bg-dropdown-altBackground top-full mt-3 right-0 z-50">
          {dropdownItems.map((item) => (
            <div key={item!.key}>{item!.element}</div>
          ))}
        </div>
      </Transition>
    </div>
  );
}
