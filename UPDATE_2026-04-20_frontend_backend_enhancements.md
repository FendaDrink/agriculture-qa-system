# 更新说明（2026-04-20）

本次提交围绕前台问答体验、来源可追溯、后续问题推荐、FAQ推荐接口与个人中心增强进行了集中改造。

## 1. 问答来源与 PDF 预览
- 回答消息支持携带来源元数据（文件、文档、分段、分值）。
- 回答气泡展示“相关知识来源”，支持点击进入源文件预览。
- 新增小程序 `webview` PDF 预览页，补充加载态与错误重试态。
- 后端文档预览新增 `public` 兼容入口，支持 `token` query 方式用于 webview 场景。

涉及文件：
- `backend/src/modules/chat/chat.service.ts`
- `backend/src/modules/chat/chat.module.ts`
- `backend/src/modules/database/document/document.controller.ts`
- `algorithm-rag/main_v2.py`
- `frontend/src/components/MessageBubble.tsx`
- `frontend/src/components/MessageBubble.scss`
- `frontend/src/pages/pdf-viewer/index.tsx`
- `frontend/src/pages/pdf-viewer/index.config.ts`
- `frontend/src/pages/pdf-viewer/index.scss`
- `frontend/src/app.config.ts`

## 2. FAQ 推荐与聊天页推荐改造
- 后端新增 `GET /faq/recommend`，用于前台推荐问题拉取。
- 前台聊天页推荐问题改为真实接口数据，不再依赖本地 mock。
- 增加推荐问题“换一批”、频次展示、问答后自动刷新推荐。
- 聊天页启用下拉刷新，联动刷新会话与推荐问题。

涉及文件：
- `backend/src/modules/faq/faq.controller.ts`
- `backend/src/modules/faq/faq.service.ts`
- `frontend/src/services/chat.ts`
- `frontend/src/pages/chat/index.tsx`
- `frontend/src/pages/chat/index.scss`
- `frontend/src/pages/chat/index.config.ts`

## 3. 基于会话意图的“猜你继续想问”
- 新增算法侧接口：`POST /followup_suggestions`。
- 新增后端接口：`POST /chat/followup-suggestions`。
- 前台在助手回答后调用新接口，展示 3 条可点击后续问题推荐。
- 推荐逻辑改为基于当前会话上下文预测，不与高频问题强绑定。

涉及文件：
- `algorithm-rag/main_v2.py`
- `backend/src/modules/chat/dto/followup.dto.ts`
- `backend/src/modules/chat/chat.controller.ts`
- `backend/src/modules/chat/chat.service.ts`
- `backend/src/common/api/externalApi.service.ts`
- `frontend/src/services/chat.ts`
- `frontend/src/pages/chat/index.tsx`
- `frontend/src/pages/chat/index.scss`

## 4. 引用序号与消息结构改进
- 回答来源按文件去重并分配稳定序号。
- 检索上下文附带序号提示，增强回答内引用标注能力。
- `chat_message.extra` DTO/实体校验由字符串改为对象，支持结构化扩展字段。

涉及文件：
- `backend/src/modules/chat/chat.service.ts`
- `backend/src/modules/chat/message/dto/createChatMessage.dto.ts`
- `backend/src/modules/chat/message/dto/updateChatMessage.dto.ts`
- `backend/src/modules/chat/message/dto/chatMessage.dto.ts`
- `backend/src/modules/chat/message/entities/chatMessage.entity.ts`
- `frontend/src/types/chat.ts`

## 5. 登录用户名乱码修复
- 修复 JWT payload 解析：兼容 `base64url` + UTF-8 解码，避免中文 `username` 乱码。

涉及文件：
- `frontend/src/utils/auth.ts`
- `frontend/src/pages/login/index.tsx`

## 6. 前台个人中心增强
- 个人中心由单一信息页升级为多卡片控制台：
  - 个人头部信息（昵称、角色、城市）
  - 数据概览（会话数、引导题数量、登录状态）
  - 快捷入口（问答/高频/会话）
  - 连接与模型设置（地址、模型、知识库、保存、连通性测试）
  - 账号与安全（Token 显隐/复制）
  - 数据与退出（清空本地设置、退出登录）

涉及文件：
- `frontend/src/pages/profile/index.tsx`
- `frontend/src/pages/profile/index.scss`
- `frontend/src/services/settings.ts`

## 7. 其他体验优化
- 回答消息支持长按复制。
- 聊天与来源展示样式细节优化。

涉及文件：
- `frontend/src/components/MessageBubble.tsx`
- `frontend/src/components/MessageBubble.scss`

## 校验记录
- 后端构建通过：`yarn --cwd backend build`
- 前端 TypeScript 校验通过：`frontend ./node_modules/.bin/tsc --noEmit`
- 算法脚本语法检查通过（AST parse）
- 注：`yarn --cwd frontend build:weapp` 在当前环境受 Taro/Rust 运行时问题影响（与业务改动无关）。
