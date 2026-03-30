# Social V2 PRD

## 1. 文档目标

本文档用于说明 `social` 项目 V2 当前已经实现的产品范围，并明确哪些内容属于 V2 已交付能力，哪些内容被延后到后续版本。

V2 基于 V1 的“Profile + Tweet + Like + Reward + NFT + Stake”闭环，新增的核心主题是：

- 评论系统
- 关注 / 取关
- 基础社交资料视图
- 基础通知视图
- 更完整的前端社交交互

V2 的目标不是把项目做成完整的 Twitter 替代品，而是在现有链上社交激励模型上补出“社交关系”和“互动层”。

---

## 2. V2 定位

### 2.1 V2 核心目标

V2 要回答的问题是：

1. 在 V1 的发帖、点赞、奖励基础上，用户之间能否形成更真实的社交关系
2. 前端是否能从“操作台式页面”升级为“接近产品形态的社交应用”

因此 V2 的重点不再是奖励模型扩张，而是：

- 内容互动补全
- 社交关系建模
- 用户资料与关系展示
- 基础通知与社交入口

### 2.2 V2 成功标准

当前版本视为 V2 完成的标准如下：

- 用户可以完成“注册 -> 发帖 -> 评论 -> 关注 -> 点赞 -> 作者领奖 -> 质押”的完整流程
- 评论与关注关系有链上状态、事件和测试覆盖
- 前端可以完成评论、关注 / 取关、查看 followers / following、查看用户详情
- 前端具备 feed 过滤、通知列表、基础社交资料查看

---

## 3. V2 当前范围

### 3.1 已实现内容

- 评论系统
- 关注 / 取关
- 用户资料弹层
- Followers / Following 列表
- 通知页
- Feed 过滤
- 评论与关注事件
- 评论与关注测试

### 3.2 延后内容

以下内容不再视为 V2 阻塞项，延后到后续版本：

- 独立用户主页路由
- 链下索引服务
- 完整奖励记录页
- 分页与搜索
- 通知已读 / 未读
- 更细的运营后台
- 更复杂的风控参数

---

## 4. 用户角色

### 4.1 普通用户

普通用户当前具备：

- 创建 Profile
- 发 Tweet
- 删除自己的 Tweet
- 评论 Tweet
- 删除自己的评论
- 关注 / 取关其他用户
- 点赞 Tweet
- 作为作者领取点赞奖励
- 查看 followers / following
- 查看用户资料详情
- 查看基础通知
- 初始化自己的 NFT Mint
- 质押 / 解质押 NFT

### 4.2 管理员

管理员当前具备：

- 初始化全局 RewardConfig
- 更新全局 RewardConfig
- 初始化全局 Token Mint
- 查看基础链上配置状态

V2 仍采用单管理员模式，不引入治理。

---

## 5. 合约需求与实现结果

## 5.1 Comment

### 用途

用于记录用户对某条 Tweet 的一级评论。

### 当前实现

- 已新增 `Comment` 状态
- 已新增 `create_comment`
- 已新增 `delete_comment`
- 已新增 `CommentCreated`
- 已新增 `CommentDeleted`

### 字段

- `author`：评论作者地址，发起评论的钱包地址
- `content`：评论内容，单条评论文本
- `tweet_pda`：所属 Tweet 账户地址，这条评论属于哪条 Tweet
- `author_profile_pda`：评论作者 Profile 地址，评论者自己的 Profile
- `created_at`：创建时间，评论写入链上的时间
- `deleted`：是否软删除，评论是否已被删除

### 当前规则

- 一条评论只属于一条 Tweet
- 仅支持一级评论
- 评论长度受限
- 已删除 Tweet 不允许创建新评论
- 评论删除采用软删除
- 当前实现为“一人一帖一条评论”

### 计数逻辑

- `Tweet.comments_count`：单条 Tweet 的评论数
- `Profile.comments_received_count`：该用户所有 Tweet 累计收到的评论数

### 已覆盖测试

- 创建评论成功
- 删除自己的评论成功
- 已删除 Tweet 不能评论
- 不能删除别人的评论
- 同一用户重复评论同一 Tweet 失败
- Tweet 删除后评论作者仍可删除评论
- 评论删除后再次删除失败

---

## 5.2 Follow

### 用途

用于记录用户之间的关注关系。

### 当前实现

- 已新增 `Follow` 状态
- 已新增 `create_follow`
- 已新增 `cancel_follow`
- 已新增 `FollowCreated`
- 已新增 `FollowCanceled`

### 字段

- `follower`：关注发起者地址，主动关注别人的用户
- `following`：被关注者地址，被关注的目标用户
- `follower_profile_pda`：关注者 Profile 地址
- `following_profile_pda`：被关注者 Profile 地址
- `created_at`：关注关系创建时间

### 当前规则

- 禁止关注自己
- 不允许重复关注
- 取消关注时关闭 Follow 账户
- Follow 关系当前按 `authority + following_profile` 推导 PDA

### 计数逻辑

- `Profile.followers_count`：粉丝数，关注该用户的人数
- `Profile.following_count`：关注数，该用户主动关注的人数

### 已覆盖测试

- 创建关注成功
- 取消关注成功
- 自己关注自己失败
- 重复关注失败
- 非本人不能取消别人的关注关系

---

## 5.3 Profile 扩展

V2 基于 V1 对 `Profile` 继续扩展，当前用于承载：

- `followers_count`：粉丝数，关注这个用户的人数
- `following_count`：关注数，这个用户关注了多少人
- `comments_received_count`：收到的评论总数，该用户所有 Tweet 累计收到的评论数
- `authority`：Profile 所属的钱包地址

---

## 6. 前端需求与实现结果

## 6.1 页面结构

当前前端仍采用单应用多 Tab 结构，但已经不是纯演示页。

当前主 Tab：

- `Home`
- `Base Camp`
- `Profile`
- `Tweets`
- `Notifications`
- `Vault`
- `Admin`

### 当前结论

- V2 已实现多功能分区
- 还没有做真正的多路由页面体系

---

## 6.2 Profile 相关体验

当前已实现：

- 查看自己的 Profile
- 查看 followers / following 统计
- 点击头像卡进入关系查看入口
- 打开 followers / following 列表
- 点击用户项查看用户详情弹层

用户详情弹层当前展示：

- 名称
- Bio
- 地址缩写
- Tweet 数
- Followers 数
- Following 数
- Comments Received 数
- 最近 tweets
- Follow / Unfollow 按钮

---

## 6.3 Feed / Tweet 相关体验

当前已实现：

- 创建 Tweet
- 删除 Tweet
- Like Tweet
- 作者结算点赞奖励
- 创建评论
- 删除自己的评论
- 从 Tweet 作者头像进入用户详情
- 从评论作者头像进入用户详情

当前 Feed 已支持过滤：

- `Latest`
- `Following`
- `Mine`

---

## 6.4 Followers / Following 列表

当前已实现：

- 展示粉丝列表
- 展示关注列表
- 在列表内直接执行 `Follow / Unfollow`
- 点击列表用户进入用户详情弹层

这部分已经满足 V2 基础社交关系展示需求。

---

## 6.5 Notifications

当前已实现基础通知页。

通知来源包括：

- 新关注
- 别人评论了你的 Tweet
- 作者可结算的奖励提醒

当前通知页为聚合视图，不做链下持久化，也不区分已读 / 未读。

---

## 7. 当前 V2 不再要求的内容

以下内容曾在早期 V2 规划中出现，但当前版本不再作为 V2 必做项：

- 独立用户主页路由
- 完整奖励记录页
- 链下索引服务
- 通知中心已读 / 未读
- Feed 分页与搜索
- 评论多级回复
- 更复杂的风控配置

这些更适合进入后续版本。

---

## 8. 验收结论

基于当前实现，V2 可以定义为：

### 已完成

- 合约层的评论与关注能力
- 合约事件与统计字段
- 评论与关注测试补齐
- 前端评论与关注交互
- 前端 followers / following 列表
- 前端用户详情弹层
- 前端通知页
- Feed 过滤能力

### 未完成但已明确延后

- 独立多路由用户主页
- 链下索引服务
- 奖励记录页
- 更细的社交通知体系

### 最终结论

按当前项目实际交付范围，**V2 核心目标已完成**。  
当前代码库中的 V2 应被理解为：

“在 V1 社交激励闭环基础上，已经补齐评论、关注与基础社交产品视图的版本。”
