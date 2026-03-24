use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Like {
    /// 发起点赞的用户 Profile PDA。
    pub profile_pda: Pubkey,
    /// 被点赞的推文 PDA。
    pub tweet_pda: Pubkey,
    /// 该点赞是否已经被用于领取奖励。
    pub reward_claimed: bool,
    /// 点赞创建时间戳。
    pub created_at: i64,
}

impl Like {
    pub const LIKE_PREFIX: &'static [u8] = b"like";
    /// 构造一条点赞关系记录。
    pub fn new(profile_pda: Pubkey, tweet_pda: Pubkey, created_at: i64) -> Self {
        Self {
            profile_pda,
            tweet_pda,
            reward_claimed: false,
            created_at,
        }
    }

    /// 将该点赞标记为奖励已领取。
    pub fn claim_reward(&mut self) -> Result<()> {
        self.reward_claimed = true;
        Ok(())
    }
}
