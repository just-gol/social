use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Like {
    pub profile_pda: Pubkey,
    pub tweet_pda: Pubkey,
}

impl Like {
    pub const LIKE_PREFIX: &'static [u8] = b"like";
    pub fn new(profile_pda: Pubkey, tweet_pda: Pubkey) -> Self {
        Self {
            profile_pda,
            tweet_pda,
        }
    }
}
