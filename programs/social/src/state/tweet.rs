use anchor_lang::prelude::*;
use crate::errors::SocialError;

#[account]
#[derive(InitSpace)]
pub struct Tweet {
    #[max_len(100)]
    pub content: String,
    pub author: Pubkey,
    pub likes_count: u32,
}

impl Tweet {
    pub const TWEET_PREFIX: &'static [u8] = b"tweet";

    pub fn new(content: String, author: Pubkey) -> Self {
        Self {
            content,
            author,
            likes_count: 0,
        }
    }

    pub fn like(&mut self) -> Result<()> {
        self.likes_count = self
            .likes_count
            .checked_add(1)
            .ok_or(SocialError::LikesOverflow)?;
        Ok(())
    }
}
