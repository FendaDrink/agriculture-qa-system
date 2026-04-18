# 前台美化更新说明（2026-04-18）

## 1. 本次目标
本次更新聚焦 `frontend`（Taro 小程序）视觉与交互体验，原则是：
- 不改业务流程与接口调用逻辑
- 统一页面视觉语言
- 提升核心链路（首页 -> 聊天 -> 发送）的可用性与质感
- 增强窄屏与安全区适配

## 2. 主要改动概览

### 2.1 全局主题升级
- 全局背景改为多层渐变与光斑氛围，整体观感更柔和。
- 卡片统一为半透明玻璃质感（圆角、阴影、边框、模糊）。
- 统一字体栈与基准色系，提升页面一致性。

对应文件：
- `frontend/src/app.scss`

### 2.2 首页视觉重构
- 新增顶部品牌区（Badge + 副标题）。
- 轮播区域强化层次（圆角、阴影、遮罩优化）。
- 新增功能指标条（24h / RAG / 多轮）。
- CTA 按钮升级为渐变主按钮，增强行动引导。

对应文件：
- `frontend/src/pages/home/index.tsx`
- `frontend/src/pages/home/index.scss`

### 2.3 聊天页核心体验优化
- 顶部工具栏、会话面板、聊天面板统一风格。
- 会话激活态增强（色块标识 + 边框层次）。
- 输入区视觉升级（内阴影输入框 + 渐变发送按钮）。
- 新增发送中反馈：
  - “AI 正在组织答案...”提示
  - 骨架 shimmer 占位动画

对应文件：
- `frontend/src/pages/chat/index.tsx`
- `frontend/src/pages/chat/index.scss`

### 2.4 消息气泡与提问标签优化
- 消息气泡升级（阴影、圆角、色彩层次）。
- 增加入场动画，减少生硬感。
- 问题标签（chips）统一渐变与边框风格。

对应文件：
- `frontend/src/components/MessageBubble.scss`
- `frontend/src/components/QuestionChips.scss`

### 2.5 其他页面统一美化
- 登录页：品牌头部、表单层次、按钮强化。
- 个人页：卡片与未登录提示统一样式。
- FAQ 页：卡片、按钮、背景风格统一。
- 会话管理页：输入区与列表项状态增强。

对应文件：
- `frontend/src/pages/login/index.tsx`
- `frontend/src/pages/login/index.scss`
- `frontend/src/pages/profile/index.tsx`
- `frontend/src/pages/profile/index.scss`
- `frontend/src/pages/faq/index.tsx`
- `frontend/src/pages/faq/index.scss`
- `frontend/src/pages/sessions/index.tsx`
- `frontend/src/pages/sessions/index.scss`

## 3. 窄屏与安全区适配

### 3.1 安全区
新增通用类：
- `safe-shell`
- `safe-bottom`
- `safe-top`

在首页、登录、聊天、FAQ、会话、个人页接入，避免刘海屏/底部手势区遮挡。

### 3.2 窄屏适配
针对 `max-width: 430px` 增加字体与间距调整：
- 标题字号、按钮内边距、面板宽度、页面 padding 统一下调
- 保证信息密度与触控区域平衡

## 4. 验证结果
- `npx tsc --noEmit`：通过
- `npm run build:weapp`：当前环境触发 Taro 依赖系统层 panic（`system-configuration ... Attempted to create a NULL object`），属于环境问题，不是本次样式变更引入的语法错误。

## 5. 影响范围
- 仅前台 `frontend` 样式与局部展示结构调整。
- 未修改聊天/登录/会话等业务接口及核心数据流。

