export const DEFAULT_RPC_URL =
  import.meta.env.VITE_RPC_URL ?? "http://127.0.0.1:8899";

export const PROGRAM_ID = "9BXzYsCbqFLwTzkqognW18JiZa7DrzhccsifMHSjcwxS";

export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const ASSOCIATED_TOKEN_PROGRAM_ID =
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
export const TOKEN_METADATA_PROGRAM_ID =
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

export function isLocalRpcUrl(rpcUrl: string) {
  return /127\.0\.0\.1|localhost/i.test(rpcUrl);
}

export const DEFAULT_REWARD_CONFIG_FORM = {
  name: "10 Tweets Badge",
  symbol: "TWEET10",
  uri: "https://example.com/nft",
  milestoneTweetCount: "10",
  likeRewardAmount: "100",
  stakeBaseRewardAmount: "0",
  stakeRewardPerEpoch: "200",
  dailyTweetRewardCap: "10",
  dailyLikeRewardCap: "10",
  maxRewardableLikesPerTweet: "5",
  minTweetsBeforeLikeReward: "1",
} as const;

export const APP_FEATURES = [
  {
    title: "Profile",
    body: "Create and inspect on-chain user profiles with name, bio, avatar, and reward stats.",
  },
  {
    title: "Tweet",
    body: "Create or soft-delete tweets, then inspect personal and latest feed timelines.",
  },
  {
    title: "Like & Rewards",
    body: "Like tweets, claim reward-eligible likes, and surface anti-abuse rule outcomes in the UI.",
  },
  {
    title: "NFT & Stake",
    body: "Track milestone NFT ownership and drive stake / unstake flows against the same Anchor program.",
  },
  {
    title: "Admin Config",
    body: "Show the single global RewardConfig and expose an admin-only edit path for V1 operations.",
  },
] as const;
