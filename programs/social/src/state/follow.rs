use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Follow{
    pub follower_profile_pda: Pubkey,
    pub following_profile_pda: Pubkey,
    pub created_at: i64,
}

impl Follow{
    pub const FOLLOW_PREFIX: &'static[u8]  = b"follow";
    pub fn new(follower_profile_pda: Pubkey, following_profile_pda: Pubkey) -> Self{
        Self{
            follower_profile_pda,
            following_profile_pda,
            created_at: Clock::get().unwrap().unix_timestamp,
        }
    }
}