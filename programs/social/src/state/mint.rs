pub struct NftMint {}

pub struct TokenMint {}

impl TokenMint {
    pub const TOKEN_MINT_PREFIX: &'static [u8] = b"token_mint";
    pub const TOKEN_DECIMALS: u8 = 2;
    pub const TOKEN_NAME: &'static str = "my token";
    pub const TOKEN_SYMBOL: &'static str = "MY TOKEN";
}

impl NftMint {
    pub const NFT_MINT_PREFIX: &'static [u8] = b"nft_mint";

    pub const NFT_NAME: &'static str = "my nft";
    pub const NFT_SYMBOL: &'static str = "MY NFT";
}
