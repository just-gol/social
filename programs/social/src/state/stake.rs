use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Stake {
    /// 质押发起人的钱包地址。
    pub authority: Pubkey,
    /// 被质押的 NFT Mint 地址。
    pub mint: Pubkey,
    /// 开始质押时所在的 epoch。
    pub at: u64,
}

impl Stake {
    pub const STAKE_PREFIX: &'static [u8] = b"stake";

    /// 构造一条新的质押记录，并记录开始 epoch。
    pub fn new(authority: Pubkey, mint: Pubkey) -> Self {
        Self {
            authority,
            mint,
            at: Clock::get().unwrap().epoch,
        }
    }
}
