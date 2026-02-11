use anchor_lang::prelude::*;

pub struct NftMint {}

impl NftMint {
    pub const NFT_MINT_PREFIX: &'static [u8] = b"mint";
}
