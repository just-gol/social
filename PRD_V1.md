# Social V1 PRD

## 1. 文档目标

本文档定义 `social` 项目的 V1 产品需求。

V1 的目标不是做完整社交平台，而是完成一个可运行、可验证、可演示的链上社交激励闭环，覆盖：

- 用户注册
- 发帖
- 点赞
- 点赞奖励
- 里程碑 NFT
- NFT 质押 / 解质押
- 全局奖励配置

V1 不包含评论、关注、转发、通知、推荐、治理投票、复杂经济模型。

---

## 2. 产品定位

`social` 是一个基于 Solana + Anchor 的链上社交激励原型。

核心思路：

1. 用户在链上创建自己的 Profile
2. 用户发 Tweet，形成基础内容生产
3. 用户获得互动后，系统根据配置发放奖励
4. 达到发帖里程碑时，用户获得 NFT 徽章
5. 用户可以将 NFT 质押，获得额外 Token 激励

V1 更偏向于：

- 社交行为上链
- 运营参数可调
- 基础刷奖励限制
- 链下可索引

---

## 3. V1 范围

### 3.1 In Scope

- Profile 创建与展示字段
- Tweet 创建与软删除
- Like 创建
- 点赞奖励发放
- 里程碑 NFT 发放
- NFT 质押 / 解质押
- 全局 RewardConfig
- 奖励与行为事件
- 最小反作弊限制
- 测试覆盖主要成功 / 失败路径

### 3.2 Out of Scope

- 评论
- 关注 / 取关
- 转发 / 引用转发
- 私信
- 站内通知
- 社区治理
- 多种 NFT 类型
- 推荐系统
- 完整链下索引服务实现
- 前端产品化页面

---

## 4. 用户角色

### 4.1 普通用户

能力：

- 创建个人资料
- 发帖
- 删除自己的帖子
- 点赞别人的帖子
- 获得 NFT 与 Token 奖励
- 质押与解质押自己的 NFT

### 4.2 平台管理员

能力：

- 初始化全局 RewardConfig
- 更新全局 RewardConfig

约束：

- V1 采用单管理员模式
- 暂不支持治理投票

---

## 5. 核心业务闭环

### 5.1 用户生命周期

1. 用户创建 Profile
2. 用户发 Tweet
3. 当发帖数达到 milestone 时，获得 NFT
4. 其他用户对 Tweet 点赞
5. 满足条件时，作者获得点赞 Token 奖励
6. 作者将 NFT 质押
7. 解质押时获得质押奖励并取回 NFT

### 5.2 V1 成功标准

- 能完整跑通“注册 -> 发帖 -> 点赞 -> 奖励 -> 质押 -> 解质押”
- 奖励规则不写死在逻辑里，而由全局 RewardConfig 控制
- 关键刷奖励路径被基本限制
- 行为和奖励可通过事件进行链下索引
- 主要业务有自动化测试

---

## 6. 数据模型需求

### 6.1 Profile

用途：

- 表示用户链上身份
- 保存展示字段
- 保存行为计数与奖励累计信息

字段要求：

- `name`：展示名称
- `bio`：个人简介
- `avatar_uri`：头像地址
- `tweet_count`：累计发帖数
- `last_tweet_day`：最近发帖自然日
- `daily_tweet_count`：当日发帖计数
- `last_like_reward_day`：最近领取点赞奖励的自然日
- `daily_like_reward_count`：当日已领取点赞奖励次数
- `token_rewards_earned`：累计获得 Token 数量
- `nft_rewards_earned`：累计获得 NFT 数量

### 6.2 Tweet

用途：

- 表示链上内容

字段要求：

- `content`：文本内容
- `author`：作者钱包地址
- `likes_count`：总点赞数
- `rewardable_likes_count`：已计入奖励的点赞数
- `created_at`：创建时间戳
- `deleted`：软删除标记

约束：

- V1 仅支持纯文本 Tweet
- 不支持编辑
- 删除为软删除，不做物理删除

### 6.3 Like

用途：

- 表示一次点赞行为
- 防止重复点赞
- 防止重复领取奖励

字段要求：

- `profile_pda`
- `tweet_pda`
- `reward_claimed`
- `created_at`

### 6.4 RewardConfig

用途：

- 作为平台全局奖励配置
- 所有用户共享同一套参数

字段要求：

- `authority`
- `name`
- `symbol`
- `uri`
- `milestone_tweet_count`
- `like_reward_amount`
- `stake_base_reward_amount`
- `stake_reward_per_epoch`
- `daily_tweet_reward_cap`
- `daily_like_reward_cap`
- `max_rewardable_likes_per_tweet`
- `min_tweets_before_like_reward`

设计要求：

- 全局唯一 PDA
- 只允许管理员更新

### 6.5 Stake

用途：

- 表示 NFT 质押状态

字段要求：

- `authority`
- `mint`
- `at`

语义：

- `at` 表示开始质押时的 epoch

---

## 7. 功能需求

## 7.1 创建 Profile

### 功能描述

用户可创建自己的链上 Profile。

### 输入

- `name`
- `bio`
- `avatar_uri`

### 规则

- 一个钱包只能创建一个 Profile
- 名称、简介、头像地址需要满足长度限制

### 结果

- 成功创建 Profile
- 触发 `ProfileCreated` 事件

---

## 7.2 创建 Tweet

### 功能描述

用户发布一条新的 Tweet。

### 输入

- `content`

### 规则

- 必须已存在 Profile
- Tweet 内容长度受限
- 需要检查用户当日发帖上限
- Tweet 创建后记录时间戳

### 奖励规则

- 当 `tweet_count` 达到 `milestone_tweet_count` 时，触发里程碑 NFT 奖励
- 该奖励通过全局 RewardConfig 决定

### 结果

- 成功创建 Tweet
- `tweet_count` 增加
- 可能铸造 NFT
- 触发 `TweetCreated`
- 若发 NFT，再触发 `RewardIssued`

---

## 7.3 删除 Tweet

### 功能描述

作者可以删除自己的 Tweet。

### 规则

- 仅作者本人可以删除
- 删除后仅设置 `deleted = true`
- 已删除 Tweet 不可继续点赞或领取奖励

### 结果

- Tweet 被软删除
- 触发 `TweetDeleted`

---

## 7.4 创建 Like

### 功能描述

用户可以给别人发布的 Tweet 点赞。

### 规则

- 同一用户对同一 Tweet 只能点赞一次
- 禁止自赞
- 已删除 Tweet 不允许点赞

### 结果

- `likes_count` 增加
- 创建 Like 记录
- 触发 `LikeCreated`

---

## 7.5 点赞奖励发放

### 功能描述

点赞行为可触发作者获得 Token 奖励。

### 规则

- 奖励不是在 `create_like` 时自动发放
- 奖励通过单独的 `mint_like_reward` 发放
- 同一 Like 只能发一次奖励
- 作者必须满足最小发帖门槛：
  - `author_profile.tweet_count >= min_tweets_before_like_reward`
- 点赞领取方需要受每日奖励次数限制
- 单条 Tweet 可计入奖励的点赞次数有上限
- 已删除 Tweet 不允许继续发奖励

### 奖励金额

- 由 `like_reward_amount` 决定

### 结果

- 作者获得 Token
- Like 标记为已领取奖励
- 作者的 `token_rewards_earned` 增加
- 触发 `RewardIssued`

---

## 7.6 里程碑 NFT

### 功能描述

当用户发帖达到 milestone 时，获得一个 NFT 徽章。

### 规则

- 里程碑由 `milestone_tweet_count` 控制
- V1 只有一类 milestone NFT
- 主要含义是创作者里程碑凭证

### 结果

- NFT mint 数量增加
- 用户 ATA 收到 1 个 NFT
- 用户 `nft_rewards_earned` 增加
- 触发 `RewardIssued`

---

## 7.7 创建 Token Mint / NFT Mint

### 功能描述

- 平台有一套全局 Token Mint
- 每个用户配合 Profile 有对应的 NFT Mint

### 规则

- Token Mint 用于平台积分奖励
- NFT Mint 用于里程碑 NFT
- NFT 元数据由 RewardConfig 中的 `name / symbol / uri` 提供

---

## 7.8 质押 NFT

### 功能描述

用户可以质押自己的里程碑 NFT。

### 规则

- 仅允许质押用户自己的 NFT
- 仅允许质押已存在且已 mint 的 NFT
- 质押时需要记录开始 epoch
- V1 一次只支持一个 stake 记录对应一个 NFT

### 结果

- NFT 从用户账户转入 stake ATA
- 创建 Stake 记录
- 触发 `StakeCreated`

---

## 7.9 解质押 NFT

### 功能描述

用户可将已质押 NFT 解质押，并获得质押奖励。

### 奖励公式

```text
reward_amount = stake_base_reward_amount + elapsed_epochs * stake_reward_per_epoch
```

### 规则

- 仅质押人本人可以解质押
- 质押记录与 NFT Mint 必须匹配
- 解质押后关闭 Stake 账户
- 奖励在解质押时统一结算

### 结果

- NFT 返回用户账户
- 用户收到质押 Token 奖励
- 用户 `token_rewards_earned` 增加
- Stake 账户关闭
- 触发 `RewardIssued`
- 触发 `StakeClosed`

---

## 8. 风控与反作弊需求

V1 只做最小可用风控。

### 8.1 点赞相关

- 禁止自己给自己点赞
- 同一用户不能重复点赞同一条 Tweet
- 同一 Like 只能领取一次奖励

### 8.2 内容相关

- 每日发帖数有上限
- 已删除 Tweet 不参与点赞与奖励

### 8.3 奖励相关

- 每日点赞奖励领取次数有限制
- 单条 Tweet 可计奖点赞数量有限制
- 作者必须达到最小发帖数门槛，才允许发点赞奖励

### 8.4 暂不处理

- 多钱包女巫攻击
- 链下风控模型
- IP / 设备维度风控
- 社交图谱作弊识别

---

## 9. 配置策略

V1 使用全局唯一 RewardConfig。

### 原则

- 平台统一规则
- 普通用户不可自定义奖励参数
- 平台管理员统一调参

### 原因

- 早期产品需要快速试错
- 奖励参数本质是运营参数
- 治理系统复杂度过高，不适合 V1

---

## 10. 事件与链下索引需求

V1 不强制实现完整索引服务，但必须保证链下有可索引数据源。

### 必须具备的事件

- `ProfileCreated`
- `TweetCreated`
- `TweetDeleted`
- `LikeCreated`
- `RewardIssued`
- `StakeCreated`
- `StakeClosed`

### 链下至少需要支持查询

- 用户资料
- 用户 Tweet 列表
- Tweet 点赞数
- 奖励发放记录
- 用户 NFT 持有状态
- 用户质押状态

### V1 时间线范围

- 个人主页时间线
- 全站最新时间线

不做：

- 关注时间线
- 推荐流
- 热门排序

---

## 11. 非功能要求

### 11.1 可测试性

需要覆盖：

- Profile 创建成功 / 失败
- Tweet 创建 / 软删除 / 发帖上限
- 里程碑 NFT 发放
- Like 创建 / 自赞失败 / 重复奖励失败
- 点赞奖励上限
- Stake / Unstake 闭环

### 11.2 可维护性

- 奖励参数必须从 RewardConfig 读取
- 不允许继续在业务逻辑里写死奖励数字

### 11.3 可扩展性

V1 设计应为后续能力预留空间：

- 评论
- 关注
- 转发
- 多级 NFT 体系
- 治理化配置

---

## 12. V1 验收标准

满足以下条件即视为 V1 完成：

1. 可创建 Profile，并正确保存展示字段
2. 可创建 Tweet，并记录时间戳
3. 可删除 Tweet，删除后不可继续点赞和领奖
4. 达到配置里程碑时可发 NFT
5. 可创建 Like，并拦截自赞
6. 点赞奖励按配置发放
7. 点赞奖励受到每日次数和单帖次数限制
8. 作者未达到最小发帖门槛时，不可领取点赞奖励
9. 可质押 NFT
10. 可解质押并获得按配置计算的奖励
11. 所有核心行为有事件可供链下索引
12. 自动化测试通过

---

## 13. V1 之后暂缓事项

以下内容不进入本轮：

- 评论系统
- 关注系统
- 转发系统
- 推送通知
- 推荐和排序
- 多管理员和治理
- 复杂 Token 经济模型
- 完整链下索引服务实现
- 前端产品化

