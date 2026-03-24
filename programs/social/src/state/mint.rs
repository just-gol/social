pub struct NftMint {}

pub struct TokenMint {}

impl TokenMint {
    /// 平台积分 Token Mint 的 PDA 前缀。
    pub const TOKEN_MINT_PREFIX: &'static [u8] = b"token_mint";
    /// 平台积分 Token 的精度。
    pub const TOKEN_DECIMALS: u8 = 2;
    /// 平台积分 Token 的展示名称。
    pub const TOKEN_NAME: &'static str = "my token";
    /// 平台积分 Token 的展示符号。
    pub const TOKEN_SYMBOL: &'static str = "MY TOKEN";
}

impl NftMint {
    /// 里程碑 NFT Mint 的 PDA 前缀。
    pub const NFT_MINT_PREFIX: &'static [u8] = b"nft_mint";

    /// 默认 NFT 名称常量，当前主要由 RewardConfig 中的展示字段覆盖。
    pub const NFT_NAME: &'static str = "my nft";
    /// 默认 NFT 符号常量，当前主要由 RewardConfig 中的展示字段覆盖。
    pub const NFT_SYMBOL: &'static str = "MY NFT";
}
