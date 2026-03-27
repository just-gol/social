# Social V2 PRD

## 1. 文档目标

本文档定义 `social` 项目 V2 版本的产品需求。

V2 以 V1 已实现的链上社交激励闭环为基础，目标是把项目从“可运行的合约 demo”推进到“具备真实社交产品雏形的链上应用”，重点补足：

- 评论
- 关注关系
- 个人主页与时间线
- 作者奖励体验优化
- 通知与奖励记录
- 链下索引与查询层
- 前端产品化页面
- 更完整的运营与风控能力

V2 仍然不追求完整 Twitter 替代品，也不进入复杂 DAO 治理、推荐算法和完整代币经济系统。

---

## 2. 产品定位

`social` 是一个基于 Solana + Anchor 的链上社交激励产品原型。

V1 已验证：

1. 用户创建链上身份
2. 用户发帖
3. 用户互动
4. 作者领取点赞奖励
5. 达到里程碑获得 NFT
6. 通过质押 NFT 获得额外激励

V2 的目标是进一步回答两个问题：

1. 这个产品能不能更像一个真正可用的社交产品
2. 这套链上奖励机制能不能更顺滑地嵌入用户体验

因此 V2 更偏向于：

- 社交关系建模
- 内容互动完善
- 作者视角的收益面板
- 链下查询与前端体验
- 运营可调性

---

## 3. 版本定位

### 3.1 V2 核心目标

- 从“单条 Tweet + 点赞”扩展到“内容 + 评论 + 关注”
- 从“操作台式前端”扩展到“接近产品化的信息架构”
- 从“靠直接扫链展示”扩展到“依赖索引的可用查询”
- 从“基础奖励闭环”扩展到“作者有自己的奖励视图和通知”

### 3.2 V2 成功标准

- 用户可以完成“注册 -> 发帖 -> 评论 -> 关注 -> 点赞 -> 作者领奖 -> 质押”的完整体验
- 前端具备首页、时间线、个人主页、通知、资产页
- 链下索引支持个人 feed 与全站最新 feed
- 作者能清楚看到有哪些奖励待领取
- 常见刷奖励路径有更完整的限制
- 合约与前端对主要成功 / 失败路径有测试

---

## 4. V2 范围

### 4.1 In Scope

- 评论系统
- 关注 / 取关
- 个人主页
- 个人 Tweet 列表
- 全站最新时间线
- 作者待领取奖励视图
- 奖励记录页
- 通知中心
- 前端多页面 / 路由化
- 链下索引层
- RewardConfig 扩展字段
- 更细的管理员面板
- 更完整的风控与限制

### 4.2 Out of Scope

- 转发 / 引用转发
- 私信
- 推荐算法
- 搜索系统
- 完整治理投票
- 多 token 经济体系
- 广告 / 商业化系统
- 多链支持

---

## 5. 用户角色

### 5.1 普通用户

能力：

- 创建和查看 Profile
- 发帖与删除自己的帖子
- 评论别人帖子
- 点赞别人帖子
- 关注 / 取关用户
- 查看首页 feed 和个人主页
- 查看自己的通知
- 查看自己的奖励记录
- 领取自己作为作者的点赞奖励
- 初始化自己的里程碑 NFT mint
- 质押 / 解质押自己的 NFT

### 5.2 平台管理员

能力：

- 初始化与更新全局 RewardConfig
- 初始化全局 Token Mint
- 查看基础运营指标
- 调整奖励参数与上限参数
- 暂停部分高风险行为入口

约束：

- V2 仍采用单管理员模式
- 暂不引入链上治理

---

## 6. 核心业务闭环

### 6.1 用户生命周期

1. 用户创建 Profile
2. 管理员初始化全局 RewardConfig 与 Token Mint
3. 用户初始化自己的 NFT Mint
4. 用户发 Tweet
5. 其他用户点赞与评论
6. 用户关注其他作者，形成社交关系
7. 作者在“待领奖励”视图中领取点赞奖励
8. 作者在个人主页查看内容与资产
9. 作者将 NFT 质押
10. 作者解质押并领取质押奖励

### 6.2 产品闭环重点

- 内容生产：Tweet
- 内容互动：Like + Comment
- 社交关系：Follow
- 收益反馈：作者奖励面板
- 资产沉淀：NFT + Stake

---

## 7. 信息架构需求

### 7.1 首页 Home

用途：

- 展示产品入口与品牌说明
- 提供钱包连接入口
- 提供新用户引导

### 7.2 首页时间线 Feed

用途：

- 展示全站最新 Tweet
- 展示 Tweet 的作者、内容、点赞数、评论数、创建时间
- 展示关注状态与互动入口

要求：

- 默认展示全站最新
- 不展示已删除 Tweet
- 支持分页或分批加载

### 7.3 个人主页 Profile

用途：

- 展示用户 Profile 信息
- 展示该用户发过的 Tweet
- 展示关注 / 粉丝统计
- 展示 NFT / Token / Stake 状态摘要

### 7.4 通知页 Notifications

用途：

- 展示点赞通知
- 展示评论通知
- 展示奖励可领取通知
- 展示 NFT 获得通知

### 7.5 奖励页 Rewards

用途：

- 展示待领取奖励
- 展示已领取奖励记录
- 展示当前奖励规则摘要

### 7.6 资产页 Vault

用途：

- 展示 NFT 持有
- 展示 Token 余额
- 展示 Stake 状态
- 提供质押 / 解质押入口

### 7.7 管理页 Admin

用途：

- 初始化 / 更新 RewardConfig
- 初始化 Token Mint
- 查看链上参数当前状态
- 查看基础运营统计摘要

---

## 8. 数据模型需求

### 8.1 Profile（扩展）

用途：

- 表示用户链上身份
- 保存展示字段
- 保存行为计数与奖励累计信息
- 保存社交关系统计摘要

字段要求：

- `name`：展示名称，用户在前端看到的昵称
- `bio`：个人简介，用户自我介绍文本
- `avatar_uri`：头像地址，用户头像图片的 URI
- `tweet_count`：累计发帖数，用户历史发帖总数
- `comment_count`：累计评论数，用户历史评论总数
- `followers_count`：粉丝数，关注该用户的人数
- `following_count`：关注数，该用户主动关注的人数
- `last_tweet_day`：最近发帖自然日，按天统计的最近发帖日期
- `daily_tweet_count`：当日发帖计数，用户当天已发帖次数
- `last_like_reward_day`：最近领取点赞奖励的自然日，作者最近一次领取点赞奖励的日期
- `daily_like_reward_count`：当日已领取点赞奖励次数，作者当天已结算的点赞奖励次数
- `token_rewards_earned`：累计获得 Token 数量，用户历史累计获得的平台 Token
- `nft_rewards_earned`：累计获得 NFT 数量，用户历史累计获得的里程碑 NFT 数量

说明：

- `followers_count` / `following_count` 为便于展示的冗余统计字段
- 社交关系明细仍由 Follow 账户表示

### 8.2 Tweet（扩展）

用途：

- 表示链上内容

字段要求：

- `content`：文本内容，Tweet 的正文
- `author`：作者钱包地址，发帖用户的钱包公钥
- `likes_count`：总点赞数，这条 Tweet 收到的点赞总次数
- `comments_count`：总评论数，这条 Tweet 下的评论总数
- `rewardable_likes_count`：已计入奖励的点赞数，已经被用于奖励结算的点赞次数
- `created_at`：创建时间戳，Tweet 上链时的时间
- `deleted`：软删除标记，标识该 Tweet 是否已被作者删除

约束：

- V2 仍只支持纯文本 Tweet
- 不支持编辑
- 链上仍为软删除
- 前端默认不展示已删除 Tweet

### 8.3 Comment（新增）

用途：

- 表示对 Tweet 的评论

字段要求：

- `tweet_pda`：所属 Tweet，对应被评论的 Tweet 账户
- `author_profile_pda`：评论作者 Profile
- `content`：评论正文
- `created_at`：评论时间戳
- `deleted`：评论是否被删除

约束：

- V2 仅支持一级评论
- 不支持多级回复
- 不支持编辑
- 评论删除也采用软删除

### 8.4 Like

用途：

- 表示一次点赞行为
- 防止重复点赞
- 作为作者领取点赞奖励的结算凭证

字段要求：

- `profile_pda`：点赞人 Profile，对应发起点赞用户的 Profile 账户
- `tweet_pda`：被点赞 Tweet，对应这条点赞关联的 Tweet 账户
- `reward_claimed`：该条点赞是否已结算奖励，防止重复发放奖励
- `created_at`：点赞时间，这次 Like 创建的时间戳

### 8.5 Follow（新增）

用途：

- 表示用户之间的关注关系

字段要求：

- `follower_profile_pda`：关注者 Profile
- `following_profile_pda`：被关注者 Profile
- `created_at`：关注建立时间

约束：

- 一个用户对另一个用户只能关注一次
- 禁止关注自己

### 8.6 RewardConfig（扩展）

用途：

- 作为平台全局奖励配置
- 所有用户共享同一套参数

字段要求：

- `authority`：配置管理员地址，唯一允许更新 RewardConfig 的钱包
- `name`：NFT 名称，里程碑 NFT 的展示名称
- `symbol`：NFT 符号，里程碑 NFT 的简称
- `uri`：NFT 元数据地址，NFT metadata 对应的 URI
- `milestone_tweet_count`：里程碑发帖数，达到该发帖数后可获得 NFT
- `like_reward_amount`：点赞奖励数量，每次结算点赞奖励时发放的 Token 数量
- `stake_base_reward_amount`：质押基础奖励，解质押时固定发放的基础 Token 数量
- `stake_reward_per_epoch`：每 epoch 质押奖励，按 epoch 累计的额外质押奖励
- `daily_tweet_reward_cap`：每日发帖上限，用户每天最多可计数的发帖次数
- `daily_like_reward_cap`：每日点赞奖励上限，作者每天最多可领取的点赞奖励次数
- `daily_comment_cap`：每日评论上限，用户每天最多可发送的评论次数
- `max_rewardable_likes_per_tweet`：单 Tweet 最大奖励点赞数，一条 Tweet 最多可结算奖励的点赞次数
- `min_tweets_before_like_reward`：点赞奖励最低发帖门槛，作者至少发够多少条 Tweet 后才能领取点赞奖励
- `new_account_lock_days`：新账号冷启动天数，新用户在一定时间内限制部分奖励能力

设计要求：

- 全局唯一 PDA
- 只允许管理员更新

### 8.7 Stake

用途：

- 表示 NFT 质押状态

字段要求：

- `authority`：质押人地址，发起质押的用户钱包
- `mint`：质押 NFT 的 mint 地址，被锁定的 NFT 标识
- `at`：质押开始 epoch，记录进入质押时的 epoch 编号

---

## 9. 功能需求

### 9.1 创建 Profile

功能描述：

用户可创建自己的链上 Profile。

输入：

- `name`
- `bio`
- `avatar_uri`

规则：

- 一个钱包只能创建一个 Profile
- 字段需要满足长度限制

结果：

- 成功创建 Profile
- 触发 `ProfileCreated` 事件

### 9.2 创建 Tweet

功能描述：

用户发布一条新的 Tweet。

输入：

- `content`

前置条件：

- 已有 Profile
- 已有全局 RewardConfig
- 已初始化用户自己的 NFT Mint

规则：

- 内容长度受限
- 受 `daily_tweet_reward_cap` 约束
- 达到 `milestone_tweet_count` 时发放 NFT

结果：

- 成功创建 Tweet
- 递增 `tweet_count`
- 递增时间线可见数据
- 触发 `TweetCreated` 事件

### 9.3 删除 Tweet

功能描述：

作者可删除自己的 Tweet。

规则：

- 仅作者本人可删除
- 删除采用软删除
- 软删除后不能继续点赞、评论或领取奖励
- 前端默认不再展示已删除 Tweet

结果：

- `deleted = true`
- 触发 `TweetDeleted` 事件

### 9.4 创建 Comment

功能描述：

用户可以对 Tweet 发表评论。

输入：

- `content`

前置条件：

- 已有 Profile
- Tweet 未删除

规则：

- 每条评论仅支持一级挂载在 Tweet 下
- 评论内容长度受限
- 受 `daily_comment_cap` 约束
- 已删除 Tweet 不允许新增评论

结果：

- 创建 Comment 账户
- 增加 Tweet 的 `comments_count`
- 增加作者 `comment_count`
- 触发 `CommentCreated` 事件

### 9.5 删除 Comment

功能描述：

评论作者可删除自己的评论。

规则：

- 仅评论作者可删除
- 删除为软删除
- 前端默认不展示已删除评论

### 9.6 创建 Like

功能描述：

用户可以给别人的 Tweet 点赞。

规则：

- 一条 Tweet 对同一用户只能点赞一次
- 禁止自赞
- 已删除 Tweet 不能点赞

结果：

- 创建 Like 账户
- 增加 `likes_count`
- 触发 `LikeCreated` 事件

### 9.7 作者领取点赞奖励

功能描述：

Tweet 作者对自己收到的点赞进行奖励结算。

设计语义：

- 点赞人只负责产生 `Like`
- 作者自己发起 `mint_like_reward`
- 奖励 mint 到作者自己的 Token ATA

前置条件：

- Tweet 未删除
- 该 Like 尚未结算奖励
- 调用者必须是 Tweet 作者
- 作者发帖数达到 `min_tweets_before_like_reward`
- 当日作者奖励次数未超过 `daily_like_reward_cap`
- 当前 Tweet 已计奖点赞数未超过 `max_rewardable_likes_per_tweet`
- 全局 Token Mint 已存在

结果：

- `like.reward_claimed = true`
- Tweet 的 `rewardable_likes_count` 增加
- 作者 `token_rewards_earned` 增加
- 奖励 mint 到作者 ATA
- 生成奖励记录
- 触发 `RewardIssued` 事件

### 9.8 关注 / 取关

功能描述：

用户可关注或取消关注其他用户。

规则：

- 禁止关注自己
- 同一对用户之间不能重复关注
- 取关后应更新统计计数

结果：

- 创建或关闭 Follow 关系账户
- 更新 `followers_count` 与 `following_count`
- 触发 `FollowCreated` / `FollowRemoved` 事件

### 9.9 初始化 NFT Mint

功能描述：

用户初始化自己里程碑 NFT 对应的 mint 账户。

说明：

- V2 保持与 V1 一致，仍允许显式初始化
- 前端应弱化用户对该技术概念的感知
- 可以在 UI 上表述为“准备我的 NFT 徽章”

### 9.10 初始化 Token Mint

功能描述：

管理员初始化全局 Token Mint。

规则：

- 全局唯一
- 只允许管理员操作
- 作为点赞奖励和解质押奖励的 Token 基础设施

### 9.11 初始化 / 更新 RewardConfig

功能描述：

管理员初始化或更新全局奖励参数。

规则：

- 全局唯一
- 只允许 `authority` 更新
- 所有业务统一读取该配置

### 9.12 创建 Stake

功能描述：

用户将自己的里程碑 NFT 质押。

前置条件：

- 持有 NFT
- 至少有一条有效 Tweet
- 当前未处于质押状态

规则：

- V2 仍只支持单 NFT 质押
- 创建 Stake 时不直接发放奖励

### 9.13 Unstake

功能描述：

用户解质押并领取质押奖励。

规则：

- 奖励在解质押时统一结算
- 奖励 = `stake_base_reward_amount + elapsed_epochs * stake_reward_per_epoch`

结果：

- NFT 返还给用户
- 奖励 mint 到用户 ATA
- Stake 账户关闭
- 触发 `StakeClosed` / `RewardIssued` 事件

---

## 10. 前端需求

### 10.1 前端目标

V2 前端应从“功能操作台”升级为“真实产品雏形”。

### 10.2 页面结构

前端至少包含：

- `Home`
- `Feed`
- `Profile`
- `Notifications`
- `Rewards`
- `Vault`
- `Admin`

### 10.3 页面职责

`Home`

- 展示产品介绍
- 钱包连接
- 新用户引导

`Feed`

- 全站最新 Tweet
- Tweet 详情卡片
- 点赞 / 评论 / 关注入口

`Profile`

- 个人资料
- 用户发帖列表
- 关注 / 粉丝统计
- NFT 准备入口

`Notifications`

- 点赞通知
- 评论通知
- 奖励通知

`Rewards`

- 作者待领奖励列表
- 已领取奖励记录

`Vault`

- NFT / Token / Stake 状态
- Stake / Unstake 入口

`Admin`

- RewardConfig 表单
- Token Mint 初始化
- 基础运营统计摘要

### 10.4 使用模式

`localnet`

- 浏览器钱包默认只读
- 推荐使用 Local Keypair 调试模式进行写操作

`devnet`

- 可配合浏览器钱包进行演示

---

## 11. 链下索引需求

V2 必须具备链下索引层，不再依赖前端直接扫全部账户来构建主要页面。

至少需要支持：

- Profile 查询
- Tweet 列表查询
- Tweet 评论列表查询
- 个人主页内容列表
- 全站最新 feed
- 奖励待领取列表
- 通知列表
- 关注 / 粉丝列表

至少需要索引的事件：

- `ProfileCreated`
- `TweetCreated`
- `TweetDeleted`
- `CommentCreated`
- `CommentDeleted`
- `LikeCreated`
- `RewardIssued`
- `FollowCreated`
- `FollowRemoved`
- `StakeCreated`
- `StakeClosed`

---

## 12. 风控与限制

### 12.1 最小反作弊升级

- 禁止自赞
- 同一用户对同一 Tweet 只能点赞一次
- 已删除 Tweet 不可点赞
- 已删除 Tweet 不可评论
- 已删除 Tweet 不可继续领奖
- 发帖受每日上限控制
- 评论受每日上限控制
- 点赞奖励受每日上限控制
- 单条 Tweet 的计奖点赞数受上限控制
- 作者需达到最低发帖门槛后才可领取点赞奖励
- 新账号在冷启动期限制部分高收益操作

### 12.2 暂不做的事情

- 不做链上信誉系统
- 不做复杂女巫识别
- 不做推荐反作弊模型

---

## 13. 测试需求

### 13.1 合约测试

- Comment 创建 / 删除
- Follow / Unfollow
- 作者领取点赞奖励成功与失败路径
- 评论和关注统计更新
- 新增风控参数生效

### 13.2 前端测试

- 页面导航与路由切换
- Feed 渲染与状态刷新
- 奖励页待领取列表正确展示
- 通知页正确展示互动事件
- local keypair / browser wallet 两种模式行为正确

### 13.3 集成测试

- 单用户完整生命周期
- 多用户互动场景
- 作者奖励领取场景
- 关注关系建立后的主页和 feed 展示

---

## 14. 当前实现到 V2 的主要改造点

### 14.1 合约层

- 新增 `Comment`
- 新增 `Follow`
- 扩展 `Profile`
- 扩展 `Tweet`
- 增加评论和关注相关事件

### 14.2 索引层

- 新增链下事件消费与查询聚合
- 不再依赖前端直接全量读取所有账户

### 14.3 前端层

- 从 Tab 式操作台演进为多页面产品结构
- 新增 Feed、Notifications、Rewards 页面
- 作者奖励从“单条 Tweet 上的按钮”升级为“统一奖励视图”

---

## 15. 后续版本方向

不属于当前 V2，但后续可以考虑：

- 转发 / 引用转发
- 多级评论
- 推荐流
- 搜索
- 自动 NFT mint 初始化
- 作者奖励批量领取
- 治理机制
- 更完整的代币经济设计
