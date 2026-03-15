use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Stake {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub at: i64,
}

impl Stake {
    pub const STAKE_PREFIX: &'static [u8] = b"stake";

    pub fn new(authority: Pubkey, mint: Pubkey) -> Self {
        Self {
            authority,
            mint,
            at: Clock::get().unwrap().unix_timestamp,
        }
    }
}
