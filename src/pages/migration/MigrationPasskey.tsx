import { useCallback, useState } from "react";
import { useAsyncFn } from "react-use";
import { useNavigate } from "react-router-dom";

import {
  createPasskey,
  genMnemonic,
  isPasskeySupported,
  keysFromCredentialId,
  keysFromMnemonic,
  bytesToBase64,
  bytesToBase64Url,
  signChallenge,
  encryptData,
  storeCredentialMapping,
} from "@/backend/accounts/crypto";
import { getLoginChallengeToken, loginAccount } from "@/backend/accounts/login";
import {
  getRegisterChallengeToken,
  registerAccount,
} from "@/backend/accounts/register";
import { getUser } from "@/backend/accounts/user";
import { Button } from "@/components/buttons/Button";
import { PassphraseDisplay } from "@/components/form/PassphraseDisplay";
import { Icon, Icons } from "@/components/Icon";
import { SettingsCard } from "@/components/layout/SettingsCard";
import { CenterContainer } from "@/components/layout/ThinContainer";
import { AuthInputBox } from "@/components/text-inputs/AuthInputBox";
import { Divider } from "@/components/utils/Divider";
import { Heading2, Paragraph } from "@/components/utils/Text";
import { useBackendUrl } from "@/hooks/auth/useBackendUrl";
import { MinimalPageLayout } from "@/pages/layouts/MinimalPageLayout";
import { PageTitle } from "@/pages/parts/util/PageTitle";
import { useAuthStore } from "@/stores/auth";

type Step = "input" | "choose" | "passphrase" | "done";

export function MigrationPasskeyPage() {
  const navigate = useNavigate();
  const backendUrl = useBackendUrl();
  const [credentialId, setCredentialId] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState("");
  const [newMnemonic] = useState(() => genMnemonic());
  const [publicKeyDisplay, setPublicKeyDisplay] = useState("");

  const [verifyResult, verifyCredential] = useAsyncFn(async () => {
    if (!backendUrl) throw new Error("No backend URL configured");
    const trimmed = credentialId.trim();
    if (!trimmed) throw new Error("Please paste your credential ID");

    const keys = await keysFromCredentialId(trimmed);
    const publicKeyBase64Url = bytesToBase64Url(keys.publicKey);

    const { challenge } = await getLoginChallengeToken(
      backendUrl,
      publicKeyBase64Url,
    );
    await signChallenge(keys, challenge);

    setPublicKeyDisplay(publicKeyBase64Url);
    setStep("choose");
  }, [credentialId, backendUrl]);

  const [migrateResult, migrateToPasskey] = useAsyncFn(async () => {
    if (!backendUrl) throw new Error("No backend URL configured");
    if (!isPasskeySupported()) throw new Error("Passkeys not supported in this browser");

    const oldKeys = await keysFromCredentialId(credentialId.trim());
    const oldPublicKey = bytesToBase64Url(oldKeys.publicKey);

    const { challenge: loginChallenge } = await getLoginChallengeToken(
      backendUrl,
      oldPublicKey,
    );
    const loginSig = await signChallenge(oldKeys, loginChallenge);
    const loginResult = await loginAccount(backendUrl, {
      challenge: { code: loginChallenge, signature: loginSig },
      publicKey: oldPublicKey,
      device: await encryptData("Migration", oldKeys.seed),
    });

    const credential = await createPasskey(`user-${Date.now()}`, "Z-Stream User");
    const newCredId = credential.id;

    const newKeys = await keysFromCredentialId(newCredId);
    const newPublicKey = bytesToBase64Url(newKeys.publicKey);

    const { challenge: regChallenge } = await getRegisterChallengeToken(backendUrl);
    const regSig = await signChallenge(newKeys, regChallenge);
    await registerAccount(backendUrl, {
      challenge: { code: regChallenge, signature: regSig },
      publicKey: newPublicKey,
      device: await encryptData("Migrated Device", newKeys.seed),
      profile: { colorA: "#6366f1", colorB: "#8b5cf6", icon: "user" },
    });

    storeCredentialMapping(backendUrl, newPublicKey, newCredId);

    // TODO: transfer data from old account to new — for now just log into new
    const { challenge: newLoginChallenge } = await getLoginChallengeToken(
      backendUrl,
      newPublicKey,
    );
    const newLoginSig = await signChallenge(newKeys, newLoginChallenge);
    const newLoginResult = await loginAccount(backendUrl, {
      challenge: { code: newLoginChallenge, signature: newLoginSig },
      publicKey: newPublicKey,
      device: await encryptData("Migrated Device", newKeys.seed),
    });

    const user = await getUser(backendUrl, newLoginResult.token);
    useAuthStore.getState().setAccount({
      token: newLoginResult.token,
      sessionId: newLoginResult.session.id,
      userId: user.user.id,
      seed: bytesToBase64(newKeys.seed),
      nickname: user.user.nickname,
      profile: user.user.profile,
      deviceName: "Migrated Device",
    });

    setStep("done");
  }, [credentialId, backendUrl]);

  const [passphraseResult, migrateToPassphrase] = useAsyncFn(async () => {
    if (!backendUrl) throw new Error("No backend URL configured");

    const oldKeys = await keysFromCredentialId(credentialId.trim());
    const oldPublicKey = bytesToBase64Url(oldKeys.publicKey);

    // Log into old account
    const { challenge: loginChallenge } = await getLoginChallengeToken(
      backendUrl,
      oldPublicKey,
    );
    const loginSig = await signChallenge(oldKeys, loginChallenge);
    const loginResult = await loginAccount(backendUrl, {
      challenge: { code: loginChallenge, signature: loginSig },
      publicKey: oldPublicKey,
      device: await encryptData("Migration", oldKeys.seed),
    });

    // Register new account with passphrase
    const newKeys = await keysFromMnemonic(newMnemonic);
    const newPublicKey = bytesToBase64Url(newKeys.publicKey);

    const { challenge: regChallenge } = await getRegisterChallengeToken(backendUrl);
    const regSig = await signChallenge(newKeys, regChallenge);
    await registerAccount(backendUrl, {
      challenge: { code: regChallenge, signature: regSig },
      publicKey: newPublicKey,
      device: await encryptData("Migrated Device", newKeys.seed),
      profile: { colorA: "#6366f1", colorB: "#8b5cf6", icon: "user" },
    });

    // Log into new account
    const { challenge: newLoginChallenge } = await getLoginChallengeToken(
      backendUrl,
      newPublicKey,
    );
    const newLoginSig = await signChallenge(newKeys, newLoginChallenge);
    const newLoginResult = await loginAccount(backendUrl, {
      challenge: { code: newLoginChallenge, signature: newLoginSig },
      publicKey: newPublicKey,
      device: await encryptData("Migrated Device", newKeys.seed),
    });

    const user = await getUser(backendUrl, newLoginResult.token);
    useAuthStore.getState().setAccount({
      token: newLoginResult.token,
      sessionId: newLoginResult.session.id,
      userId: user.user.id,
      seed: bytesToBase64(newKeys.seed),
      nickname: user.user.nickname,
      profile: user.user.profile,
      deviceName: "Migrated Device",
    });

    setStep("done");
  }, [credentialId, backendUrl, newMnemonic]);

  return (
    <MinimalPageLayout>
      <PageTitle subpage k="global.pages.migration" />
      <CenterContainer>
        <div>
          <Heading2 className="!text-4xl !mt-0">Passkey Recovery</Heading2>
          <Paragraph className="text-lg max-w-md mb-6">
            Recover your account from an old domain-bound passkey.
            Paste the credential ID you exported, then choose how to secure your new account.
          </Paragraph>

          {step === "input" && (
            <SettingsCard>
              <div className="space-y-4">
                <h3 className="font-bold text-white text-lg">
                  Paste your Credential ID
                </h3>
                <p className="text-type-secondary text-sm">
                  Go to the old domain&apos;s export page, click &quot;Extract My Credentials&quot;,
                  and paste the Credential ID value here.
                </p>
                <AuthInputBox
                  label="Credential ID"
                  value={credentialId}
                  onChange={setCredentialId}
                  placeholder="e.g. AbCdEf123..."
                />
                {verifyResult.error && (
                  <p className="text-red-400 text-sm">
                    {verifyResult.error.message === "user_not_found"
                      ? "No account found for this credential ID."
                      : verifyResult.error.message}
                  </p>
                )}
                <Button
                  theme="purple"
                  className="w-full"
                  onClick={verifyCredential}
                  loading={verifyResult.loading}
                  disabled={verifyResult.loading || !credentialId.trim()}
                >
                  Verify & Continue
                </Button>
              </div>
            </SettingsCard>
          )}

          {step === "choose" && (
            <div className="space-y-4">
              <SettingsCard>
                <div className="flex items-center gap-2 mb-4">
                  <Icon icon={Icons.CHECKMARK} className="text-green-400 text-xl" />
                  <span className="text-green-400 font-medium">Account found</span>
                </div>
                <p className="text-type-secondary text-sm mb-2">
                  Public key: <code className="text-xs break-all">{publicKeyDisplay}</code>
                </p>
              </SettingsCard>

              <Paragraph className="!mt-6 !mb-4 font-medium">
                Choose how to secure your new account:
              </Paragraph>

              {isPasskeySupported() && (
                <SettingsCard>
                  <div className="space-y-3">
                    <h3 className="font-bold text-white">
                      <Icon icon={Icons.LOCK} className="mr-2" />
                      New Passkey (on zstream.mov)
                    </h3>
                    <p className="text-type-secondary text-sm">
                      Create a new passkey bound to the current domain.
                      Quick and easy — same flow as before, just on the new domain.
                    </p>
                    {migrateResult.error && (
                      <p className="text-red-400 text-sm">{migrateResult.error.message}</p>
                    )}
                    <Button
                      theme="purple"
                      className="w-full"
                      onClick={migrateToPasskey}
                      loading={migrateResult.loading}
                      disabled={migrateResult.loading || passphraseResult.loading}
                    >
                      Create New Passkey
                    </Button>
                  </div>
                </SettingsCard>
              )}

              <SettingsCard>
                <div className="space-y-3">
                  <h3 className="font-bold text-white">
                    <Icon icon={Icons.USER} className="mr-2" />
                    Passphrase Account
                  </h3>
                  <p className="text-type-secondary text-sm">
                    Create a new account with a passphrase instead.
                    Works on any domain — you won&apos;t get locked out again.
                  </p>
                  <Button
                    theme="secondary"
                    className="w-full"
                    onClick={() => setStep("passphrase")}
                    disabled={migrateResult.loading || passphraseResult.loading}
                  >
                    Use Passphrase Instead
                  </Button>
                </div>
              </SettingsCard>
            </div>
          )}

          {step === "passphrase" && (
            <div className="space-y-4">
              <SettingsCard>
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-lg">
                    Your New Passphrase
                  </h3>
                  <p className="text-type-secondary text-sm">
                    Write this down somewhere safe. This is the only way to log into your new account.
                  </p>
                  <PassphraseDisplay mnemonic={newMnemonic} />
                  {passphraseResult.error && (
                    <p className="text-red-400 text-sm">{passphraseResult.error.message}</p>
                  )}
                  <Button
                    theme="purple"
                    className="w-full"
                    onClick={migrateToPassphrase}
                    loading={passphraseResult.loading}
                    disabled={passphraseResult.loading}
                  >
                    I Saved It — Migrate My Account
                  </Button>
                  <Button
                    theme="secondary"
                    className="w-full"
                    onClick={() => setStep("choose")}
                    disabled={passphraseResult.loading}
                  >
                    Back
                  </Button>
                </div>
              </SettingsCard>
            </div>
          )}

          {step === "done" && (
            <SettingsCard>
              <div className="text-center space-y-4 py-6">
                <Icon icon={Icons.CHECKMARK} className="text-green-400 text-4xl" />
                <h3 className="font-bold text-white text-lg">Migration Complete</h3>
                <p className="text-type-secondary text-sm">
                  Your new account is set up and you&apos;re logged in.
                  Your old account data still exists — use the regular migration tools
                  to transfer bookmarks and watch history if needed.
                </p>
                <Button theme="purple" onClick={() => navigate("/")}>
                  Go Home
                </Button>
              </div>
            </SettingsCard>
          )}

          <div className="flex justify-between mt-6">
            <Button theme="secondary" onClick={() => navigate("/migration")}>
              Back to Migration
            </Button>
          </div>
        </div>
      </CenterContainer>
    </MinimalPageLayout>
  );
}
