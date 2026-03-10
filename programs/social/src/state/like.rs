use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Like {
    pub profile_pda: Pubkey,
    pub tweet_pda: Pubkey,
    pub reward_claimed: bool,
}

impl Like {
    pub const LIKE_PREFIX: &'static [u8] = b"like";
    pub fn new(profile_pda: Pubkey, tweet_pda: Pubkey) -> Self {
        Self {
            profile_pda,
            tweet_pda,
            reward_claimed: false,
        }
    }

    pub fn claim_reward(&mut self) -> Result<()> {
        self.reward_claimed = true;
        Ok(())
    }
}
