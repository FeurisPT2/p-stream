import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Icon, Icons } from "@/components/Icon";
import { Stepper } from "@/components/layout/Stepper";
import { BiggerCenterContainer } from "@/components/layout/ThinContainer";
import { Heading2, Paragraph } from "@/components/utils/Text";
import { MinimalPageLayout } from "@/pages/layouts/MinimalPageLayout";
import { Card, CardContent, Link } from "@/pages/migration/utils";
import { PageTitle } from "@/pages/parts/util/PageTitle";
import { usePreferencesStore } from "@/stores/preferences";

type SetupStep = "start" | "auto" | "manual" | "success";

const MANUAL_BUTTONS = [
  { id: 0, name: "A / Cross", icon: Icons.CIRCLE_CHECK },
  { id: 1, name: "B / Circle", icon: Icons.ARROW_LEFT },
  { id: 12, name: "D-Pad Up", icon: Icons.CHEVRON_UP },
  { id: 13, name: "D-Pad Down", icon: Icons.CHEVRON_DOWN },
];

export function GamepadSetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<SetupStep>("start");
  const [currentManualButton, setCurrentManualButton] = useState(0);
  const [detectedGamepad, setDetectedGamepad] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setGamepadSetupComplete = usePreferencesStore(
    (s: any) => s.setGamepadSetupComplete,
  );
  const setEnableGamepadControls = usePreferencesStore(
    (s: any) => s.setEnableGamepadControls,
  );

  useEffect(() => {
    if (!isListening) return;

    if (!navigator.getGamepads) {
      console.warn(
        "[GamepadSetup] Gamepad API not available in this browser/context",
      );
      setIsListening(false);
      return;
    }

    const poll = () => {
      const gamepads = navigator.getGamepads?.() ?? [];
      for (const gp of gamepads) {
        if (!gp) continue;

        if (step === "auto") {
          setDetectedGamepad(gp.id);
          successTimeoutRef.current = setTimeout(() => {
            setStep("success");
            setIsListening(false);
          }, 1500);
          return;
        }

        if (step === "manual") {
          const targetButton = MANUAL_BUTTONS[currentManualButton];
          if (gp.buttons[targetButton.id]?.pressed) {
            if (currentManualButton < MANUAL_BUTTONS.length - 1) {
              setCurrentManualButton((s) => s + 1);
            } else {
              setStep("success");
              setIsListening(false);
            }
            return;
          }
        }
      }
      requestAnimationFrame(poll);
    };

    const handle = requestAnimationFrame(poll);
    return () => {
      cancelAnimationFrame(handle);
      if (successTimeoutRef.current !== null) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    };
  }, [step, currentManualButton, isListening]);

  const finishSetup = useCallback(() => {
    setGamepadSetupComplete(true);
    setEnableGamepadControls(true);
    navigate("/settings#settings-preferences");
  }, [navigate, setGamepadSetupComplete, setEnableGamepadControls]);

  return (
    <MinimalPageLayout>
      <PageTitle subpage k="Setup Controller" />
      <BiggerCenterContainer>
        <Stepper
          steps={3}
          current={step === "start" ? 1 : step === "success" ? 3 : 2}
          className="mb-12"
        />

        {step === "start" && (
          <>
            <Heading2 className="!mt-0 !text-3xl font-bold">
              Setup Controller Support
            </Heading2>
            <Paragraph className="max-w-[400px] mb-8">
              Connect your Xbox or PlayStation controller to navigate P-Stream
              with ease. Choose a setup mode below.
            </Paragraph>

            <div className="w-full flex flex-col md:flex-row gap-4">
              <Card
                onClick={() => {
                  setStep("auto");
                  setIsListening(true);
                }}
                className="flex-1"
              >
                <CardContent
                  colorClass="text-themePreview-primary"
                  title="Auto Mode"
                  subtitle="Recommended"
                  description="Automatically detect and configure your connected controller."
                  icon={Icons.WAND}
                >
                  <Link>Start Auto Setup</Link>
                </CardContent>
              </Card>

              <Card
                onClick={() => {
                  setStep("manual");
                  setIsListening(true);
                }}
                className="flex-1"
              >
                <CardContent
                  colorClass="text-type-dimmed"
                  title="Manual Mode"
                  subtitle="Debug / Troubleshooting"
                  description="Step-by-step verification if your controller isn't working."
                  icon={Icons.GEAR}
                >
                  <Link>Start Manual Setup</Link>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {step === "auto" && (
          <div className="text-center py-12">
            <div className="relative inline-block mb-8">
              <div className="w-24 h-24 border-4 border-themePreview-primary/20 border-t-themePreview-primary rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">
                🎮
              </div>
            </div>
            <Heading2 className="!text-2xl mb-2">
              {detectedGamepad
                ? "Controller Detected!"
                : "Waiting for Controller..."}
            </Heading2>
            <Paragraph className="opacity-60">
              {detectedGamepad ||
                "Please press any button on your controller to identify it."}
            </Paragraph>
          </div>
        )}

        {step === "manual" && (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10 p-8">
            <Heading2 className="!text-2xl mb-6">
              Verify Button Presses
            </Heading2>
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-themePreview-primary/20 rounded-full flex items-center justify-center text-3xl text-themePreview-primary animate-pulse">
                <Icon icon={MANUAL_BUTTONS[currentManualButton].icon} />
              </div>
              <div>
                <Paragraph className="text-xl font-bold mb-1">
                  Press {MANUAL_BUTTONS[currentManualButton].name}
                </Paragraph>
                <Paragraph className="text-sm opacity-50">
                  Step {currentManualButton + 1} of {MANUAL_BUTTONS.length}
                </Paragraph>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden max-w-[200px]">
                <div
                  className="h-full bg-themePreview-primary transition-all duration-300"
                  style={{
                    width: `${((currentManualButton + 1) / MANUAL_BUTTONS.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-4xl text-green-500 mx-auto mb-6">
              <Icon icon={Icons.CIRCLE_CHECK} />
            </div>
            <Heading2 className="!text-3xl mb-4">Setup Complete!</Heading2>
            <Paragraph className="max-w-[400px] mx-auto mb-8 opacity-80">
              Your controller is now ready to use. You can navigate the entire
              site using the D-Pad and Select button.
            </Paragraph>
            <button
              type="button"
              onClick={finishSetup}
              className="bg-white text-black px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform"
            >
              Back to Settings
            </button>
          </div>
        )}
      </BiggerCenterContainer>
    </MinimalPageLayout>
  );
}
