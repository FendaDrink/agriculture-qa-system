# 日志功能更新说明（2026-04-18）

## 1. 背景与目标
本次更新对系统日志能力进行重构与补齐，目标如下：
- 记录前台（`frontend`）与后台（`frontend-admin`）发起的 API 请求。
- 同时记录算法服务（`algorithm-rag/main_v2.py`）侧请求日志。
- 通过 `source` 字段区分日志来源（`backend` / `algorithm`）。
- 日志保存请求原始内容（请求头、query、body、错误信息与堆栈）。
- 仅记录 API 请求，不记录静态资源请求。
- 默认按 30 天执行日志清理。
- 提供日志列表与详情查看能力：列表显示关键字段，点击后通过 Drawer 查看完整详情。

## 2. 数据模型与存储
### 2.1 新增日志表（RAG 库）
新增表：`request_logs`

核心字段：
- 基础：`id`、`create_time`、`source`、`client_app`、`request_id`
- 请求信息：`method`、`path`、`original_url`、`status_code`、`duration_ms`
- 访问端信息：`ip`、`user_agent`、`referer`
- 用户信息：`user_id`、`role_id`
- 原始内容：`headers`、`query`、`body`
- 错误内容：`error_message`、`error_stack`

并对常用检索字段建立索引（如时间、来源、状态码、用户、方法+路径）。

### 2.2 30 天清理策略
新增定时清理服务：
- 启动时先执行一次 `cleanupByDays(30)`
- 后续每 24 小时执行一次清理

## 3. 后端日志能力（NestJS）
### 3.1 新增模块
新增 `logs` 模块：
- `LogsService`：日志写入、列表查询、指标统计、详情查询、按天清理
- `LogsController`：对外接口
- `RequestLogMiddleware`：全局请求采集中间件
- `LogsScheduler`：30 天清理调度

### 3.2 采集范围
仅记录 API 前缀：
- `/auth`
- `/user`
- `/database`
- `/chat`
- `/logs`

静态资源请求不记录。

### 3.3 状态码与错误信息采集
为确保记录的是业务状态码（而不是 HTTP 200 包装结果），在统一响应拦截器与全局异常过滤器里透传：
- `__appCode`
- `__appMessage`
- `__errorMessage`
- `__errorStack`

中间件在响应结束时统一落库。

### 3.4 日志查询接口（仅管理员可访问）
新增接口：
- `GET /logs`：分页列表查询（支持多条件筛选）
- `GET /logs/metrics`：统计指标（总数、错误数、错误率、平均耗时、P95、Top 接口、慢接口、近期错误）
- `GET /logs/:id`：单条日志详情

权限：仅 `roleId` 为 `0/1` 可访问。

## 4. 算法服务日志能力（FastAPI）
在 `algorithm-rag/main_v2.py` 增加请求日志中间件：
- 对 API 请求进行采集并写入 `request_logs`
- `source` 固定为 `algorithm`
- 保留请求原始内容与错误堆栈
- 对 `multipart/form-data` 仅记录元信息，避免直接写入二进制文件内容

## 5. 客户端来源标识
为便于区分请求来源，增加请求头：`X-Client-App`
- `frontend-admin`：`admin`
- `frontend`：`frontend`
- `backend -> algorithm`：`backend`

## 6. 管理后台页面（日志审计）
### 6.1 新增页面
新增页面：`日志审计`
- 列表展示关键字段（时间、来源、客户端、方法、路径、状态、耗时、用户等）
- 支持筛选：时间范围、来源、客户端、方法、关键词、用户ID、状态码
- 顶部统计卡：请求总数、错误数、错误率、平均耗时、P95

### 6.2 详情展示
- 点击列表行打开右侧 Drawer
- 展示完整信息（Headers / Query / Body / Error Stack）

### 6.3 菜单与路由
- 管理员菜单新增“日志审计”入口
- 路由加入 `/logs`

## 7. 本次主要变更文件
- 后端：
  - `backend/src/modules/logs/**`
  - `backend/src/app.module.ts`
  - `backend/src/common/interceptors/response.interceptor.ts`
  - `backend/src/common/filters/all-exceptions.filter.ts`
  - `backend/src/common/api/externalApi.service.ts`
- 算法：
  - `algorithm-rag/main_v2.py`
- 管理后台：
  - `frontend-admin/src/api/logs.ts`
  - `frontend-admin/src/pages/logs/LogList.tsx`
  - `frontend-admin/src/routes/AppRoutes.tsx`
  - `frontend-admin/src/layouts/MainLayout.tsx`
  - `frontend-admin/src/api/client.ts`
  - `frontend-admin/src/api/rawClient.ts`
- 前台：
  - `frontend/src/services/api.ts`

## 8. 验证情况
已完成：
- `backend` 构建通过
- `frontend-admin` 构建通过

说明：
- 算法侧 Python 语法编译在当前沙箱环境受缓存目录写权限限制，未进行 `py_compile` 落盘校验；已完成代码级实现并接入现有运行逻辑。

