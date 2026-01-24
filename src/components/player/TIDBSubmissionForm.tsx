import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { Dropdown } from "@/components/form/Dropdown";
import { Modal, ModalCard, useModal } from "@/components/overlays/Modal";
import { SegmentData } from "@/components/player/hooks/useSkipTime";
import { AuthInputBox } from "@/components/text-inputs/AuthInputBox";
import { Heading3, Paragraph } from "@/components/utils/Text";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { submitIntro } from "@/utils/tidb";

type SegmentType = "intro" | "recap" | "credits";

// Helper function to parse time format (hh:mm:ss, mm:ss, or seconds)
// Returns null if empty string, NaN if invalid, or number if valid
function parseTimeToSeconds(timeStr: string): number | null {
  if (!timeStr.trim()) return null;

  // Check if it's in hh:mm:ss format
  const hhmmssMatch = timeStr.match(/^(\d{1,2}):([0-5]?\d):([0-5]?\d)$/);
  if (hhmmssMatch) {
    const hours = parseInt(hhmmssMatch[1], 10);
    const minutes = parseInt(hhmmssMatch[2], 10);
    const seconds = parseInt(hhmmssMatch[3], 10);

    // Validate reasonable bounds (max 99 hours, minutes/seconds 0-59)
    if (hours > 99 || minutes > 59 || seconds > 59) {
      return NaN; // Invalid format
    }

    return hours * 3600 + minutes * 60 + seconds;
  }

  // Check if it's in mm:ss format
  const mmssMatch = timeStr.match(/^(\d{1,3}):([0-5]?\d)$/);
  if (mmssMatch) {
    const minutes = parseInt(mmssMatch[1], 10);
    const seconds = parseInt(mmssMatch[2], 10);

    // Validate reasonable bounds (max 999 minutes, seconds 0-59)
    if (minutes > 999 || seconds > 59) {
      return NaN; // Invalid format
    }

    return minutes * 60 + seconds;
  }

  // Otherwise, treat as plain seconds (but only if no colons in input)
  if (timeStr.includes(":")) {
    return NaN; // Invalid time format - has colons but didn't match time patterns
  }
  const parsed = parseFloat(timeStr);
  if (
    Number.isNaN(parsed) ||
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > 20000000
  ) {
    return NaN; // Invalid input
  }

  return parsed;
}

interface TIDBSubmissionFormProps {
  segment: SegmentData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TIDBSubmissionForm({
  segment,
  onSuccess,
  onCancel,
}: TIDBSubmissionFormProps) {
  const { t } = useTranslation();
  const meta = usePlayerStore((s) => s.meta);
  const tidbKey = usePreferencesStore((s) => s.tidbKey);
  const submissionModal = useModal("tidb-submission");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    segment: SegmentType;
    start: string;
    end: string;
  }>({
    segment: segment.type as SegmentType,
    start: "",
    end: "",
  });

  // Pre-fill the form with current segment data
  useEffect(() => {
    if (segment) {
      setFormData({
        segment: segment.type as SegmentType,
        start: segment.start_ms ? (segment.start_ms / 1000).toString() : "",
        end: segment.end_ms ? (segment.end_ms / 1000).toString() : "",
      });
    }
  }, [segment]);

  // Show modal when component mounts
  useEffect(() => {
    submissionModal.show();
  }, [submissionModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if form is valid
    if (!formData.segment) {
      // eslint-disable-next-line no-alert
      alert(t("player.skipTime.feedback.modal.error.segment"));
      return;
    }

    if (!tidbKey) {
      // eslint-disable-next-line no-alert
      alert(t("player.skipTime.feedback.modal.error.tidbKey"));
      return;
    }
    if (!meta) {
      // eslint-disable-next-line no-alert
      alert(t("player.skipTime.feedback.modal.error.mediaInfo"));
      return;
    }
    setIsSubmitting(true);
    try {
      const startSeconds = parseTimeToSeconds(formData.start);
      const endSeconds = parseTimeToSeconds(formData.end);

      // Basic validation
      if (formData.segment === "intro" || formData.segment === "recap") {
        if (endSeconds === null || Number.isNaN(endSeconds)) {
          // eslint-disable-next-line no-alert
          alert(t("player.skipTime.feedback.modal.error.endTime"));
          setIsSubmitting(false);
          return;
        }
      } else if (formData.segment === "credits") {
        if (startSeconds === null || Number.isNaN(startSeconds)) {
          // eslint-disable-next-line no-alert
          alert(t("player.skipTime.feedback.modal.error.startTime"));
          setIsSubmitting(false);
          return;
        }
      }

      // Prepare submission data
      const submissionData: any = {
        tmdb_id: parseInt(meta.tmdbId.toString(), 10),
        type: meta.type === "show" ? "tv" : "movie",
        segment: formData.segment,
      };

      // Add season/episode for TV shows
      if (meta.type === "show" && meta.season && meta.episode) {
        submissionData.season = meta.season.number;
        submissionData.episode = meta.episode.number;
      }

      // Set start_sec and end_sec based on segment type
      if (formData.segment === "intro" || formData.segment === "recap") {
        submissionData.start_sec = startSeconds !== null ? startSeconds : null;
        submissionData.end_sec = endSeconds!;
      } else if (formData.segment === "credits") {
        submissionData.start_sec = startSeconds!;
        submissionData.end_sec = endSeconds !== null ? endSeconds : null;
      }

      await submitIntro(submissionData, tidbKey);

      // Success
      submissionModal.hide();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error submitting:", error);
      // eslint-disable-next-line no-alert
      alert(
        `${t("player.skipTime.feedback.modal.error.submission")}: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal id={submissionModal.id}>
      <div className="w-full max-w-[30rem] m-4 px-4">
        <div className="w-full bg-modal-background rounded-xl p-8 pointer-events-auto max-h-[90vh] md:max-h-[80vh] overflow-y-auto">
          <Heading3 className="!mt-0 !mb-4">
            {t("player.skipTime.feedback.modal.title")}
          </Heading3>
          <Paragraph className="!mt-1 !mb-6">
            {t("player.skipTime.feedback.modal.description")}
          </Paragraph>

          <div className="space-y-4 mt-4 pb-4">
            {/* Section: Segment timestamps */}
            <div>
              <label
                htmlFor="segment"
                className="block text-sm font-medium text-white mb-1"
              >
                {t("player.skipTime.feedback.modal.segmentType")}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <Dropdown
                options={[
                  {
                    id: "intro",
                    name: t("player.skipTime.feedback.modal.types.intro"),
                  },
                  {
                    id: "recap",
                    name: t("player.skipTime.feedback.modal.types.recap"),
                  },
                  {
                    id: "credits",
                    name: t("player.skipTime.feedback.modal.types.credits"),
                  },
                ]}
                selectedItem={{
                  id: formData.segment,
                  name:
                    formData.segment === "intro"
                      ? t("player.skipTime.feedback.modal.types.intro")
                      : formData.segment === "recap"
                        ? t("player.skipTime.feedback.modal.types.recap")
                        : t("player.skipTime.feedback.modal.types.credits"),
                }}
                setSelectedItem={(item) =>
                  setFormData({ ...formData, segment: item.id as SegmentType })
                }
              />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="start"
                    className="block text-sm font-medium text-white mb-1"
                  >
                    {t("player.skipTime.feedback.modal.startTimeLabel")}
                    {formData.segment === "credits" ? (
                      <span className="text-red-500 ml-1">*</span>
                    ) : null}
                  </label>
                  <AuthInputBox
                    value={formData.start}
                    onChange={(value) =>
                      setFormData({ ...formData, start: value })
                    }
                    placeholder={t(
                      `player.skipTime.feedback.modal.placeholders.start.${formData.segment}`,
                    )}
                  />
                </div>
                <div>
                  <label
                    htmlFor="end"
                    className="block text-sm font-medium text-white mb-1"
                  >
                    {t("player.skipTime.feedback.modal.endTimeLabel")}
                    {formData.segment === "intro" ||
                    formData.segment === "recap" ? (
                      <span className="text-red-500 ml-1">*</span>
                    ) : null}
                  </label>
                  <AuthInputBox
                    value={formData.end}
                    onChange={(value) =>
                      setFormData({ ...formData, end: value })
                    }
                    placeholder={t(
                      `player.skipTime.feedback.modal.placeholders.end.${formData.segment}`,
                    )}
                  />
                </div>
              </div>

              {/* Timing Guidance Section */}
              <div className="mt-6 p-4 bg-pill-background rounded-lg">
                <h3 className="font-semibold text-white mb-3">
                  {t("player.skipTime.feedback.modal.whenToTitle")}
                </h3>

                <p className="text-sm text-gray-300">
                  {t("player.skipTime.feedback.modal.whenToDesc")}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
                  <div>
                    <h4 className="font-medium mb-1">
                      {t("player.skipTime.feedback.modal.guide.startLabel")}
                    </h4>
                    <p className="text-xs">
                      {t("player.skipTime.feedback.modal.guide.startDesc")}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">
                      {t("player.skipTime.feedback.modal.guide.endLabel")}
                    </h4>
                    <p className="text-xs">
                      {t("player.skipTime.feedback.modal.guide.endDesc")}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">
                      {t("player.skipTime.feedback.modal.guide.durationLabel")}
                    </h4>
                    <p className="text-xs">
                      {t("player.skipTime.feedback.modal.guide.durationDesc")}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">
                      {t("player.skipTime.feedback.modal.guide.excludeLabel")}
                    </h4>
                    <p className="text-xs">
                      {t("player.skipTime.feedback.modal.guide.excludeDesc")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 justify-between">
                <Button
                  theme="secondary"
                  onClick={() => {
                    submissionModal.hide();
                    if (onCancel) onCancel();
                  }}
                  disabled={isSubmitting}
                >
                  {t("player.skipTime.feedback.modal.cancel")}
                </Button>
                <Button
                  theme="purple"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  onClick={() => {
                    // Trigger form submission
                    const form = document.querySelector("form");
                    if (form) form.requestSubmit();
                  }}
                >
                  {isSubmitting
                    ? t("player.skipTime.feedback.modal.submitting")
                    : t("player.skipTime.feedback.modal.submit")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Modal>
  );
}
