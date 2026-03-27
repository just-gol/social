use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Comment {
    pub author: Pubkey,
    #[max_len(64)]
    pub content: String,
    pub tweet_pda: Pubkey,
    pub author_profile_pda: Pubkey,
    pub created_at: i64,
    pub deleted: bool,
}
impl Comment{

    pub const COMMENT_PREFIX: &'static [u8] = b"comment";
    pub fn new(author: Pubkey, content: String, tweet_pda: Pubkey, author_profile_pda: Pubkey) -> Self {
        Self {
            author,
            content,
            tweet_pda,
            author_profile_pda,
            created_at: Clock::get().unwrap().unix_timestamp,
            deleted: false,
        }
    }
}