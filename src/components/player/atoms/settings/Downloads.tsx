import { useCallback, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useCopyToClipboard } from "react-use";

import { downloadCaption } from "@/backend/helpers/subs";
import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { OverlayPage } from "@/components/overlays/OverlayPage";
import { Menu } from "@/components/player/internals/ContextMenu";
import { convertSubtitlesToSrtDataurl } from "@/components/player/utils/captions";
import { useIsDesktopApp } from "@/hooks/useIsDesktopApp";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { usePlayerStore } from "@/stores/player/store";

export function useDownloadLink() {
  const source = usePlayerStore((s) => s.source);
  const currentQuality = usePlayerStore((s) => s.currentQuality);
  const url = useMemo(() => {
    if (source?.type === "file") {
      const quality = currentQuality
        ? source.qualities[currentQuality]
        : undefined;
      if (quality) return quality.url;
      const firstQuality = Object.values(source.qualities)[0];
      return firstQuality?.url;
    }
    if (source?.type === "hls") return source.url;
    return undefined;
  }, [source, currentQuality]);
  return url;
}

function StyleTrans(props: { k: string }) {
  return (
    <Trans
      i18nKey={props.k}
      components={{
        bold: <Menu.Highlight />,
        br: <br />,
        ios_share: (
          <Icon icon={Icons.IOS_SHARE} className="inline-block text-xl -mb-1" />
        ),
        ios_files: (
          <Icon icon={Icons.IOS_FILES} className="inline-block text-xl -mb-1" />
        ),
      }}
    />
  );
}

function OriginalFileView({ id }: { id: string }) {
  const router = useOverlayRouter(id);
  const { t } = useTranslation();
  const selectedCaption = usePlayerStore((s) => s.caption?.selected);

  const openSubtitleDownload = useCallback(() => {
    const dataUrl = selectedCaption
      ? convertSubtitlesToSrtDataurl(selectedCaption?.srtData)
      : null;
    if (!dataUrl) return;
    window.open(dataUrl);
  }, [selectedCaption]);

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/download")}>
        {t("player.menus.downloads.original.cardTitle")}
      </Menu.BackLink>
      <Menu.Section>
        <Menu.Paragraph marginClass="mb-6">
          {t("player.menus.downloads.original.description")}
        </Menu.Paragraph>
        <Button className="w-full" theme="purple" disabled>
          {t("player.menus.downloads.original.downloadButton")}
        </Button>
        <Button
          className="w-full mt-2"
          onClick={openSubtitleDownload}
          disabled={!selectedCaption}
          theme="secondary"
        >
          {t("player.menus.downloads.downloadSubtitle")}
        </Button>
      </Menu.Section>
    </>
  );
}

function StreamLinkView({ id }: { id: string }) {
  const router = useOverlayRouter(id);
  const { t } = useTranslation();
  const downloadUrl = useDownloadLink();
  const [, copyToClipboard] = useCopyToClipboard();
  const selectedCaption = usePlayerStore((s) => s.caption?.selected);

  const openSubtitleDownload = useCallback(() => {
    const dataUrl = selectedCaption
      ? convertSubtitlesToSrtDataurl(selectedCaption?.srtData)
      : null;
    if (!dataUrl) return;
    window.open(dataUrl);
  }, [selectedCaption]);

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/download")}>
        {t("player.menus.downloads.stream.cardTitle")}
      </Menu.BackLink>
      <Menu.Section>
        <Button
          className="w-full"
          theme="purple"
          onClick={(event) => {
            event.preventDefault();
            copyToClipboard(downloadUrl ?? "");
          }}
        >
          {t("player.menus.downloads.copyHlsPlaylist")}
        </Button>
        <Button
          className="w-full mt-2"
          onClick={openSubtitleDownload}
          disabled={!selectedCaption}
          theme="secondary"
        >
          {t("player.menus.downloads.downloadSubtitle")}
        </Button>

        <Menu.Divider />

        <Menu.ChevronLink onClick={() => router.navigate("/download/pc")}>
          {t("player.menus.downloads.onPc.title")}
        </Menu.ChevronLink>
        <Menu.ChevronLink onClick={() => router.navigate("/download/ios")}>
          {t("player.menus.downloads.onIos.title")}
        </Menu.ChevronLink>
        <Menu.ChevronLink onClick={() => router.navigate("/download/android")}>
          {t("player.menus.downloads.onAndroid.title")}
        </Menu.ChevronLink>
      </Menu.Section>
    </>
  );
}

function DesktopDownloadView({ id }: { id: string }) {
  const router = useOverlayRouter(id);
  const { t } = useTranslation();
  const downloadUrl = useDownloadLink();
  const meta = usePlayerStore((s) => s.meta);
  const selectedCaption = usePlayerStore((s) => s.caption?.selected);
  const captionList = usePlayerStore((s) => s.captionList);
  const duration = usePlayerStore((s) => s.progress.duration);
  const source = usePlayerStore((s) => s.source);
  const sourceType = usePlayerStore((s) => s.source?.type);

  const startOfflineDownload = useCallback(async () => {
    if (!downloadUrl) return;
    const title = meta?.title ? meta.title : t("player.menus.downloads.title");
    const poster = meta?.poster;
    let subtitleText: string | undefined;

    if (selectedCaption?.srtData) {
      subtitleText = selectedCaption.srtData;
    } else if (captionList.length > 0) {
      const defaultCaption =
        captionList.find((c) => c.language === "en") ?? captionList[0];
      try {
        subtitleText = await downloadCaption(defaultCaption);
      } catch {
        // Continue without subtitles if fetch fails
      }
    }

    const headers = {
      ...(source?.headers ?? {}),
      ...(source?.preferredHeaders ?? {}),
    };

    window.desktopApi?.startDownload({
      url: downloadUrl,
      title,
      poster,
      subtitleText,
      duration,
      type: sourceType,
      headers,
    });

    if (window.desktopApi?.openOffline) {
      window.desktopApi.openOffline();
    } else {
      router.navigate("/");
    }
  }, [
    downloadUrl,
    meta,
    selectedCaption,
    captionList,
    duration,
    router,
    source,
    sourceType,
    t,
  ]);

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/")}>
        {t("player.menus.downloads.title")}
      </Menu.BackLink>
      <Menu.Section>
        <Menu.Paragraph marginClass="mb-6">
          <Trans i18nKey="player.menus.downloads.desktopDisclaimer" />
        </Menu.Paragraph>
        <Button className="w-full" theme="purple" onClick={startOfflineDownload}>
          {t("player.menus.downloads.offlineButton")}
        </Button>
      </Menu.Section>
    </>
  );
}

export function DownloadView({ id }: { id: string }) {
  const isDesktopApp = useIsDesktopApp();
  const router = useOverlayRouter(id);
  const { t } = useTranslation();

  if (isDesktopApp) {
    return <DesktopDownloadView id={id} />;
  }

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/")}>
        {t("player.menus.downloads.title")}
      </Menu.BackLink>
      <Menu.Section>
        <div className="flex flex-col gap-3 mt-2">
          <button
            type="button"
            className="w-full rounded-lg bg-video-context-light/10 hover:bg-video-context-light/20 transition-colors p-4 text-left cursor-pointer"
            onClick={() => router.navigate("/download/original")}
          >
            <div className="flex items-center gap-3">
              <Icon
                icon={Icons.FILE_ARROW_DOWN}
                className="text-2xl text-video-context-type-accent"
              />
              <div>
                <p className="text-sm font-medium text-video-context-type-main">
                  {t("player.menus.downloads.original.cardTitle")}
                </p>
                <p className="text-xs text-video-context-type-secondary mt-0.5">
                  {t("player.menus.downloads.original.cardDesc")}
                </p>
              </div>
            </div>
          </button>

          <div className="flex items-center gap-3 px-2">
            <div className="flex-1 h-px bg-video-context-border" />
            <span className="text-xs text-video-context-type-secondary uppercase">
              {t("player.menus.downloads.or")}
            </span>
            <div className="flex-1 h-px bg-video-context-border" />
          </div>

          <button
            type="button"
            className="w-full rounded-lg bg-video-context-light/10 hover:bg-video-context-light/20 transition-colors p-4 text-left cursor-pointer"
            onClick={() => router.navigate("/download/stream")}
          >
            <div className="flex items-center gap-3">
              <Icon
                icon={Icons.LINK}
                className="text-2xl text-video-context-type-accent"
              />
              <div>
                <p className="text-sm font-medium text-video-context-type-main">
                  {t("player.menus.downloads.stream.cardTitle")}
                </p>
                <p className="text-xs text-video-context-type-secondary mt-0.5">
                  {t("player.menus.downloads.stream.cardDesc")}
                </p>
              </div>
            </div>
          </button>
        </div>
      </Menu.Section>
    </>
  );
}

function AndroidExplanationView({ id }: { id: string }) {
  const router = useOverlayRouter(id);
  const { t } = useTranslation();

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/download/stream")}>
        {t("player.menus.downloads.onAndroid.shortTitle")}
      </Menu.BackLink>
      <Menu.Section>
        <Menu.Paragraph>
          <StyleTrans k="player.menus.downloads.onAndroid.1" />
        </Menu.Paragraph>
      </Menu.Section>
    </>
  );
}

function PCExplanationView({ id }: { id: string }) {
  const router = useOverlayRouter(id);
  const { t } = useTranslation();

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/download/stream")}>
        {t("player.menus.downloads.onPc.shortTitle")}
      </Menu.BackLink>
      <Menu.Section>
        <Menu.Paragraph>
          <StyleTrans k="player.menus.downloads.onPc.1" />
        </Menu.Paragraph>
      </Menu.Section>
    </>
  );
}

function IOSExplanationView({ id }: { id: string }) {
  const router = useOverlayRouter(id);

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/download/stream")}>
        <StyleTrans k="player.menus.downloads.onIos.shortTitle" />
      </Menu.BackLink>
      <Menu.Section>
        <Menu.Paragraph>
          <StyleTrans k="player.menus.downloads.onIos.1" />
        </Menu.Paragraph>
      </Menu.Section>
    </>
  );
}

export function DownloadRoutes({ id }: { id: string }) {
  return (
    <>
      <OverlayPage id={id} path="/download" width={343} height={320}>
        <Menu.CardWithScrollable>
          <DownloadView id={id} />
        </Menu.CardWithScrollable>
      </OverlayPage>
      <OverlayPage id={id} path="/download/original" width={343} height={340}>
        <Menu.CardWithScrollable>
          <OriginalFileView id={id} />
        </Menu.CardWithScrollable>
      </OverlayPage>
      <OverlayPage id={id} path="/download/stream" width={343} height={440}>
        <Menu.CardWithScrollable>
          <StreamLinkView id={id} />
        </Menu.CardWithScrollable>
      </OverlayPage>
      <OverlayPage id={id} path="/download/ios" width={343} height={440}>
        <Menu.CardWithScrollable>
          <IOSExplanationView id={id} />
        </Menu.CardWithScrollable>
      </OverlayPage>
      <OverlayPage id={id} path="/download/android" width={343} height={440}>
        <Menu.CardWithScrollable>
          <AndroidExplanationView id={id} />
        </Menu.CardWithScrollable>
      </OverlayPage>
      <OverlayPage id={id} path="/download/pc" width={343} height={440}>
        <Menu.CardWithScrollable>
          <PCExplanationView id={id} />
        </Menu.CardWithScrollable>
      </OverlayPage>
    </>
  );
}
