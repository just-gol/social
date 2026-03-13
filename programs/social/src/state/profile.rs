use crate::errors::SocialError;
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Profile {
    #[max_len(32)]
    pub name: String,
    pub tweet_count: u32,
    pub reward: bool,
}

impl Profile {
    pub const PROFILE_PREFIX: &'static [u8] = b"profile";

    pub fn increment_tweet_count(&mut self) -> Result<()> {
        self.tweet_count = self
            .tweet_count
            .checked_add(1)
            .ok_or(SocialError::TweetCountOverflow)?;
        if self.tweet_count == 10 {
            self.reward = true;
        }
        Ok(())
    }

    pub fn new(name: String) -> Self {
        Profile {
            name,
            tweet_count: 0,
            reward: false,
        }
    }
}
