# Social V1 PRD

## 1. 文档目标

本文档定义 `social` 项目当前 V1 版本的产品需求与实现边界。

V1 的目标不是做完整社交平台，而是完成一个可运行、可验证、可演示的链上社交激励闭环，覆盖：

- 用户注册
- 发帖
- 软删除帖子
- 点赞
- 点赞奖励
- 里程碑 NFT
- NFT 质押 / 解质押
- 全局奖励配置
- 基础前端交互页面

V1 不包含评论、关注、转发、通知、推荐、治理投票、复杂经济模型。

---

## 2. 产品定位

`social` 是一个基于 Solana + Anchor 的链上社交激励原型。

核心思路：

1. 用户在链上创建自己的 Profile
2. 用户发 Tweet，形成基础内容生产
3. 其他用户点赞，形成互动
4. 作者在满足条件时自行领取点赞奖励
5. 达到发帖里程碑时，用户获得 NFT 徽章
6. 用户可以将 NFT 质押，并在解质押时获得 Token 激励

V1 更偏向于：

- 社交行为上链
- 奖励参数可配置
- 最小反作弊
- 链下可索引
- 前端可直接演示完整闭环

---

## 3. V1 范围

### 3.1 In Scope

- Profile 创建与展示
- Tweet 创建与软删除
- Like 创建
- 作者自行领取点赞奖励
- 里程碑 NFT mint 初始化与发放
- NFT 质押 / 解质押
- 全局 RewardConfig
- 全局 Token Mint
- 奖励与行为事件
- 最小反作弊限制
- 前端 Tab 式功能页面
- `localnet` 与 `devnet` 演示支持
- 自动化测试覆盖主要成功 / 失败路径

### 3.2 Out of Scope

- 评论
- 关注 / 取关
- 转发 / 引用转发
- 私信
- 站内通知
- 社区治理
- 多种 NFT 类型
- 推荐系统
- 完整后端索引服务
- 复杂权限体系
- 完整运营后台

---

## 4. 用户角色

### 4.1 普通用户

能力：

- 创建个人资料
- 发帖
- 删除自己的帖子
- 点赞别人的帖子
- 作为作者领取自己的点赞奖励
- 初始化自己的里程碑 NFT mint
- 质押与解质押自己的 NFT

### 4.2 平台管理员

能力：

- 初始化全局 RewardConfig
- 更新全局 RewardConfig
- 初始化全局 Token Mint

约束：

- V1 采用单管理员模式
- 暂不支持治理投票

---

## 5. 核心业务闭环

### 5.1 用户生命周期

1. 用户创建 Profile
2. 管理员初始化全局 RewardConfig
3. 管理员初始化全局 Token Mint
4. 用户初始化自己的 NFT Mint
5. 用户发 Tweet
6. 达到里程碑时，用户获得 NFT
7. 其他用户对 Tweet 点赞
8. 作者在满足条件时领取点赞奖励
9. 作者将 NFT 质押
10. 作者解质押并获得质押奖励，同时取回 NFT

### 5.2 V1 成功标准

- 能完整跑通“注册 -> 发帖 -> 点赞 -> 作者领奖 -> 质押 -> 解质押”
- 奖励规则不写死在逻辑里，而由全局 RewardConfig 控制
- 关键刷奖励路径被基本限制
- 行为和奖励可通过事件进行链下索引
- 前端可直接操作主要流程
- 主要业务有自动化测试

---

## 6. 数据模型需求

### 6.1 Profile

用途：

- 表示用户链上身份
- 保存展示字段
- 保存行为计数与奖励累计信息

字段要求：

- `name`：展示名称，用户在前端看到的昵称
- `bio`：个人简介，用户的自我介绍文本
- `avatar_uri`：头像地址，用户头像图片的 URI
- `tweet_count`：累计发帖数，用户历史发帖总数
- `last_tweet_day`：最近发帖自然日，按天统计的最近发帖日期
- `daily_tweet_count`：当日发帖计数，用户当天已发帖次数
- `last_like_reward_day`：最近领取点赞奖励的自然日，作者最近一次领取点赞奖励的日期
- `daily_like_reward_count`：当日已领取点赞奖励次数，作者当天已结算的点赞奖励次数
- `token_rewards_earned`：累计获得 Token 数量，用户历史累计获得的平台 Token
- `nft_rewards_earned`：累计获得 NFT 数量，用户历史累计获得的里程碑 NFT 数量

说明：

- `daily_like_reward_count` 记录的是作者侧已领取的点赞奖励次数

### 6.2 Tweet

用途：

- 表示链上内容

字段要求：

- `content`：文本内容，Tweet 的正文
- `author`：作者钱包地址，发帖用户的钱包公钥
- `likes_count`：总点赞数，这条 Tweet 收到的点赞总次数
- `rewardable_likes_count`：已计入奖励的点赞数，已经被用于奖励结算的点赞次数
- `created_at`：创建时间戳，Tweet 上链时的时间
- `deleted`：软删除标记，标识该 Tweet 是否已被作者删除

约束：

- V1 仅支持纯文本 Tweet
- 不支持编辑
- 链上为软删除
- 前端默认不展示已删除 Tweet

### 6.3 Like

用途：

- 表示一次点赞行为
- 防止重复点赞
- 作为作者领取点赞奖励的结算凭证

字段要求：

- `profile_pda`：点赞人 Profile，对应发起点赞用户的 Profile 账户
- `tweet_pda`：被点赞 Tweet，对应这条点赞关联的 Tweet 账户
- `reward_claimed`：该条点赞是否已结算奖励，防止重复发放奖励
- `created_at`：点赞时间，这次 Like 创建的时间戳

### 6.4 RewardConfig

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
- `max_rewardable_likes_per_tweet`：单 Tweet 最大奖励点赞数，一条 Tweet 最多可结算奖励的点赞次数
- `min_tweets_before_like_reward`：点赞奖励最低发帖门槛，作者至少发够多少条 Tweet 后才能领取点赞奖励

设计要求：

- 全局唯一 PDA
- 只允许管理员更新

### 6.5 Stake

用途：

- 表示 NFT 质押状态

字段要求：

- `authority`：质押人地址，发起质押的用户钱包
- `mint`：质押 NFT 的 mint 地址，被锁定的 NFT 标识
- `at`：质押开始 epoch，记录进入质押时的 epoch 编号

语义：

- `at` 表示开始质押时的 epoch

---

## 7. 功能需求

### 7.1 创建 Profile

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

### 7.2 创建 Tweet

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
- 触发 `TweetCreated` 事件

### 7.3 删除 Tweet

功能描述：

作者可删除自己的 Tweet。

规则：

- 仅作者本人可删除
- 删除采用软删除
- 软删除后不能继续点赞或领取奖励
- 前端不再展示已删除 Tweet

结果：

- `deleted = true`
- 触发 `TweetDeleted` 事件

### 7.4 创建 Like

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

### 7.5 作者领取点赞奖励

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
- 触发 `RewardIssued` 事件

### 7.6 初始化 NFT Mint

功能描述：

用户初始化自己里程碑 NFT 对应的 mint 账户。

说明：

- 这是当前实现所需的准备步骤
- V1 前端会显式暴露这个操作
- 后续版本可考虑改为系统自动处理

### 7.7 初始化 Token Mint

功能描述：

管理员初始化全局 Token Mint。

规则：

- 全局唯一
- 只允许管理员操作
- 作为点赞奖励和解质押奖励的 Token 基础设施

### 7.8 初始化 / 更新 RewardConfig

功能描述：

管理员初始化或更新全局奖励参数。

规则：

- 全局唯一
- 只允许 `authority` 更新

### 7.9 创建 Stake

功能描述：

用户将自己的里程碑 NFT 质押。

前置条件：

- 持有 NFT
- 至少有一条有效 Tweet
- 当前未处于质押状态

规则：

- V1 仅支持单 NFT 质押
- 创建 Stake 时不直接发放奖励

结果：

- NFT 转入 stake ATA
- 创建 Stake 账户
- 触发 `StakeCreated` 事件

### 7.10 Unstake

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

## 8. 风控与限制

### 8.1 最小反作弊

- 禁止自赞
- 同一用户对同一 Tweet 只能点赞一次
- 已删除 Tweet 不可点赞
- 已删除 Tweet 不可继续领奖
- 发帖受每日上限控制
- 点赞奖励受每日上限控制
- 单条 Tweet 的计奖点赞数受上限控制
- 作者需达到最低发帖门槛后才可领取点赞奖励

### 8.2 不做的事情

- 不做女巫攻击识别
- 不做复杂链下风控模型
- 不做信用分体系

---

## 9. 前端需求

### 9.1 前端目标

V1 前端应覆盖主要业务操作，而不是仅作为静态展示。

### 9.2 页面结构

前端采用 Tab 式布局，至少包含：

- `Home`
- `Base Camp`
- `Profile`
- `Tweets`
- `Vault`
- `Admin`

### 9.3 页面职责

`Home`

- 展示产品介绍与主要入口

`Base Camp`

- 钱包连接
- 浏览器钱包 / 本地只读 / 本地 keypair 调试模式切换
- 展示全局 RewardConfig 与环境信息

`Profile`

- 创建 Profile
- 查看个人资料与统计
- 初始化 NFT Mint

`Tweets`

- 创建 Tweet
- 查看 feed
- 删除自己的 Tweet
- 点赞他人 Tweet
- 作者领取自己的点赞奖励

`Vault`

- 查看 NFT / Token 余额
- 查看 stake 状态
- 质押 / 解质押

`Admin`

- 初始化 / 更新 RewardConfig
- 初始化 Token Mint

### 9.4 使用模式

`localnet`

- 浏览器钱包默认只读
- 推荐使用 Local Keypair 调试模式进行写操作

`devnet`

- 可配合浏览器钱包直接进行演示

---

## 10. 链下索引需求

V1 不强制实现完整索引服务，但需要提供可被链下使用的数据基础。

至少支持索引：

- Profile 创建
- Tweet 创建
- Tweet 删除
- Like 创建
- Reward 发放
- Stake 创建
- Stake 关闭

链下至少需要能查询：

- 用户 Profile
- 用户 Tweet 列表
- 全站最新 Tweet 列表
- Tweet 点赞数
- 用户奖励状态
- 用户 NFT 持有状态
- 用户 stake 状态

---

## 11. 测试需求

### 11.1 Profile

- 创建成功
- 重复创建失败
- 字段长度超限失败

### 11.2 Tweet

- 发帖成功并递增计数
- 到达里程碑后发 NFT
- 超过每日发帖上限失败
- 删除后前端不再展示

### 11.3 Like

- 点赞成功并增加 `likes_count`
- 重复点赞失败
- 自赞失败
- 已删除 Tweet 不可点赞

### 11.4 Reward

- 作者成功领取点赞奖励
- 重复领取失败
- 单日奖励上限生效
- 单 Tweet 奖励上限生效
- 作者发帖门槛生效

### 11.5 Stake

- 质押成功
- 解质押成功
- 奖励按 epoch 正确结算
- 重复解质押失败

### 11.6 前端

- 主要页面可完成业务闭环
- local keypair 模式可在 localnet 提交交易
- 错误提示能转成人话

---

## 12. 当前已知实现说明

- RewardConfig 为全局唯一 PDA
- Token Mint 为全局唯一 PDA
- NFT Mint 仍采用“每个用户一份 mint”模型
- 点赞奖励已经改成“作者自己领取”
- 删除为链上软删除，前端默认过滤已删除 Tweet
- 当前前端使用 `React + TypeScript + Vite`

---

## 13. 后续版本方向

不属于当前 V1，但后续可以考虑：

- 评论
- 关注关系
- 自动化 NFT mint 初始化
- 作者奖励批量结算
- 更完整的个人主页
- 奖励流水页面
- devnet 演示部署脚本
- 更完善的链下索引
