import type { EnvironmentStatus, RewardConfigView } from "../lib/socialClient";

type Props = {
  config: RewardConfigView | null;
  loading: boolean;
  error: string | null;
  environment: EnvironmentStatus;
  onRefresh: () => Promise<void>;
};

const rows: Array<[keyof RewardConfigView, string]> = [
  ["authority", "Authority"],
  ["name", "NFT Name"],
  ["symbol", "NFT Symbol"],
  ["milestoneTweetCount", "Milestone Tweet Count"],
  ["likeRewardAmount", "Like Reward Amount"],
  ["stakeBaseRewardAmount", "Stake Base Reward"],
  ["stakeRewardPerEpoch", "Stake Reward / Epoch"],
  ["dailyTweetRewardCap", "Daily Tweet Cap"],
  ["dailyLikeRewardCap", "Daily Like Reward Cap"],
  ["maxRewardableLikesPerTweet", "Rewardable Likes / Tweet"],
  ["minTweetsBeforeLikeReward", "Min Tweets Before Like Reward"],
];

export function RewardConfigCard({
  config,
  loading,
  error,
  environment,
  onRefresh,
}: Props) {
  return (
    <section className="card">
      <div>
        <h2>Beacon Terminal</h2>
        <p className="muted">
          Every reward path in V1 reads the same global beacon. This terminal is
          the live proof that the frontend can reach the Anchor program on your
          target RPC.
        </p>
      </div>

      <div className="kv">
        <div className="kv-row">
          <span className="kv-key">Program ID</span>
          <span className="kv-value code">{environment.programId}</span>
        </div>
        <div className="kv-row">
          <span className="kv-key">RPC URL</span>
          <span className="kv-value code">{environment.rpcUrl}</span>
        </div>
        <div className="kv-row">
          <span className="kv-key">Beacon PDA</span>
          <span className="kv-value code">{environment.rewardConfigPda}</span>
        </div>
      </div>

      <div className="actions">
        <button className="btn secondary" disabled={loading} onClick={() => void onRefresh()}>
          {loading ? "Refreshing..." : "Sync Beacon"}
        </button>
      </div>

      {error ? <div className="banner warn">{error}</div> : null}

      {!config && !loading ? (
        <div className="banner warn">
          No global reward beacon was found on this RPC endpoint yet. The frontend
          is alive, but this cluster still needs the config account.
        </div>
      ) : null}

      {config ? (
        <div className="kv">
          {rows.map(([field, label]) => (
            <div className="kv-row" key={field}>
              <span className="kv-key">{label}</span>
              <span className="kv-value code">{String(config[field])}</span>
            </div>
          ))}
          <div className="kv-row">
            <span className="kv-key">Metadata URI</span>
            <span className="kv-value code">{config.uri}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
