# 农业智能问答助手（Taro 小程序）

## 已实现模块
- 模块 1：聊天问答
- 模块 2：会话管理

## 与 backend 对齐的接口模型
- 会话：`/chat/sessions`
- 消息：`/chat/message`
- 问答流：`/chat/completion`

## 本地运行
0. Node 版本建议：`20.x`（避免在 Node 24 下运行 Taro）
1. 安装依赖：`npm install`
2. 启动微信小程序开发：`npm run dev:weapp`
3. 在微信开发者工具导入 `frontend` 目录，编译目录选 `dist`

## 目录说明
- `src/pages/chat`：聊天问答页面
- `src/pages/sessions`：会话管理页面
- `src/services/chat.ts`：接口适配层（mock + 真实接口占位）
- `src/services/storage.ts`：本地缓存
- `src/types/chat.ts`：类型定义

## 下一步建议模块
- 模块 3：语音提问（对接 `/chat/speech`）
- 模块 4：登录与 token 管理（对接 `auth`）
- 模块 5：SSE 真流式渲染（替换当前 mock 分片）
