use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct RewardConfig {
    pub authority: Pubkey,
    #[max_len(32)]
    pub name: String,
    #[max_len(16)]
    pub symbol: String,
    #[max_len(200)]
    pub uri: String,
}

impl RewardConfig {
    pub const REWARD_CONFIG_PREFIX: &'static [u8] = b"reward_config";
}
