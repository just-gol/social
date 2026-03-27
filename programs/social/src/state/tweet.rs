use crate::errors::SocialError;
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Tweet {
    /// 推文正文内容。
    #[max_len(100)]
    pub content: String,
    /// 推文作者钱包地址。
    pub author: Pubkey,
    /// 推文累计点赞数。
    pub likes_count: u32,
    /// 已经参与奖励结算的点赞次数。
    pub rewardable_likes_count: u32,
    /// 推文创建时间戳。
    pub created_at: i64,
    /// 软删除标记，删除后内容仍保留但不可继续参与互动和奖励。
    pub deleted: bool,
    /// 推文评论数
    pub comments_count: u32,
}

impl Tweet {
    pub const TWEET_PREFIX: &'static [u8] = b"tweet";

    /// 构造一条新的推文账户数据。
    pub fn new(content: String, author: Pubkey, created_at: i64) -> Self {
        Self {
            content,
            author,
            likes_count: 0,
            rewardable_likes_count: 0,
            created_at,
            deleted: false,
            comments_count: 0,
        }
    }

    /// 增加推文的总点赞数。
    pub fn like(&mut self) -> Result<()> {
        self.likes_count = self
            .likes_count
            .checked_add(1)
            .ok_or(SocialError::LikesOverflow)?;
        Ok(())
    }

    /// 记录一次可计奖点赞，并校验单帖奖励上限。
    pub fn register_rewardable_like(&mut self, reward_cap: u32) -> Result<()> {
        require!(
            self.rewardable_likes_count < reward_cap,
            SocialError::TweetLikeRewardCapExceeded
        );
        self.rewardable_likes_count = self
            .rewardable_likes_count
            .checked_add(1)
            .ok_or(SocialError::LikesOverflow)?;
        Ok(())
    }

    /// 将推文标记为已删除。
    pub fn delete(&mut self) -> Result<()> {
        require!(!self.deleted, SocialError::TweetAlreadyDeleted);
        self.deleted = true;
        Ok(())
    }

    pub fn comment(&mut self) -> Result<()> {
        self.comments_count = self
            .comments_count
            .checked_add(1)
            .ok_or(SocialError::CommentsOverflow)?;
        Ok(())
    }

    pub fn subtract_comment(&mut self) -> Result<()> {
        self.comments_count = self
            .comments_count
            .checked_sub(1)
            .ok_or(SocialError::CommentsUnderflow)?;
        Ok(())
    }
}
