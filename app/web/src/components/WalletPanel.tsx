import type { WalletMode } from "../lib/wallet";
import { describeWalletMode } from "../lib/wallet";

type Props = {
  mode: WalletMode;
  connectedAddress: string | null;
  walletAvailable: boolean;
  localnetReadonly: boolean;
  busy: boolean;
  localKeypairSecret: string;
  localKeypairLoaded: boolean;
  localKeypairError: string | null;
  onModeChange: (mode: WalletMode) => void;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onLocalKeypairSecretChange: (value: string) => void;
  onLoadLocalKeypair: () => void;
  onClearLocalKeypair: () => void;
};

export function WalletPanel({
  mode,
  connectedAddress,
  walletAvailable,
  localnetReadonly,
  busy,
  localKeypairSecret,
  localKeypairLoaded,
  localKeypairError,
  onModeChange,
  onConnect,
  onDisconnect,
  onLocalKeypairSecretChange,
  onLoadLocalKeypair,
  onClearLocalKeypair,
}: Props) {
  const portalReady = walletAvailable || mode === "local-keypair";
  const portalTitle =
    mode === "local-keypair"
      ? localKeypairLoaded
        ? "Local signer loaded"
        : "Local signer waiting"
      : walletAvailable
        ? "Avatar portal ready"
        : "No wallet portal detected";

  return (
    <section className="card">
      <div>
        <h2>Avatar Gate</h2>
        <p className="muted">
          Use Phantom on devnet, or paste a Solana CLI keypair for localnet debug writes.
          Scout mode keeps everything read-only.
        </p>
      </div>

      <div className="pill-row">
        <button
          className={`pill ${mode === "browser-wallet" ? "active" : ""}`}
          onClick={() => onModeChange("browser-wallet")}
        >
          Browser Avatar
        </button>
        <button
          className={`pill ${mode === "local-readonly" ? "active" : ""}`}
          onClick={() => onModeChange("local-readonly")}
        >
          Scout Mode
        </button>
        <button
          className={`pill ${mode === "local-keypair" ? "active" : ""}`}
          onClick={() => onModeChange("local-keypair")}
        >
          Local Keypair
        </button>
      </div>

      <div className={portalReady ? "banner" : "banner warn"}>
        <strong>{portalTitle}</strong>
        <div className="muted">{describeWalletMode(mode)}</div>
      </div>

      {mode === "local-keypair" ? (
        <div className="stack">
          <div className={`banner ${localnetReadonly ? "" : "warn"}`}>
            <strong>{localnetReadonly ? "Localnet debug unlocked" : "Use this only on localnet"}</strong>
            <div className="muted">
              Secret keys stay in memory only and are never written to local storage.
            </div>
          </div>
          <label className="field full">
            <span>Solana CLI secret key JSON</span>
            <textarea
              className="textarea textarea-sm code"
              value={localKeypairSecret}
              onChange={(event) => onLocalKeypairSecretChange(event.target.value)}
              placeholder="[12,34,56,...]"
              spellCheck={false}
            />
          </label>
          {localKeypairError ? <div className="banner warn">{localKeypairError}</div> : null}
          <div className="actions">
            <button
              className="btn primary"
              disabled={busy}
              onClick={onLoadLocalKeypair}
            >
              {localKeypairLoaded ? "Reload Local Keypair" : "Load Local Keypair"}
            </button>
            <button
              className="btn ghost"
              disabled={busy || !localKeypairLoaded}
              onClick={onClearLocalKeypair}
            >
              Clear Local Keypair
            </button>
          </div>
        </div>
      ) : null}

      <div className="kv">
        <div className="kv-row">
          <span className="kv-key">Current stance</span>
          <span className="kv-value">{mode}</span>
        </div>
        <div className="kv-row">
          <span className="kv-key">Avatar key</span>
          <span className="kv-value code">
            {connectedAddress ?? "Not connected"}
          </span>
        </div>
      </div>

      <div className="actions">
        <button
          className="btn primary"
          disabled={busy || mode !== "browser-wallet" || !walletAvailable}
          onClick={() => void onConnect()}
        >
          Enter With Wallet
        </button>
        <button
          className="btn ghost"
          disabled={busy || !connectedAddress || mode === "local-keypair"}
          onClick={() => void onDisconnect()}
        >
          Leave Gate
        </button>
      </div>
    </section>
  );
}
