use anchor_lang::prelude::*;

#[error_code]
pub enum SocialError {
    #[msg("Tweet count overflow")]
    TweetCountOverflow,
    #[msg("Likes count overflow")]
    LikesOverflow,
    #[msg("Reward amount overflow")]
    RewardAmountOverflow,
    #[msg("Reward already claimed")]
    RewardAlreadyClaimed,
    #[msg("Invalid profile pda")]
    InvalidProfilePda,
    #[msg("Invalid tweet pda")]
    InvalidTweetPda,
    #[msg("Invalid author profile")]
    InvalidAuthorProfile,
    #[msg("Nft mint not minted")]
    NftMintNotMinted,
    #[msg("Invalid tweet author")]
    InvalidTweetAuthor,
    #[msg("Invalid stake authority")]
    InvalidStakeAuthority,
    #[msg("Invalid stake mint")]
    InvalidStakeMint,
    #[msg("Only reward config authority can update config")]
    InvalidRewardConfigAuthority,
    #[msg("Self like is not allowed")]
    SelfLikeNotAllowed,
    #[msg("Tweet has been deleted")]
    TweetDeleted,
    #[msg("Tweet is already deleted")]
    TweetAlreadyDeleted,
    #[msg("Comment is already deleted")]
    CommentAlreadyDeleted,
    #[msg("Daily tweet cap exceeded")]
    DailyTweetCapExceeded,
    #[msg("Daily like reward cap exceeded")]
    DailyLikeRewardCapExceeded,
    #[msg("Tweet reward cap exceeded")]
    TweetLikeRewardCapExceeded,
    #[msg("Author is not eligible for like rewards yet")]
    AuthorNotEligibleForLikeReward,
    #[msg("Content too long")]
    ContentTooLong,
    #[msg("Not author")]
    NotAuthor,
    #[msg("Comments overflow")]
    CommentsOverflow,
    #[msg("Comments underflow")]
    CommentsUnderflow,
}
