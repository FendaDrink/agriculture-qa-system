# 工作区变更总结（2026-04-19）

本次工作区增量修改主要聚焦：中文知识库兼容、上传分段策略与预览、后台中文化与交互细节优化。

## 1. 中文知识库名兼容

### 1.1 向量库 ID 生成策略修正（后端）
- 新建向量库时不再将中文名称直接拼入 ID。
- 改为 ASCII 安全格式（`kb_` + UUID 片段），避免 Chroma 集合名校验失败。

涉及文件：
- `backend/src/modules/database/database.service.ts`

### 1.2 算法侧集合名安全映射
- 在算法服务中增加 collection_id 安全映射函数：
  - 若 ID 不满足 Chroma 规则，自动映射到合法哈希名。
- 保证上传、检索、删除向量库在中文场景下稳定运行。

涉及文件：
- `algorithm-rag/main_v2.py`

---

## 2. 文档上传分段能力升级

### 2.1 新增分段策略参数（后端透传）
- 上传文档 DTO 增加：
  - `chunkRule`
  - `chunkSize`
  - `chunkOverlap`
  - `minChunkSize`
- 参数增加数值类型转换，避免 query 字符串导致校验失败。

涉及文件：
- `backend/src/modules/database/document/dto/uploadDocDto.dto.ts`

### 2.2 新增“分段预览”链路
- 后端新增上传前分段预览接口：
  - `POST /database/document/preview-chunks`
- 外部 API 服务新增预览转发方法。
- 文档服务新增预览逻辑（仅预览不入库）。

涉及文件：
- `backend/src/common/api/externalApi.service.ts`
- `backend/src/modules/database/document/document.controller.ts`
- `backend/src/modules/database/document/document.service.ts`

### 2.3 算法服务分段规则增强
- 新增并支持多种分段规则：
  - `semantic_hybrid`
  - `sentence_pack`
  - `title_structure`
  - `fixed_window`
- 上传接口与预览接口均可按策略参数分段。
- 预览接口返回：前10条、总分段数、平均/最大/最小长度等统计。

涉及文件：
- `algorithm-rag/main_v2.py`

---

## 3. 管理后台上传体验优化

### 3.1 上传弹窗支持策略配置 + 预览
- 上传弹窗新增分段规则与参数输入。
- 新增“预览前10条分段”按钮。
- 右侧 Drawer 展示预览结果与统计指标。

涉及文件：
- `frontend-admin/src/api/documents.ts`
- `frontend-admin/src/pages/collections/DocumentList.tsx`

### 3.2 文档列表交互优化
- 面包屑支持点击返回。
- 文档列表支持点击整行进入分段详情。
- 操作区“分段”按钮改为“查看”，并使用绿色主按钮。

涉及文件：
- `frontend-admin/src/components/PageHeader.tsx`
- `frontend-admin/src/pages/collections/DocumentList.tsx`

### 3.3 后台中文化与样式修正
- 全局 Ant Design locale 切换为中文（含默认按钮文案、分页文案等）。
- dayjs 切换中文 locale。
- 分段列表卡片恢复垂直间距。

涉及文件：
- `frontend-admin/src/main.tsx`
- `frontend-admin/src/styles/global.css`

---

## 4. 本次改动文件清单

- `algorithm-rag/main_v2.py`
- `backend/src/common/api/externalApi.service.ts`
- `backend/src/modules/database/database.service.ts`
- `backend/src/modules/database/document/document.controller.ts`
- `backend/src/modules/database/document/document.service.ts`
- `backend/src/modules/database/document/dto/uploadDocDto.dto.ts`
- `frontend-admin/src/api/documents.ts`
- `frontend-admin/src/components/PageHeader.tsx`
- `frontend-admin/src/main.tsx`
- `frontend-admin/src/pages/collections/DocumentList.tsx`
- `frontend-admin/src/styles/global.css`

