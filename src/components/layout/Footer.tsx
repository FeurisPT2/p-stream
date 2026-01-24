import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { RequireExactlyOne } from "type-fest";

import { Icon, Icons } from "@/components/Icon";
import { BrandPill } from "@/components/layout/BrandPill";
import { WideContainer } from "@/components/layout/WideContainer";
import { shouldHaveLegalPage } from "@/pages/Legal";
import { conf } from "@/setup/config";

// to and href are mutually exclusive
type FooterLinkProps = RequireExactlyOne<
  {
    children: React.ReactNode;
    icon: Icons;
    to: string;
    href: string;
    focusKey: string;
  },
  "to" | "href"
>;

function FooterLink(props: FooterLinkProps) {
  const navigate = useNavigate();

  const navigateTo = useCallback(() => {
    if (!props.to) return;

    navigate(props.to);
  }, [navigate, props.to]);

  const { ref, focused } = useFocusable({
    focusKey: props.focusKey,
    onEnterPress: () => {
      if (props.to) {
        navigateTo();
      } else if (props.href) {
        window.open(props.href, "_blank");
      }
    },
    onFocus: () => {
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
    },
  });

  return (
    <a
      ref={ref}
      href={props.href}
      target={props.href ? "_blank" : undefined}
      rel="noreferrer"
      className={`tabbable rounded py-2 px-3 inline-flex cursor-pointer items-center space-x-3 transition-colors duration-200 hover:text-type-emphasis border-2 ${
        focused ? "border-type-link" : "border-transparent"
      }`}
      onClick={props.to ? navigateTo : undefined}
      data-focuskey={props.focusKey}
    >
      <Icon icon={props.icon} className="text-2xl" />
      <span className="font-medium">{props.children}</span>
    </a>
  );
}

function Legal() {
  const { t } = useTranslation();

  if (!shouldHaveLegalPage()) return null;
  if (window.location.hash === "#/legal") return null;

  return (
    <FooterLink to="/legal" icon={Icons.DRAGON} focusKey="footer-legal">
      {t("footer.links.legal")}
    </FooterLink>
  );
}

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-16 border-t border-type-divider py-16 md:py-8">
      <WideContainer ultraWide classNames="grid md:grid-cols-2 gap-16 md:gap-8">
        <div>
          <div className="inline-block">
            <BrandPill />
          </div>
          <p className="mt-4 lg:max-w-[400px]">{t("footer.tagline")}</p>
        </div>
        <div className="md:text-right">
          <h3 className="font-semibold text-type-emphasis">
            {t("footer.legal.disclaimer")}
          </h3>
          <p className="mt-3">{t("footer.legal.disclaimerText")}</p>
        </div>
        <div className="flex flex-wrap gap-[0.5rem] -ml-3">
          {conf().GITHUB_LINK && (
            <FooterLink
              icon={Icons.GITHUB}
              href={conf().GITHUB_LINK}
              focusKey="footer-github"
            >
              {t("footer.links.github")}
            </FooterLink>
          )}
          <FooterLink
            icon={Icons.DISCORD}
            href={conf().DISCORD_LINK}
            focusKey="footer-discord"
          >
            {t("footer.links.discord")}
          </FooterLink>
          <FooterLink
            href="https://rentry.co/nnqtas3e"
            icon={Icons.TIP_JAR}
            focusKey="footer-funding"
          >
            {t("footer.links.funding")}
          </FooterLink>
          <div className="inline md:hidden">
            <Legal />
          </div>
        </div>
        <div className="hidden items-center justify-end md:flex -mr-3">
          <Legal />
        </div>
      </WideContainer>
    </footer>
  );
}

export function FooterView(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={["flex min-h-screen flex-col", props.className || ""].join(
        " ",
      )}
    >
      <div style={{ flex: "1 0 auto" }}>{props.children}</div>
      <Footer />
    </div>
  );
}
