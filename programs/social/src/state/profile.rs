use crate::errors::SocialError;
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Profile {
    /// 用户展示名称。
    #[max_len(32)]
    pub name: String,
    /// 用户简介，用于个人主页展示。
    #[max_len(160)]
    pub bio: String,
    /// 用户头像地址，通常为链下图片 URI。
    #[max_len(200)]
    pub avatar_uri: String,
    /// 用户累计发帖数。
    pub tweet_count: u32,
    /// 最近一次发帖所在的自然日，用于按天限流。
    pub last_tweet_day: i64,
    /// 当前自然日内已经发出的帖子数量。
    pub daily_tweet_count: u32,
    /// 最近一次领取点赞奖励所在的自然日。
    pub last_like_reward_day: i64,
    /// 当前自然日内已经领取的点赞奖励次数。
    pub daily_like_reward_count: u32,
    /// 用户累计获得的 token 奖励总额。
    pub token_rewards_earned: u64,
    /// 用户累计获得的里程碑 NFT 数量。
    pub nft_rewards_earned: u32,
    /// 推文评论数
    pub comments_received_count: u32,
    /// 关注者的数量 A 关注了 B , followers_count = A , following_count = B
    pub followers_count: u32,
    /// 被关注者的数量
    pub following_count: u32,
}

impl Profile {
    pub const PROFILE_PREFIX: &'static [u8] = b"profile";

    /// 记录一次发帖，并校验当日发帖上限。
    pub fn register_tweet(&mut self, day: i64, daily_cap: u32) -> Result<()> {
        if self.last_tweet_day != day {
            self.last_tweet_day = day;
            self.daily_tweet_count = 0;
        }
        require!(
            self.daily_tweet_count < daily_cap,
            SocialError::DailyTweetCapExceeded
        );
        self.daily_tweet_count = self
            .daily_tweet_count
            .checked_add(1)
            .ok_or(SocialError::TweetCountOverflow)?;
        self.tweet_count = self
            .tweet_count
            .checked_add(1)
            .ok_or(SocialError::TweetCountOverflow)?;
        Ok(())
    }

    /// 记录一次点赞奖励领取，并校验当日领取上限。
    pub fn register_like_reward(&mut self, day: i64, daily_cap: u32) -> Result<()> {
        if self.last_like_reward_day != day {
            self.last_like_reward_day = day;
            self.daily_like_reward_count = 0;
        }
        require!(
            self.daily_like_reward_count < daily_cap,
            SocialError::DailyLikeRewardCapExceeded
        );
        self.daily_like_reward_count = self
            .daily_like_reward_count
            .checked_add(1)
            .ok_or(SocialError::LikesOverflow)?;
        Ok(())
    }

    /// 累加用户已经获得的 token 奖励。
    pub fn add_token_rewards(&mut self, amount: u64) -> Result<()> {
        self.token_rewards_earned = self
            .token_rewards_earned
            .checked_add(amount)
            .ok_or(SocialError::RewardAmountOverflow)?;
        Ok(())
    }

    /// 记录一次里程碑 NFT 奖励发放。
    pub fn add_nft_reward(&mut self) -> Result<()> {
        self.nft_rewards_earned = self
            .nft_rewards_earned
            .checked_add(1)
            .ok_or(SocialError::RewardAmountOverflow)?;
        Ok(())
    }

    /// 构造一个默认初始化的用户资料。
    pub fn new(name: String, bio: String, avatar_uri: String) -> Self {
        Profile {
            name,
            bio,
            avatar_uri,
            tweet_count: 0,
            last_tweet_day: -1,
            daily_tweet_count: 0,
            last_like_reward_day: -1,
            daily_like_reward_count: 0,
            token_rewards_earned: 0,
            nft_rewards_earned: 0,
            comments_received_count: 0,
            followers_count: 0,
            following_count: 0,
        }
    }

    pub fn comments_received_count(&mut self) -> Result<()> {
        self.comments_received_count = self
            .comments_received_count
            .checked_add(1)
            .ok_or(SocialError::CommentsOverflow)?;
        Ok(())
    }
    pub fn subtract_comments_received_count(&mut self) -> Result<()> {
        self.comments_received_count = self
            .comments_received_count
            .checked_sub(1)
            .ok_or(SocialError::CommentsUnderflow)?;
        Ok(())
    }
}
