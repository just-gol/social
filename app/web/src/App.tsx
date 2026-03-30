import { useEffect, useMemo, useState } from "react";
import type { AnchorProvider } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { FeatureBoard } from "./components/FeatureBoard";
import { RewardConfigCard } from "./components/RewardConfigCard";
import { WalletPanel } from "./components/WalletPanel";
import {
  DEFAULT_REWARD_CONFIG_FORM,
  DEFAULT_RPC_URL,
  isLocalRpcUrl,
} from "./lib/constants";
import {
  airdropSol,
  cancelFollowTx,
  createCommentTx,
  createConnection,
  createFollowTx,
  createLikeTx,
  createNftMintTx,
  createProfileTx,
  createStakeTx,
  createTokenMintTx,
  createTweetTx,
  deleteTweetTx,
  deleteCommentTx,
  initRewardConfigTx,
  loadAppState,
  type CommentView,
  mintLikeRewardTx,
  type AppState,
  type ProfileFormInput,
  type RewardConfigFormInput,
  type SocialProfileLink,
  updateRewardConfigTx,
  unstakeTx,
} from "./lib/socialClient";
import {
  createBrowserProvider,
  createLocalKeypairProvider,
  getBrowserWallet,
  parseLocalKeypairSecret,
  type WalletMode,
} from "./lib/wallet";
import pixelHero from "./assets/pixel-hero.svg";

function formatError(error: unknown) {
  const rawMessage =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : (() => {
            const maybe = error as { error?: { errorMessage?: string }; message?: string };
            return maybe.error?.errorMessage ?? maybe.message ?? "Unknown error";
          })();

  const translations: Array<[string, string]> = [
    ["DailyTweetCapExceeded", "今天的发帖次数已经到上限了。可以明天再试，或者去 Admin 调大 Daily Tweet Cap。"],
    ["DailyLikeRewardCapExceeded", "今天可结算的点赞奖励次数已经到上限了。"],
    ["TweetLikeRewardCapExceeded", "这条帖子可结算的点赞奖励次数已经到上限了。"],
    ["AuthorNotEligibleForLikeReward", "这位作者还没达到领取点赞奖励的发帖门槛。"],
    ["RewardAlreadyClaimed", "这次点赞对应的作者奖励已经结算过了。"],
    ["TweetDeleted", "这条帖子已经删除，不能继续操作。"],
    ["SelfLikeNotAllowed", "不能给自己的帖子点赞。"],
    ["Invalid tweet author", "只能对属于当前作者的帖子执行这个操作。"],
    ["Account not found: rewardConfig", "当前链上还没有全局 RewardConfig，请先去 Admin 初始化。"],
    ["Create a profile first.", "请先创建 Profile。"],
    ["Initialize the global RewardConfig first.", "请先初始化全局 RewardConfig。"],
    ["Initialize your milestone NFT mint before posting.", "发帖前请先初始化你的 NFT Mint。"],
  ];

  for (const [needle, friendly] of translations) {
    if (rawMessage.includes(needle)) {
      return friendly;
    }
  }

  if (rawMessage.includes("already in use")) {
    return "这个账户已经创建过了，不需要重复创建。";
  }

  if (rawMessage.includes("Cannot read properties of undefined")) {
    return "前端读取链上状态时出了问题，请刷新页面后再试。";
  }

  if (rawMessage.includes("Attempt to load a program that does not exist")) {
    return "当前 localnet 上缺少程序部署。请先确认 validator 和 anchor deploy 都已经完成。";
  }

  return rawMessage;
}

function shortAddress(value: string | null, head = 4, tail = 4) {
  if (!value) return "Not connected";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function formatTimestamp(timestamp: number) {
  return timestamp ? new Date(timestamp * 1000).toLocaleString() : "Unknown time";
}

function Avatar({ name, uri }: { name: string; uri: string }) {
  if (uri) return <img className="avatar" src={uri} alt={name} />;
  return <div className="avatar avatar-fallback">{(name || "S").slice(0, 1)}</div>;
}

function GuardMessage({ text }: { text: string | null }) {
  if (!text) return null;
  return <div className="banner warn">{text}</div>;
}

function commentGuard(
  baseGuard: string | null,
  viewerProfileExists: boolean,
  isOwnTweet: boolean,
  tweetDeleted: boolean,
  draft: string
) {
  if (baseGuard) return baseGuard;
  if (!viewerProfileExists) return "先创建 Profile，才能评论。";
  if (tweetDeleted) return "这条 tweet 已删除，不能继续评论。";
  if (!draft.trim()) return "先输入评论内容。";
  if (draft.trim().length > 64) return "评论内容不能超过 64 个字符。";
  if (isOwnTweet) return null;
  return null;
}

type AppTab = "home" | "base" | "profile" | "tweets" | "vault" | "admin";
type SocialListMode = "followers" | "following" | null;
const LOCAL_KEYPAIR_SECRET_STORAGE_KEY = "social-local-keypair-secret";
const WALLET_MODE_STORAGE_KEY = "social-wallet-mode";

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [mode, setMode] = useState<WalletMode>("browser-wallet");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [browserAddress, setBrowserAddress] = useState<string | null>(null);
  const [walletAvailable, setWalletAvailable] = useState(false);
  const [localKeypairSecret, setLocalKeypairSecret] = useState("");
  const [localKeypair, setLocalKeypair] = useState<Keypair | null>(null);
  const [localKeypairError, setLocalKeypairError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [loadingState, setLoadingState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormInput>({
    name: "",
    bio: "",
    avatarUri: "",
  });
  const [tweetContent, setTweetContent] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [rewardConfigForm, setRewardConfigForm] = useState<RewardConfigFormInput>({
    ...DEFAULT_REWARD_CONFIG_FORM,
  });
  const [socialListMode, setSocialListMode] = useState<SocialListMode>(null);
  const [selectedSocialProfile, setSelectedSocialProfile] =
    useState<SocialProfileLink | null>(null);
  const environment = appState?.environment ?? {
    rpcUrl: DEFAULT_RPC_URL,
    rewardConfigPda: "",
    programId: "",
  };

  useEffect(() => {
    const wallet = getBrowserWallet();
    setWalletAvailable(!!wallet);
    setBrowserAddress(wallet?.publicKey?.toBase58() ?? null);

    const savedMode = window.localStorage.getItem(WALLET_MODE_STORAGE_KEY);
    if (
      savedMode === "browser-wallet" ||
      savedMode === "local-readonly" ||
      savedMode === "local-keypair"
    ) {
      setMode(savedMode);
    }

    const savedSecret = window.localStorage.getItem(LOCAL_KEYPAIR_SECRET_STORAGE_KEY);
    if (savedSecret) {
      setLocalKeypairSecret(savedSecret);
      try {
        setLocalKeypair(parseLocalKeypairSecret(savedSecret));
        if (savedMode !== "browser-wallet") {
          setMode("local-keypair");
        }
      } catch {
        window.localStorage.removeItem(LOCAL_KEYPAIR_SECRET_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(WALLET_MODE_STORAGE_KEY, mode);
  }, [mode]);

  const localnetReadonly = isLocalRpcUrl(environment.rpcUrl);
  const connectedAddress =
    mode === "local-keypair"
      ? localKeypair?.publicKey.toBase58() ?? null
      : browserAddress;
  const browserWalletReady = mode === "browser-wallet" && !!browserAddress;
  const localKeypairReady = mode === "local-keypair" && !!localKeypair;
  const txReady =
    (browserWalletReady && !localnetReadonly) ||
    (localKeypairReady && localnetReadonly);
  const viewer = appState?.viewer ?? null;
  const rewardConfig = appState?.rewardConfig ?? null;
  const browserWritesEnabled = browserWalletReady && !localnetReadonly;
  const localKeypairWritesEnabled = localKeypairReady && localnetReadonly;
  const stakeSourceTweet = useMemo(
    () => viewer?.ownTweets.find((tweet) => !tweet.deleted) ?? null,
    [viewer]
  );

  function writeModeGuard(actionLabel: string) {
    if (mode === "local-readonly") {
      return `当前是只读模式。要${actionLabel}，请切到 Browser Wallet 或 Local Keypair 模式。`;
    }

    if (mode === "browser-wallet") {
      if (!browserAddress) {
        return `先连接浏览器钱包，才能${actionLabel}。`;
      }
      if (localnetReadonly) {
        return `当前 RPC 是 localnet。浏览器钱包模式默认只读；要${actionLabel}，请切到 Local Keypair 调试模式。`;
      }
      return null;
    }

    if (!localKeypair) {
      return `先在 Local Keypair 模式里加载本地密钥，才能${actionLabel}。`;
    }
    if (!localnetReadonly) {
      return `Local Keypair 调试模式只建议用于 localnet。当前不是 localnet，请改用浏览器钱包来${actionLabel}。`;
    }
    return null;
  }

  const createProfileGuard =
    writeModeGuard("创建 Profile")
      ? writeModeGuard("创建 Profile")
      : viewer?.profile
        ? "当前钱包已经有 Profile 了。"
        : !profileForm.name.trim()
          ? "先填写名字。"
          : null;

  const initRewardConfigGuard =
    writeModeGuard("初始化全局 RewardConfig")
      ? writeModeGuard("初始化全局 RewardConfig")
      : rewardConfig
        ? "RewardConfig 已经存在，不能重复初始化。"
        : null;

  const updateRewardConfigGuard =
    writeModeGuard("更新 RewardConfig")
      ? writeModeGuard("更新 RewardConfig")
      : !rewardConfig
        ? "当前链上还没有 RewardConfig，先执行初始化。"
        : !viewer?.isAdmin
          ? "只有 RewardConfig 的 authority 才能更新配置。"
          : null;

  const createTokenMintGuard =
    writeModeGuard("创建全局 Token Mint")
      ? writeModeGuard("创建全局 Token Mint")
      : viewer?.tokenMintInitialized
        ? "全局 Token Mint 已经创建好了。"
        : null;

  const initNftMintGuard =
    writeModeGuard("初始化你的 NFT Mint")
      ? writeModeGuard("初始化你的 NFT Mint")
      : !viewer?.profile
        ? "先创建 Profile。"
        : !rewardConfig
          ? "先初始化全局 RewardConfig。"
          : viewer.nftMintInitialized
            ? "你的 NFT Mint 已经初始化好了。"
            : null;

  const createTweetGuard =
    writeModeGuard("发帖")
      ? writeModeGuard("发帖")
      : !viewer?.profile
        ? "先创建 Profile。"
        : !rewardConfig
          ? "先初始化全局 RewardConfig。"
          : !viewer.nftMintInitialized
            ? "先初始化你的 NFT Mint。"
            : !tweetContent.trim()
              ? "先输入 tweet 内容。"
              : null;

  const stakeGuard =
    writeModeGuard("质押 NFT")
      ? writeModeGuard("质押 NFT")
      : !viewer?.profile
        ? "先创建 Profile。"
        : !rewardConfig
          ? "先初始化全局 RewardConfig。"
          : !viewer.nftMintInitialized
            ? "先初始化你的 NFT Mint。"
            : viewer.nftBalance === "0"
              ? "当前钱包里没有可质押的 milestone NFT。"
              : !!viewer.stake
                ? "已经有一个 stake 在进行中，先解质押。"
                : !stakeSourceTweet
                  ? "至少需要一条未删除的本人 tweet 才能发起质押。"
                  : null;

  const unstakeGuard =
    writeModeGuard("解质押")
      ? writeModeGuard("解质押")
      : !viewer?.stake
        ? "当前没有可解质押的 stake。"
        : null;

  useEffect(() => {
    if (!rewardConfig) return;
    setRewardConfigForm({
      name: rewardConfig.name,
      symbol: rewardConfig.symbol,
      uri: rewardConfig.uri,
      milestoneTweetCount: String(rewardConfig.milestoneTweetCount),
      likeRewardAmount: rewardConfig.likeRewardAmount,
      stakeBaseRewardAmount: rewardConfig.stakeBaseRewardAmount,
      stakeRewardPerEpoch: rewardConfig.stakeRewardPerEpoch,
      dailyTweetRewardCap: String(rewardConfig.dailyTweetRewardCap),
      dailyLikeRewardCap: String(rewardConfig.dailyLikeRewardCap),
      maxRewardableLikesPerTweet: String(rewardConfig.maxRewardableLikesPerTweet),
      minTweetsBeforeLikeReward: String(rewardConfig.minTweetsBeforeLikeReward),
    });
  }, [rewardConfig?.address]);

  async function refreshState() {
    setLoadingState(true);
    setError(null);
    try {
      const connection = createConnection();
      setAppState(await loadAppState(connection, connectedAddress));
    } catch (nextError) {
      setError(formatError(nextError));
    } finally {
      setLoadingState(false);
    }
  }

  useEffect(() => {
    void refreshState();
  }, [mode, connectedAddress]);

  useEffect(() => {
    if (activeTab === "home") {
      return;
    }
    void refreshState();
  }, [activeTab]);

  function getWritableProvider(): AnchorProvider {
    if (mode === "local-keypair") {
      if (!localKeypair) throw new Error("Load a local keypair first.");
      if (!localnetReadonly) {
        throw new Error(
          "Local keypair debug mode is reserved for localnet. Use browser wallet mode on non-local RPCs."
        );
      }
      return createLocalKeypairProvider(createConnection(), localKeypair);
    }
    const wallet = getBrowserWallet();
    if (mode !== "browser-wallet") throw new Error("Switch to a writable wallet mode first.");
    if (localnetReadonly) {
      throw new Error(
        "Current RPC is localnet. Browser wallet mode is readonly here; switch to Local Keypair mode for localnet writes."
      );
    }
    if (!wallet) throw new Error("Browser wallet provider not found.");
    if (!wallet.publicKey) throw new Error("Connect your browser wallet first.");
    return createBrowserProvider(createConnection(), wallet);
  }

  async function runAction(label: string, fn: () => Promise<string>) {
    setBusyAction(label);
    setError(null);
    setNotice(null);
    try {
      const signature = await fn();
      setNotice(`${label} confirmed: ${shortAddress(signature, 6, 6)}`);
      await refreshState();
    } catch (nextError) {
      setError(formatError(nextError));
    } finally {
      setBusyAction(null);
    }
  }

  async function runGuardedAction(
    label: string,
    guard: string | null,
    fn: () => Promise<string>
  ) {
    if (guard) {
      setError(guard);
      setNotice(null);
      return;
    }
    await runAction(label, fn);
  }

  async function connectWallet() {
    const wallet = getBrowserWallet();
    if (!wallet?.connect) {
      setError("Browser wallet provider not found.");
      return;
    }
    setBusyAction("Connect Wallet");
    try {
      await wallet.connect();
      setBrowserAddress(wallet.publicKey?.toBase58() ?? null);
      setNotice("Wallet connected.");
    } catch (nextError) {
      setError(formatError(nextError));
    } finally {
      setBusyAction(null);
    }
  }

  async function disconnectWallet() {
    const wallet = getBrowserWallet();
    setBusyAction("Disconnect Wallet");
    try {
      await wallet?.disconnect?.();
      setBrowserAddress(null);
      setNotice("Wallet disconnected.");
    } catch (nextError) {
      setError(formatError(nextError));
    } finally {
      setBusyAction(null);
    }
  }

  function loadLocalKeypair() {
    try {
      const parsed = parseLocalKeypairSecret(localKeypairSecret);
      setLocalKeypair(parsed);
      setLocalKeypairError(null);
      setError(null);
      window.localStorage.setItem(LOCAL_KEYPAIR_SECRET_STORAGE_KEY, localKeypairSecret);
      window.localStorage.setItem(WALLET_MODE_STORAGE_KEY, "local-keypair");
      setMode("local-keypair");
      setNotice(`Local keypair loaded: ${shortAddress(parsed.publicKey.toBase58(), 6, 6)}`);
    } catch (nextError) {
      setLocalKeypair(null);
      setLocalKeypairError(formatError(nextError));
      setNotice(null);
    }
  }

  function clearLocalKeypair() {
    setLocalKeypair(null);
    setLocalKeypairSecret("");
    setLocalKeypairError(null);
    window.localStorage.removeItem(LOCAL_KEYPAIR_SECRET_STORAGE_KEY);
    setNotice("Local keypair cleared.");
  }

  const socialListEntries: SocialProfileLink[] =
    socialListMode === "followers"
      ? viewer?.followerProfiles ?? []
      : socialListMode === "following"
        ? viewer?.followingProfiles ?? []
        : [];

  const viewerFollowingMap = useMemo(
    () =>
      new Map((viewer?.following ?? []).map((follow) => [follow.followingProfileAddress, follow])),
    [viewer?.following]
  );

  const selectedProfileFollow = selectedSocialProfile
    ? viewerFollowingMap.get(selectedSocialProfile.profileAddress) ?? null
    : null;

  const selectedProfileTweets = useMemo(
    () =>
      selectedSocialProfile
        ? (appState?.tweets.filter((tweet) => tweet.author === selectedSocialProfile.authority) ??
            [])
        : [],
    [appState?.tweets, selectedSocialProfile]
  );

  function resolveSocialProfileLink(
    authority: string,
    profileAddress: string,
    name: string,
    avatarUri: string
  ): SocialProfileLink {
    const existing =
      viewer?.followerProfiles.find((profile) => profile.profileAddress === profileAddress) ??
      viewer?.followingProfiles.find((profile) => profile.profileAddress === profileAddress);

    if (existing) {
      return existing;
    }

    return {
      authority,
      profileAddress,
      name,
      avatarUri,
      bio: "",
      tweetCount: appState?.tweets.filter((tweet) => tweet.author === authority).length ?? 0,
      followersCount: 0,
      followingCount: 0,
      commentsReceivedCount: 0,
    };
  }

  function openSocialProfile(entry: SocialProfileLink) {
    setSelectedSocialProfile(entry);
    setSocialListMode(null);
  }

  function closeSocialProfile() {
    setSelectedSocialProfile(null);
  }

  function renderSocialFollowAction(entry: SocialProfileLink) {
    if (!viewer?.profile || entry.authority === connectedAddress) {
      return null;
    }
    const follow = viewerFollowingMap.get(entry.profileAddress) ?? null;
    return (
      <button
        type="button"
        className={`btn ${follow ? "ghost" : "secondary"}`}
        disabled={!txReady || !!busyAction}
        onClick={() =>
          void runGuardedAction(
            follow ? "Cancel Follow" : "Create Follow",
            writeModeGuard(follow ? "取关" : "关注"),
            async () =>
              follow
                ? cancelFollowTx(
                    getWritableProvider(),
                    entry.profileAddress,
                    entry.authority
                  )
                : createFollowTx(
                    getWritableProvider(),
                    entry.profileAddress,
                    entry.authority
                  )
          )
        }
      >
        {follow ? "Unfollow" : "Follow"}
      </button>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">S</span>
          <div>
            <strong>Social V1</strong>
            <span className="muted">Pixel social world on Solana</span>
          </div>
        </div>
        <nav className="topnav">
          <button className={`topnav-tab ${activeTab === "home" ? "active" : ""}`} onClick={() => setActiveTab("home")}>Home</button>
          <button className={`topnav-tab ${activeTab === "base" ? "active" : ""}`} onClick={() => setActiveTab("base")}>Base Camp</button>
          <button className={`topnav-tab ${activeTab === "profile" ? "active" : ""}`} onClick={() => setActiveTab("profile")}>Profile</button>
          <button className={`topnav-tab ${activeTab === "tweets" ? "active" : ""}`} onClick={() => setActiveTab("tweets")}>Tweets</button>
          <button className={`topnav-tab ${activeTab === "vault" ? "active" : ""}`} onClick={() => setActiveTab("vault")}>Vault</button>
          <button className={`topnav-tab ${activeTab === "admin" ? "active" : ""}`} onClick={() => setActiveTab("admin")}>Admin</button>
        </nav>
      </header>

      {activeTab === "home" ? (
        <>
      <section className="hero hero-grid" id="overworld">
        <div className="hero-copy">
          <span className="eyebrow">Pixel overworld</span>
          <h1 className="hero-title">
            <span>Build your social town</span>
            <span className="hero-title-accent">Earn your legend</span>
          </h1>
          <p>
            This homepage is now the world entrance, but the actions below are real:
            create a profile, post tweets, like, claim rewards, initialize mints,
            and stake milestone NFTs against the same Anchor program.
          </p>
          <div className="pill-row">
          <span className="pill active">Play on localnet</span>
            <span className={`pill ${txReady ? "active" : ""}`}>
              {browserWritesEnabled
                ? "Wallet online"
                : localKeypairWritesEnabled
                  ? "Keypair online"
                  : "Readonly scout"}
            </span>
            <span className="pill">
              {rewardConfig ? "Reward beacon live" : "Beacon missing"}
            </span>
          </div>
          <div className="actions hero-actions">
            <a className="btn primary btn-link" href="#base-camp">
              Enter Base Camp
            </a>
            <a className="btn ghost btn-link" href="#tweet-plaza">
              Visit Tweet Plaza
            </a>
          </div>
          <div className="hero-metrics">
            <div className="metric-chip">
              <span>Avatar</span>
              <strong>{viewer?.profile ? viewer.profile.name : shortAddress(connectedAddress)}</strong>
            </div>
            <div className="metric-chip">
              <span>Beacon</span>
              <strong>{rewardConfig ? "Synced" : "Offline"}</strong>
            </div>
            <div className="metric-chip">
              <span>Epoch</span>
              <strong>{appState?.currentEpoch ?? "-"}</strong>
            </div>
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-visual-frame">
            <img className="hero-visual pixel-art" src={pixelHero} alt="Pixel social world preview" />
          </div>
          <div className="hero-stat-row">
            <div className="hero-stat">
              <span className="hero-stat-label">World state</span>
              <strong>
                {browserWritesEnabled || localKeypairWritesEnabled
                  ? "Ready to play"
                  : "Preview only"}
              </strong>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-label">Wallet</span>
              <strong className="code">{shortAddress(connectedAddress, 6, 6)}</strong>
            </div>
          </div>
          <div className="hero-note">
            Posts, likes, rewards, NFT minting, staking, and config updates are now
            wired as real actions below. Readonly mode keeps the world visible without
            signing anything.
          </div>
        </div>
      </section>

      <section className="quest-strip">
        <article className="quest-card">
          <span className="quest-tag">01</span>
          <strong>Profile Hut</strong>
          <span className="muted">
            Create your on-chain identity, inspect stats, and initialize your milestone NFT mint.
          </span>
        </article>
        <article className="quest-card">
          <span className="quest-tag">02</span>
          <strong>Tweet Plaza</strong>
          <span className="muted">
            Publish tweets, soft-delete your own posts, like other authors, and trigger rewards.
          </span>
        </article>
        <article className="quest-card">
          <span className="quest-tag">03</span>
          <strong>Vault Room</strong>
          <span className="muted">
            Watch token/NFT balances, inspect the stake state, and lock or unlock your milestone asset.
          </span>
        </article>
      </section>
        </>
      ) : null}

      {(notice || error || loadingState) && (
        <section className="status-stack">
          {loadingState ? <div className="banner">Refreshing world state...</div> : null}
          {notice ? <div className="banner">{notice}</div> : null}
          {error ? <div className="banner warn">{error}</div> : null}
        </section>
      )}

      {localnetReadonly ? (
        <section className="status-stack">
          <div className="banner warn">
            当前前端连接的是 localnet RPC（{environment.rpcUrl}）。Browser Wallet 模式默认只读；
            要在网页里真正提交交易，请切到 Local Keypair 调试模式，或继续使用本地脚本。
          </div>
        </section>
      ) : null}

      {activeTab === "base" ? (
        <>
      <section className="section-heading" id="base-camp">
        <span className="eyebrow">Base Camp</span>
        <h2>Connect wallet. Check beacon. Start building.</h2>
      </section>

      <section className="grid two-up top-deck">
        <WalletPanel
          mode={mode}
          connectedAddress={connectedAddress}
          walletAvailable={walletAvailable}
          localnetReadonly={localnetReadonly}
          busy={!!busyAction}
          localKeypairSecret={localKeypairSecret}
          localKeypairLoaded={!!localKeypair}
          localKeypairError={localKeypairError}
          onModeChange={setMode}
          onConnect={connectWallet}
          onDisconnect={disconnectWallet}
          onLocalKeypairSecretChange={(value) => {
            setLocalKeypairSecret(value);
            setLocalKeypairError(null);
          }}
          onLoadLocalKeypair={loadLocalKeypair}
          onClearLocalKeypair={clearLocalKeypair}
        />
        <RewardConfigCard
          config={rewardConfig}
          loading={loadingState}
          error={error}
          environment={environment}
          onRefresh={refreshState}
        />
      </section>
        </>
      ) : null}

      {activeTab === "profile" ? (
        <>
      <section className="section-heading" id="profile-station">
        <span className="eyebrow">Profile Hut</span>
        <h2>Create your identity. Prep the NFT badge.</h2>
      </section>

      <section className="grid two-up">
        <section className="card">
          <div>
            <h2>Your Avatar</h2>
            <p className="muted">
              Profile creation is the first gate. Without it you cannot post, like, or receive reward flows.
            </p>
          </div>

          {viewer?.profile ? (
            <div className="stack">
              <button
                className="profile-card profile-trigger"
                type="button"
                onClick={() => setSocialListMode("followers")}
              >
                <Avatar name={viewer.profile.name} uri={viewer.profile.avatarUri} />
                <div className="profile-copy">
                  <strong>{viewer.profile.name}</strong>
                  <span className="muted">{viewer.profile.bio || "No bio yet."}</span>
                  <span className="code">{viewer.profile.authority}</span>
                </div>
              </button>
              <div className="stats-row">
                <div className="stat-box">
                  <span>Tweets</span>
                  <strong>{viewer.profile.tweetCount}</strong>
                </div>
                <button
                  type="button"
                  className="stat-box stat-box-button"
                  onClick={() => setSocialListMode("followers")}
                >
                  <span>Followers</span>
                  <strong>{viewer.profile.followersCount}</strong>
                </button>
                <button
                  type="button"
                  className="stat-box stat-box-button"
                  onClick={() => setSocialListMode("following")}
                >
                  <span>Following</span>
                  <strong>{viewer.profile.followingCount}</strong>
                </button>
                <div className="stat-box">
                  <span>Comments Received</span>
                  <strong>{viewer.profile.commentsReceivedCount}</strong>
                </div>
                <div className="stat-box">
                  <span>Token Rewards</span>
                  <strong>{viewer.profile.tokenRewardsEarned}</strong>
                </div>
                <div className="stat-box">
                  <span>NFT Rewards</span>
                  <strong>{viewer.profile.nftRewardsEarned}</strong>
                </div>
              </div>
              <div className="actions">
                <button
                  className="btn secondary"
                  disabled={!connectedAddress || !!busyAction}
                  onClick={() =>
                    void runAction("Airdrop SOL", async () =>
                      airdropSol(createConnection(), new PublicKey(connectedAddress!))
                    )
                  }
                >
                  Airdrop 1 SOL
                </button>
                <button
                  className="btn primary"
                  disabled={
                    !(browserWritesEnabled || localKeypairWritesEnabled) ||
                    !!busyAction ||
                    !rewardConfig ||
                    viewer.nftMintInitialized
                  }
                  onClick={() =>
                    void runAction("Initialize NFT Mint", async () =>
                      createNftMintTx(getWritableProvider())
                    )
                  }
                >
                  {viewer.nftMintInitialized ? "NFT Mint Ready" : "Init My NFT Mint"}
                </button>
              </div>
              <GuardMessage text={initNftMintGuard} />
            </div>
          ) : (
            <div className="stack">
              <div className="form-grid">
                <label className="field">
                  <span>Name</span>
                  <input
                    className="input"
                    value={profileForm.name}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Pixel builder"
                  />
                </label>
                <label className="field">
                  <span>Avatar URI</span>
                  <input
                    className="input"
                    value={profileForm.avatarUri}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        avatarUri: event.target.value,
                      }))
                    }
                    placeholder="https://..."
                  />
                </label>
                <label className="field full">
                  <span>Bio</span>
                  <textarea
                    className="textarea"
                    value={profileForm.bio}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, bio: event.target.value }))
                    }
                    placeholder="Builder of the next social district."
                  />
                </label>
              </div>
              <div className="actions">
                <button
                  className="btn primary"
                  disabled={!!busyAction || !!createProfileGuard}
                  onClick={() =>
                    void runGuardedAction("Create Profile", createProfileGuard, async () =>
                      createProfileTx(getWritableProvider(), profileForm)
                    )
                  }
                >
                  Create Profile
                </button>
              </div>
              <GuardMessage text={createProfileGuard} />
            </div>
          )}
        </section>

        <section className="card">
          <div>
            <h2>Mint & Balance Prep</h2>
            <p className="muted">
              Your milestone NFT mint must exist before `create_tweet` can reach the badge path. The token mint must exist before like rewards and unstake rewards can settle.
            </p>
          </div>
          <div className="stats-row">
            <div className="stat-box">
              <span>Wallet</span>
              <strong>{shortAddress(connectedAddress, 6, 6)}</strong>
            </div>
            <div className="stat-box">
              <span>Profile</span>
              <strong>{viewer?.profile ? "Loaded" : "Not found"}</strong>
            </div>
            <div className="stat-box">
              <span>NFT Mint</span>
              <strong>{viewer?.nftMintInitialized ? "Ready" : "Missing"}</strong>
            </div>
            <div className="stat-box">
              <span>Token Mint</span>
              <strong>{viewer?.tokenMintInitialized ? "Ready" : "Missing"}</strong>
            </div>
          </div>
          <div className="kv">
            <div className="kv-row">
              <span className="kv-key">Profile PDA</span>
              <span className="kv-value code">{viewer?.profilePda ?? "Create profile first"}</span>
            </div>
            <div className="kv-row">
              <span className="kv-key">NFT Mint PDA</span>
              <span className="kv-value code">{viewer?.nftMintAddress ?? "Unavailable"}</span>
            </div>
            <div className="kv-row">
              <span className="kv-key">Token Mint PDA</span>
              <span className="kv-value code">{viewer?.tokenMintAddress ?? "Unavailable"}</span>
            </div>
          </div>
        </section>
      </section>
        </>
      ) : null}

      {activeTab === "tweets" ? (
        <>
      <section className="section-heading" id="tweet-plaza">
        <span className="eyebrow">Tweet Plaza</span>
        <h2>Post, like, delete, and settle rewards.</h2>
      </section>

      <section className="grid two-up">
        <section className="card">
          <div>
            <h2>Tweet Composer</h2>
            <p className="muted">
              Posting requires a profile, the global reward config, and your NFT mint account.
            </p>
          </div>
          <label className="field full">
            <span>Content</span>
            <textarea
              className="textarea textarea-lg"
              value={tweetContent}
              onChange={(event) => setTweetContent(event.target.value)}
              placeholder="Share a town update..."
            />
          </label>
          <div className="actions">
            <button
              className="btn primary"
              disabled={!!busyAction || !!createTweetGuard}
              onClick={() =>
                void runGuardedAction("Create Tweet", createTweetGuard, async () => {
                  const signature = await createTweetTx(getWritableProvider(), tweetContent);
                  setTweetContent("");
                  return signature;
                })
              }
            >
              Create Tweet
            </button>
          </div>
          <GuardMessage text={createTweetGuard} />
        </section>

        <section className="card">
          <div>
            <h2>Town Feed</h2>
            <p className="muted">
              All tweets are loaded directly from the program accounts. Like buttons and reward actions react to your current wallet and profile state.
            </p>
          </div>
          <div className="tweet-list">
            {appState?.tweets.length ? (
              appState.tweets.map((tweet) => {
                const isOwn = tweet.author === connectedAddress;
                const canLike = !!viewer?.profile && !isOwn && !tweet.deleted && !tweet.viewerLike;
                const canFollow = !!viewer?.profile && !isOwn && !tweet.viewerFollow;
                const canUnfollow = !!viewer?.profile && !isOwn && !!tweet.viewerFollow;
                const commentText = commentDrafts[tweet.address] ?? "";
                const createCommentGuard =
                  commentGuard(
                    writeModeGuard("评论"),
                    !!viewer?.profile,
                    isOwn,
                    tweet.deleted,
                    commentText
                  );
                const canClaimAsAuthor =
                  !!viewer?.profile &&
                  isOwn &&
                  !!tweet.claimableAuthorLike &&
                  !tweet.deleted &&
                  !!viewer?.tokenMintInitialized;
                return (
                  <article className="tweet-card" key={tweet.address}>
                    <div className="tweet-head">
                      <button
                        type="button"
                        className="profile-card compact profile-trigger"
                        onClick={() =>
                          openSocialProfile(
                            resolveSocialProfileLink(
                              tweet.author,
                              tweet.authorProfileAddress,
                              tweet.authorName,
                              tweet.authorAvatarUri
                            )
                          )
                        }
                      >
                        <Avatar name={tweet.authorName} uri={tweet.authorAvatarUri} />
                        <div className="profile-copy">
                          <strong>{tweet.authorName}</strong>
                          <span className="muted">{shortAddress(tweet.author, 5, 5)}</span>
                        </div>
                      </button>
                      <div className="actions actions-inline">
                        {!isOwn ? (
                          <button
                            className={`btn ${tweet.viewerFollow ? "ghost" : "secondary"}`}
                            disabled={
                              !txReady || !!busyAction || (!canFollow && !canUnfollow)
                            }
                            onClick={() =>
                              void runGuardedAction(
                                tweet.viewerFollow ? "Cancel Follow" : "Create Follow",
                                writeModeGuard(tweet.viewerFollow ? "取关" : "关注")
                                  ? writeModeGuard(tweet.viewerFollow ? "取关" : "关注")
                                  : !viewer?.profile
                                    ? "先创建 Profile。"
                                    : tweet.viewerFollow
                                      ? null
                                      : canFollow
                                        ? null
                                        : "当前已经关注了这位作者。",
                                async () =>
                                  tweet.viewerFollow
                                    ? cancelFollowTx(
                                        getWritableProvider(),
                                        tweet.authorProfileAddress,
                                        tweet.author
                                      )
                                    : createFollowTx(
                                        getWritableProvider(),
                                        tweet.authorProfileAddress,
                                        tweet.author
                                      )
                              )
                            }
                          >
                            {tweet.viewerFollow ? "Following" : "Follow"}
                          </button>
                        ) : null}
                        <span className={`tag ${tweet.deleted ? "danger" : ""}`}>
                          {tweet.deleted ? "Deleted" : "Live"}
                        </span>
                      </div>
                    </div>
                    <p className="tweet-content">{tweet.content}</p>
                    <div className="stats-row">
                      <div className="stat-box">
                        <span>Likes</span>
                        <strong>{tweet.likesCount}</strong>
                      </div>
                      <div className="stat-box">
                        <span>Rewardable</span>
                        <strong>{tweet.rewardableLikesCount}</strong>
                      </div>
                      <div className="stat-box">
                        <span>Comments</span>
                        <strong>{tweet.commentsCount}</strong>
                      </div>
                      <div className="stat-box">
                        <span>Created</span>
                        <strong>{formatTimestamp(tweet.createdAt)}</strong>
                      </div>
                    </div>
                    {tweet.viewerLike ? (
                      <div className="banner">
                        You already liked this post.
                        {tweet.viewerLike.rewardClaimed
                          ? " Author reward already settled."
                          : " Author reward still claimable."}
                      </div>
                    ) : null}
                    {isOwn && tweet.claimableAuthorLike ? (
                      <div className="banner">
                        This tweet has an unclaimed like reward ready for the author to settle.
                      </div>
                    ) : null}
                    {!isOwn && !tweet.deleted && !viewer?.profile ? (
                      <div className="banner warn">先创建 Profile，才能点赞或领取奖励。</div>
                    ) : null}
                    {isOwn && !tweet.deleted && !viewer?.tokenMintInitialized ? (
                      <div className="banner warn">当前链上还没有 Token Mint，作者奖励无法结算。</div>
                    ) : null}
                    {!isOwn && !tweet.deleted && !viewer?.tokenMintInitialized ? (
                      <div className="banner warn">当前链上还没有 Token Mint，点赞奖励无法结算。</div>
                    ) : null}
                    <div className="actions">
                      {isOwn ? (
                        <>
                          <button
                            className="btn ghost"
                            disabled={!txReady || !!busyAction || tweet.deleted}
                            onClick={() =>
                              void runAction("Delete Tweet", async () =>
                                deleteTweetTx(getWritableProvider(), tweet.address)
                              )
                            }
                          >
                            Delete Tweet
                          </button>
                          <button
                            className="btn secondary"
                            disabled={!txReady || !!busyAction || !canClaimAsAuthor}
                            onClick={() =>
                              void runGuardedAction(
                                "Send Reward to Author",
                                writeModeGuard("结算作者奖励")
                                  ? writeModeGuard("结算作者奖励")
                                  : !viewer?.profile
                                    ? "先创建 Profile。"
                                    : tweet.deleted
                                      ? "tweet 已删除，不能继续结算奖励。"
                                      : !tweet.claimableAuthorLike
                                        ? "这条 tweet 当前没有待结算的点赞奖励。"
                                        : !viewer?.tokenMintInitialized
                                          ? "先创建全局 Token Mint。"
                                          : null,
                                async () => mintLikeRewardTx(getWritableProvider(), tweet)
                              )
                            }
                          >
                            Send Reward to Author
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn primary"
                            disabled={!txReady || !!busyAction || !canLike}
                            onClick={() =>
                            void runGuardedAction(
                                "Create Like",
                                writeModeGuard("点赞")
                                  ? writeModeGuard("点赞")
                                  : !viewer?.profile
                                    ? "先创建 Profile。"
                                    : tweet.deleted
                                      ? "这条 tweet 已经删除，不能点赞。"
                                      : isOwn
                                        ? "不能给自己的 tweet 点赞。"
                                        : tweet.viewerLike
                                          ? "你已经点过赞了。"
                                          : null,
                                async () => createLikeTx(getWritableProvider(), tweet.address)
                              )
                            }
                          >
                            Like Tweet
                          </button>
                        </>
                      )}
                    </div>

                    <section className="tweet-comments">
                      <div className="tweet-comments-head">
                        <strong>Comments</strong>
                        <span className="muted">{tweet.comments.length} visible</span>
                      </div>
                      <div className="comment-list">
                        {tweet.comments.length ? (
                          tweet.comments.map((comment: CommentView) => {
                            const isOwnComment = comment.author === connectedAddress;
                            return (
                              <article className="comment-card" key={comment.address}>
                                <button
                                  type="button"
                                  className="profile-card compact profile-trigger"
                                  onClick={() =>
                                    openSocialProfile(
                                      resolveSocialProfileLink(
                                        comment.author,
                                        comment.authorProfileAddress,
                                        comment.authorName,
                                        comment.authorAvatarUri
                                      )
                                    )
                                  }
                                >
                                  <Avatar
                                    name={comment.authorName}
                                    uri={comment.authorAvatarUri}
                                  />
                                  <div className="profile-copy">
                                    <strong>{comment.authorName}</strong>
                                    <span className="muted">
                                      {formatTimestamp(comment.createdAt)}
                                    </span>
                                  </div>
                                </button>
                                <p className="tweet-content">{comment.content}</p>
                                {isOwnComment ? (
                                  <div className="actions">
                                    <button
                                      className="btn ghost"
                                      disabled={!txReady || !!busyAction}
                                      onClick={() =>
                                        void runGuardedAction(
                                          "Delete Comment",
                                          writeModeGuard("删除评论"),
                                          async () =>
                                            deleteCommentTx(
                                              getWritableProvider(),
                                              tweet,
                                              comment
                                            )
                                        )
                                      }
                                    >
                                      Delete Comment
                                    </button>
                                  </div>
                                ) : null}
                              </article>
                            );
                          })
                        ) : (
                          <div className="empty-state compact">No comments yet.</div>
                        )}
                      </div>
                      <label className="field full">
                        <span>Leave a comment</span>
                        <textarea
                          className="textarea"
                          value={commentText}
                          onChange={(event) =>
                            setCommentDrafts((current) => ({
                              ...current,
                              [tweet.address]: event.target.value,
                            }))
                          }
                          placeholder="Say something about this tweet..."
                        />
                      </label>
                      <div className="actions">
                        <button
                          className="btn primary"
                          disabled={!!busyAction || !!createCommentGuard}
                          onClick={() =>
                            void runGuardedAction(
                              "Create Comment",
                              createCommentGuard,
                              async () => {
                                const sig = await createCommentTx(
                                  getWritableProvider(),
                                  tweet,
                                  commentText
                                );
                                setCommentDrafts((current) => ({
                                  ...current,
                                  [tweet.address]: "",
                                }));
                                return sig;
                              }
                            )
                          }
                        >
                          Comment
                        </button>
                      </div>
                      <GuardMessage text={createCommentGuard} />
                    </section>
                  </article>
                );
              })
            ) : (
              <div className="empty-state">No tweets on this world yet.</div>
            )}
          </div>
        </section>
      </section>
        </>
      ) : null}

      {activeTab === "vault" ? (
        <>
      <section className="section-heading" id="vault">
        <span className="eyebrow">Vault Room</span>
        <h2>Track badge, balance, and staking.</h2>
      </section>

      <section className="grid two-up">
        <section className="card">
          <div>
            <h2>NFT & Stake</h2>
            <p className="muted">
              Staking requires your milestone NFT in your wallet and at least one live tweet owned by you.
            </p>
          </div>
          <div className="stats-row">
            <div className="stat-box">
              <span>NFT Mint</span>
              <strong>{viewer?.nftMintInitialized ? "Ready" : "Missing"}</strong>
            </div>
            <div className="stat-box">
              <span>NFT Balance</span>
              <strong>{viewer?.nftBalance ?? "0"}</strong>
            </div>
            <div className="stat-box">
              <span>Stake</span>
              <strong>{viewer?.stake ? "Locked" : "Idle"}</strong>
            </div>
          </div>
          <div className="kv">
            <div className="kv-row">
              <span className="kv-key">Stake source tweet</span>
              <span className="kv-value code">{stakeSourceTweet?.address ?? "Need a live tweet"}</span>
            </div>
            <div className="kv-row">
              <span className="kv-key">Stake account</span>
              <span className="kv-value code">{viewer?.stake?.address ?? "Not staked"}</span>
            </div>
            <div className="kv-row">
              <span className="kv-key">Current epoch</span>
              <span className="kv-value">{appState?.currentEpoch ?? "-"}</span>
            </div>
          </div>
          <div className="actions">
            <button
              className="btn primary"
              disabled={!!busyAction || !!stakeGuard}
              onClick={() =>
                stakeSourceTweet &&
                void runGuardedAction("Create Stake", stakeGuard, async () =>
                  createStakeTx(getWritableProvider(), stakeSourceTweet.address)
                )
              }
            >
              Stake NFT
            </button>
            <button
              className="btn secondary"
              disabled={!!busyAction || !!unstakeGuard}
              onClick={() =>
                void runGuardedAction("Unstake NFT", unstakeGuard, async () =>
                  unstakeTx(getWritableProvider())
                )
              }
            >
              Unstake NFT
            </button>
          </div>
          <GuardMessage text={stakeGuard || unstakeGuard} />
        </section>

        <section className="card">
          <div>
            <h2>Balances & Rewards</h2>
            <p className="muted">
              The token mint is global. Like rewards and unstake rewards settle into your associated token account when the mint exists.
            </p>
          </div>
          <div className="stats-row">
            <div className="stat-box">
              <span>Token Mint</span>
              <strong>{viewer?.tokenMintInitialized ? "Ready" : "Missing"}</strong>
            </div>
            <div className="stat-box">
              <span>Token Balance</span>
              <strong>{viewer?.tokenBalance ?? "0"}</strong>
            </div>
            <div className="stat-box">
              <span>Epoch Reward</span>
              <strong>{rewardConfig?.stakeRewardPerEpoch ?? "0"}</strong>
            </div>
          </div>
          <div className="kv">
            <div className="kv-row">
              <span className="kv-key">Like reward amount</span>
              <span className="kv-value">{rewardConfig?.likeRewardAmount ?? "0"}</span>
            </div>
            <div className="kv-row">
              <span className="kv-key">Stake base reward</span>
              <span className="kv-value">{rewardConfig?.stakeBaseRewardAmount ?? "0"}</span>
            </div>
            <div className="kv-row">
              <span className="kv-key">Min tweets before like reward</span>
              <span className="kv-value">{rewardConfig?.minTweetsBeforeLikeReward ?? "-"}</span>
            </div>
          </div>
        </section>
      </section>
        </>
      ) : null}

      {activeTab === "admin" ? (
        <>
      <section className="section-heading" id="admin-forge">
        <span className="eyebrow">Admin Forge</span>
        <h2>Tune the reward beacon and token mint.</h2>
      </section>

      <section className="grid two-up">
        <section className="card">
          <div>
            <h2>Beacon Config</h2>
            <p className="muted">
              Only the reward-config authority can update an existing beacon. If the beacon does not exist yet, the first connected wallet can initialize it.
            </p>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Name</span>
              <input className="input" value={rewardConfigForm.name} onChange={(event) => setRewardConfigForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="field">
              <span>Symbol</span>
              <input className="input" value={rewardConfigForm.symbol} onChange={(event) => setRewardConfigForm((current) => ({ ...current, symbol: event.target.value }))} />
            </label>
            <label className="field full">
              <span>Metadata URI</span>
              <input className="input" value={rewardConfigForm.uri} onChange={(event) => setRewardConfigForm((current) => ({ ...current, uri: event.target.value }))} />
            </label>
            <label className="field"><span>Milestone Tweets</span><input className="input" value={rewardConfigForm.milestoneTweetCount} onChange={(event) => setRewardConfigForm((current) => ({ ...current, milestoneTweetCount: event.target.value }))} /></label>
            <label className="field"><span>Like Reward</span><input className="input" value={rewardConfigForm.likeRewardAmount} onChange={(event) => setRewardConfigForm((current) => ({ ...current, likeRewardAmount: event.target.value }))} /></label>
            <label className="field"><span>Stake Base</span><input className="input" value={rewardConfigForm.stakeBaseRewardAmount} onChange={(event) => setRewardConfigForm((current) => ({ ...current, stakeBaseRewardAmount: event.target.value }))} /></label>
            <label className="field"><span>Stake / Epoch</span><input className="input" value={rewardConfigForm.stakeRewardPerEpoch} onChange={(event) => setRewardConfigForm((current) => ({ ...current, stakeRewardPerEpoch: event.target.value }))} /></label>
            <label className="field"><span>Daily Tweet Cap</span><input className="input" value={rewardConfigForm.dailyTweetRewardCap} onChange={(event) => setRewardConfigForm((current) => ({ ...current, dailyTweetRewardCap: event.target.value }))} /></label>
            <label className="field"><span>Daily Like Cap</span><input className="input" value={rewardConfigForm.dailyLikeRewardCap} onChange={(event) => setRewardConfigForm((current) => ({ ...current, dailyLikeRewardCap: event.target.value }))} /></label>
            <label className="field"><span>Rewardable Likes / Tweet</span><input className="input" value={rewardConfigForm.maxRewardableLikesPerTweet} onChange={(event) => setRewardConfigForm((current) => ({ ...current, maxRewardableLikesPerTweet: event.target.value }))} /></label>
            <label className="field"><span>Min Tweets Before Like Reward</span><input className="input" value={rewardConfigForm.minTweetsBeforeLikeReward} onChange={(event) => setRewardConfigForm((current) => ({ ...current, minTweetsBeforeLikeReward: event.target.value }))} /></label>
          </div>
          <div className="actions">
            {!rewardConfig ? (
              <button className="btn primary" disabled={!!busyAction || !!initRewardConfigGuard} onClick={() => void runGuardedAction("Init RewardConfig", initRewardConfigGuard, async () => initRewardConfigTx(getWritableProvider(), rewardConfigForm))}>
                Init RewardConfig
              </button>
            ) : (
              <button className="btn primary" disabled={!!busyAction || !!updateRewardConfigGuard} onClick={() => void runGuardedAction("Update RewardConfig", updateRewardConfigGuard, async () => updateRewardConfigTx(getWritableProvider(), rewardConfigForm))}>
                Update RewardConfig
              </button>
            )}
          </div>
          <GuardMessage text={!rewardConfig ? initRewardConfigGuard : updateRewardConfigGuard} />
        </section>

        <section className="card card-spotlight">
          <div>
            <h2>Forge Tasks</h2>
            <p className="muted">
              Global mint setup lives here. Each creator still needs to initialize their own NFT mint in the Profile Hut.
            </p>
          </div>
          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-kicker">M1</span>
              <strong>Global Token Mint</strong>
              <span className="muted">Required before like rewards and unstake rewards can mint tokens.</span>
            </div>
            <div className="feature-item">
              <span className="feature-kicker">M2</span>
              <strong>Beacon Authority</strong>
              <span className="muted">
                Current authority: {rewardConfig?.authority ? shortAddress(rewardConfig.authority, 6, 6) : "Not initialized"}
              </span>
            </div>
          </div>
          <div className="actions">
            <button
              className="btn secondary"
              disabled={!!busyAction || !!createTokenMintGuard}
              onClick={() =>
                void runGuardedAction("Create Token Mint", createTokenMintGuard, async () =>
                  createTokenMintTx(getWritableProvider())
                )
              }
            >
              {viewer?.tokenMintInitialized ? "Token Mint Ready" : "Create Token Mint"}
            </button>
          </div>
          <GuardMessage text={createTokenMintGuard} />
        </section>
      </section>
        </>
      ) : null}

      {activeTab === "home" ? (
        <>
      <section className="section-heading">
        <span className="eyebrow">Quest Board</span>
        <h2>What is already live here.</h2>
      </section>

      <section className="grid two-up">
        <FeatureBoard />
        <section className="card card-spotlight">
          <div>
            <h2>Live World Snapshot</h2>
            <p className="muted">
              This panel reflects the current loaded state of the local cluster and your wallet context.
            </p>
          </div>
          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-kicker">T</span>
              <strong>Total Tweets</strong>
              <span className="muted">{appState?.tweets.length ?? 0}</span>
            </div>
            <div className="feature-item">
              <span className="feature-kicker">P</span>
              <strong>Profile Ready</strong>
              <span className="muted">{viewer?.profile ? "Yes" : "No"}</span>
            </div>
            <div className="feature-item">
              <span className="feature-kicker">S</span>
              <strong>Stake State</strong>
              <span className="muted">{viewer?.stake ? "Locked" : "Idle"}</span>
            </div>
          </div>
        </section>
      </section>
        </>
      ) : null}

      {socialListMode ? (
        <div className="overlay" onClick={() => setSocialListMode(null)}>
          <section
            className="overlay-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="overlay-head">
              <div>
                <span className="eyebrow">
                  {socialListMode === "followers" ? "Followers" : "Following"}
                </span>
                <h2>
                  {socialListMode === "followers"
                    ? "People following you"
                    : "People you follow"}
                </h2>
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setSocialListMode(null)}
              >
                Close
              </button>
            </div>
            <div className="overlay-list">
              {socialListEntries.length ? (
                socialListEntries.map((entry) => (
                  <article className="social-entry" key={entry.profileAddress}>
                    <button
                      type="button"
                      className="profile-card compact profile-trigger"
                      onClick={() => openSocialProfile(entry)}
                    >
                      <Avatar name={entry.name} uri={entry.avatarUri} />
                      <div className="profile-copy">
                        <strong>{entry.name}</strong>
                        <span className="muted">{entry.bio || "No bio yet."}</span>
                        <span className="code">{shortAddress(entry.authority, 6, 6)}</span>
                      </div>
                    </button>
                    <div className="actions actions-inline">
                      {renderSocialFollowAction(entry)}
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  {socialListMode === "followers"
                    ? "No followers yet."
                    : "You are not following anyone yet."}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {selectedSocialProfile ? (
        <div className="overlay" onClick={closeSocialProfile}>
          <section
            className="overlay-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="overlay-head">
              <div>
                <span className="eyebrow">Profile</span>
                <h2>{selectedSocialProfile.name}</h2>
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={closeSocialProfile}
              >
                Close
              </button>
            </div>

            <div className="stack">
              <div className="profile-card">
                <Avatar
                  name={selectedSocialProfile.name}
                  uri={selectedSocialProfile.avatarUri}
                />
                <div className="profile-copy">
                  <strong>{selectedSocialProfile.name}</strong>
                  <span className="muted">
                    {selectedSocialProfile.bio || "No bio yet."}
                  </span>
                  <span className="code">
                    {shortAddress(selectedSocialProfile.authority, 6, 6)}
                  </span>
                </div>
                <div className="actions actions-inline">
                  {renderSocialFollowAction(selectedSocialProfile)}
                </div>
              </div>

              <div className="stats-row">
                <div className="stat-box">
                  <span>Tweets</span>
                  <strong>{selectedSocialProfile.tweetCount}</strong>
                </div>
                <div className="stat-box">
                  <span>Followers</span>
                  <strong>{selectedSocialProfile.followersCount}</strong>
                </div>
                <div className="stat-box">
                  <span>Following</span>
                  <strong>{selectedSocialProfile.followingCount}</strong>
                </div>
                <div className="stat-box">
                  <span>Comments Received</span>
                  <strong>{selectedSocialProfile.commentsReceivedCount}</strong>
                </div>
              </div>

              {selectedProfileFollow ? (
                <div className="banner">You are already following this builder.</div>
              ) : null}

              <section className="card">
                <div>
                  <h2>Recent Tweets</h2>
                  <p className="muted">
                    Latest visible tweets from this profile on the current cluster.
                  </p>
                </div>
                <div className="tweet-list compact-list">
                  {selectedProfileTweets.length ? (
                    selectedProfileTweets.slice(0, 5).map((tweet) => (
                      <article className="tweet-card" key={tweet.address}>
                        <p className="tweet-content">{tweet.content}</p>
                        <div className="stats-row">
                          <div className="stat-box">
                            <span>Likes</span>
                            <strong>{tweet.likesCount}</strong>
                          </div>
                          <div className="stat-box">
                            <span>Comments</span>
                            <strong>{tweet.commentsCount}</strong>
                          </div>
                          <div className="stat-box">
                            <span>Created</span>
                            <strong>{formatTimestamp(tweet.createdAt)}</strong>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="empty-state compact">
                      No visible tweets from this profile yet.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
