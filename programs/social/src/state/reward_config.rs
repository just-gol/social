use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct RewardConfig {
    /// 奖励配置的管理者地址。
    pub authority: Pubkey,
    /// 里程碑 NFT 名称。
    #[max_len(32)]
    pub name: String,
    /// 里程碑 NFT 符号。
    #[max_len(16)]
    pub symbol: String,
    /// 里程碑 NFT 元数据 URI。
    #[max_len(200)]
    pub uri: String,
    /// 触发 NFT 奖励所需的发帖数门槛。
    pub milestone_tweet_count: u32,
    /// 单次点赞奖励发放的 token 数量。
    pub like_reward_amount: u64,
    /// 解质押时的基础奖励。
    pub stake_base_reward_amount: u64,
    /// 每经过一个 epoch 额外增加的质押奖励。
    pub stake_reward_per_epoch: u64,
    /// 单用户每日允许发帖的上限。
    pub daily_tweet_reward_cap: u32,
    /// 单用户每日允许领取点赞奖励的上限。
    pub daily_like_reward_cap: u32,
    /// 单条推文最多允许多少次点赞进入奖励结算。
    pub max_rewardable_likes_per_tweet: u32,
    /// 作者在可领取点赞奖励前，至少需要完成的发帖数。
    pub min_tweets_before_like_reward: u32,
}

impl RewardConfig {
    pub const REWARD_CONFIG_PREFIX: &'static [u8] = b"reward_config";
}
