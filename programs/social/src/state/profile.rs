use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Profile {
    #[max_len(32)]
    pub name: String,
}

impl Profile {
    pub const PROFILE_PREFIX: &'static [u8] = b"profile";
}
