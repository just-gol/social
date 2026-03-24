use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum RewardKind {
    /// 发帖里程碑触发的 NFT 奖励。
    MilestoneNft,
    /// 点赞行为触发的 Token 奖励。
    LikeToken,
    /// 解质押时结算的 Token 奖励。
    StakeToken,
}

#[event]
pub struct ProfileCreated {
    /// 创建资料的用户地址。
    pub authority: Pubkey,
    /// 新创建的 Profile PDA。
    pub profile: Pubkey,
}

#[event]
pub struct TweetCreated {
    /// 发帖用户地址。
    pub authority: Pubkey,
    /// 发帖用户对应的 Profile PDA。
    pub profile: Pubkey,
    /// 新建 Tweet PDA。
    pub tweet: Pubkey,
    /// 推文创建时间戳。
    pub created_at: i64,
}

#[event]
pub struct TweetDeleted {
    /// 删除推文的用户地址。
    pub authority: Pubkey,
    /// 被软删除的 Tweet PDA。
    pub tweet: Pubkey,
}

#[event]
pub struct LikeCreated {
    /// 发起点赞的用户地址。
    pub authority: Pubkey,
    /// 被点赞的 Tweet PDA。
    pub tweet: Pubkey,
    /// 新建的 Like PDA。
    pub like: Pubkey,
    /// 点赞创建时间戳。
    pub created_at: i64,
}

#[event]
pub struct RewardIssued {
    /// 奖励接收者地址。
    pub recipient: Pubkey,
    /// 奖励关联对象，如 tweet、like 或 stake。
    pub reference: Pubkey,
    /// 奖励类型。
    pub reward_kind: RewardKind,
    /// 奖励数量。
    pub amount: u64,
}

#[event]
pub struct StakeCreated {
    /// 发起质押的用户地址。
    pub authority: Pubkey,
    /// 新创建的 Stake PDA。
    pub stake: Pubkey,
    /// 被质押的 NFT Mint。
    pub mint: Pubkey,
    /// 开始质押时的 epoch。
    pub started_at_epoch: u64,
}

#[event]
pub struct StakeClosed {
    /// 发起解质押的用户地址。
    pub authority: Pubkey,
    /// 被关闭的 Stake PDA。
    pub stake: Pubkey,
    /// 解质押对应的 NFT Mint。
    pub mint: Pubkey,
    /// 本次解质押结算出的奖励。
    pub reward_amount: u64,
    /// 本次质押持续的 epoch 数。
    pub elapsed_epochs: u64,
}
