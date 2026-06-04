import { useCallback, useEffect } from "react";
import { IconPatch } from "@/components/buttons/IconPatch";
import { Icons } from "@/components/Icon";
import { useModal } from "@/components/overlays/Modal";
import { OverlayPortal } from "@/components/overlays/OverlayDisplay";
import { Flare } from "@/components/utils/Flare";

const MODAL_ID = "domain-change";

export function RevivalAnnouncementModal() {
  const modal = useModal(MODAL_ID);

  useEffect(() => {
    modal.show();
  }, [modal]);

  const handleClose = useCallback(() => {
    modal.hide();
  }, [modal]);

  return (
    <OverlayPortal darken close={handleClose} show={modal.isShown}>
      <div className="flex absolute inset-0 items-center justify-center p-4 overflow-hidden">
        <div className="overflow-y-auto max-h-[85vh] pointer-events-auto">
          <Flare.Base className="group rounded-3xl bg-background-main transition-colors duration-300 focus:relative focus:z-10 w-full max-w-lg p-6 bg-mediaCard-hoverBackground bg-opacity-60 backdrop-filter backdrop-blur-lg shadow-lg">
            <div className="overflow-y-auto overflow-x-hidden max-h-[85vh]">
              <Flare.Light
                flareSize={300}
                cssColorVar="--colors-mediaCard-hoverAccent"
                backgroundClass="bg-modal-background duration-100"
                className="rounded-3xl bg-background-main group-hover:opacity-100"
              />
              <Flare.Child className="pointer-events-auto relative">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">
                    ⚠️ Domain Change Notice
                  </h2>
                  <button
                    type="button"
                    className="text-type-secondary hover:text-white transition-transform hover:scale-95"
                    onClick={handleClose}
                  >
                    <IconPatch icon={Icons.X} />
                  </button>
                </div>
                <div className="space-y-4 text-base text-type-secondary">
                  <p className="text-white font-bold border-l-2 border-yellow-400 pl-3">
                    We're changing domains - IMPORTANT
                  </p>
                  <p>
                    Due to legal issues,{" "}
                    <strong className="text-white">pstream.net</strong> will be
                    going offline soon. The site may be temporarily unavailable
                    during the transition — this is expected.
                  </p>
                  <p>
                    Bookmark the link below to get the new domain as soon as
                    it's live:
                  </p>
                  <a
                    href="https://rentry.co/xpstream"
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-xl transition-colors"
                  >
                    📌 rentry.co/xpstream — Bookmark This!
                  </a>
                  <p className="text-sm text-type-secondary">
                    P-Stream will continue as normal on the new domain. See you
                    there.
                  </p>
                </div>
              </Flare.Child>
            </div>
          </Flare.Base>
        </div>
      </div>
    </OverlayPortal>
  );
}