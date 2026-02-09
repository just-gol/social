use anchor_lang::prelude::*;

#[error_code]
pub enum SocialError {
    #[msg("Tweet count overflow")]
    TweetCountOverflow,
    #[msg("Likes count overflow")]
    LikesOverflow,
}
