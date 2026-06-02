# 高优先级需求实施计划

## 需求概述

本文档详细规划了三个高优先级需求的实施计划，包括自动保存+版本历史、性能优化和权限管控。

---

## 阶段一：自动保存功能（优先级最高）

### 1.1 实现内容

#### 自动快照保存
- **触发规则**：编辑页面每1分钟自动生成快照
- **存储逻辑**：区分"手动保存版"和"自动快照版"
- **保留策略**：自动快照仅保留最近3次
- **恢复能力**：页面刷新/崩溃后自动弹窗提示恢复

#### 实现步骤

1. **前端实现**
   - 创建 `useAutoSave` Hook
   - 使用 `localStorage` 存储快照数据
   - 实现1分钟定时器自动保存
   - 页面加载时检测并提示恢复

2. **后端实现**
   - 创建 `novel_snapshots` 表
   - 创建 API 接口：`POST /api/novels/[id]/snapshots`
   - 创建 API 接口：`GET /api/novels/[id]/snapshots`
   - 创建 API 接口：`POST /api/novels/[id]/snapshots/[snapshotId]/restore`

3. **数据库表结构**
```sql
CREATE TABLE novel_snapshots (
  id VARCHAR(255) PRIMARY KEY,
  novel_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  snapshot_type VARCHAR(20) NOT NULL, -- 'manual' | 'auto'
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
);
```

### 1.2 验收标准
- ✅ 编辑操作持续1分钟无手动保存，后台可查询到快照数据
- ✅ 页面崩溃后恢复，快照内容100%还原未保存操作
- ✅ 自动快照仅保留最近3次

---

## 阶段二：版本历史管理

### 2.1 实现内容

#### 版本留存
- **保留数量**：保留最近30个版本
- **标注方式**：按"操作时间 + 操作人"标注
- **备份机制**：核心配置每日自动备份，保留90天

#### 版本操作
- **时间回溯**：支持按时间回溯版本
- **版本对比**：对比任意两个版本的内容差异（高亮修改字段）
- **一键恢复**：恢复至指定历史版本

#### 实现步骤

1. **后端实现**
   - 创建 `novel_versions` 表
   - 创建 API 接口：`POST /api/novels/[id]/versions`
   - 创建 API 接口：`GET /api/novels/[id]/versions`
   - 创建 API 接口：`POST /api/novels/[id]/versions/[versionId]/restore`
   - 创建 API 接口：`GET /api/novels/[id]/versions/[versionId]/compare/[otherVersionId]`

2. **数据库表结构**
```sql
CREATE TABLE novel_versions (
  id VARCHAR(255) PRIMARY KEY,
  novel_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
);
```

3. **前端实现**
   - 版本历史列表组件
   - 版本对比组件（使用 diff 库）
   - 版本恢复确认对话框

### 2.2 验收标准
- ✅ 可清晰查看15个以内的版本列表
- ✅ 版本差异对比精准
- ✅ 恢复旧版本后配置100%生效
- ✅ 每日备份自动执行，故障时可在10分钟内恢复

---

## 阶段三：操作日志记录

### 3.1 实现内容

#### 日志记录
- **记录范围**：所有编辑操作（新增/修改/删除/发布）
- **日志字段**：操作人ID/昵称、操作时间、操作内容、操作结果、IP地址
- **保留时间**：日志保留90天
- **查询功能**：支持按条件筛选查询

#### 数据加密
- **前端脱敏**：敏感数据（API密钥）仅展示后4位
- **传输加密**：HTTPS加密传输
- **存储加密**：敏感数据脱敏存储

#### 实现步骤

1. **数据库表结构**
```sql
CREATE TABLE operation_logs (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  novel_id VARCHAR(255),
  operation_type VARCHAR(50) NOT NULL,
  operation_content JSONB,
  operation_result VARCHAR(20),
  ip_address VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

2. **后端实现**
   - 创建日志记录中间件
   - 创建 API 接口：`GET /api/operation-logs`
   - 创建 API 接口：`GET /api/operation-logs/export`

### 3.2 验收标准
- ✅ 所有操作均有日志记录
- ✅ 字段完整，查询/导出功能正常
- ✅ 日志不可篡改
- ✅ 敏感数据脱敏显示

---

## 阶段四：性能优化

### 4.1 实现内容

#### 前端交互提速
- **性能指标**：单次组件操作响应≤200ms，预览加载≤500ms
- **懒加载**：编辑页面采用懒加载策略
- **缓存**：高频资源本地缓存30天
- **反馈机制**：所有操作即时显示加载态

#### 后端接口优化
- **缓存策略**：核心接口启用缓存
- **异步处理**：非核心接口降级优先级
- **协作同步**：增量同步+编辑锁定

#### 实现步骤

1. **前端优化**
   - 实现虚拟滚动
   - 实现组件懒加载
   - 添加加载态反馈
   - 本地缓存常用数据

2. **后端优化**
   - 添加 Redis 缓存
   - 实现异步任务队列
   - 优化数据库查询
   - 添加接口响应时间监控

### 4.2 验收标准
- ✅ 组件操作响应≤200ms
- ✅ 预览加载≤500ms
- ✅ 核心接口平均响应时间降低≥60%

---

## 阶段五：权限管控

### 5.1 实现内容

#### 精细化权限管控
- **权限分级**：编辑/查看/发布/管理
- **维度配置**：按"小说维度"配置权限
- **操作限制**：敏感操作需二次确认
- **权限校验**：所有操作触发前校验权限

#### 实现步骤

1. **数据库表结构**
```sql
CREATE TABLE novel_permissions (
  id VARCHAR(255) PRIMARY KEY,
  novel_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  permission_level VARCHAR(20) NOT NULL, -- 'view' | 'edit' | 'publish' | 'manage'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
  UNIQUE(novel_id, user_id)
);
```

2. **后端实现**
   - 创建权限校验中间件
   - 创建 API 接口：`POST /api/novels/[id]/permissions`
   - 创建 API 接口：`GET /api/novels/[id]/permissions`

3. **前端实现**
   - 权限判断函数
   - 敏感操作二次确认对话框
   - 无权限时禁用按钮/隐藏功能

### 5.2 验收标准
- ✅ 无对应权限用户无法执行敏感操作
- ✅ 权限配置按小说维度生效
- ✅ 100%覆盖所有编辑场景

---

## 整体时间规划

| 阶段 | 功能 | 预计时间 | 优先级 |
|-----|------|---------|--------|
| 阶段一 | 自动保存功能 | 2天 | 最高 |
| 阶段二 | 版本历史管理 | 3天 | 高 |
| 阶段三 | 操作日志记录 | 2天 | 高 |
| 阶段四 | 性能优化 | 3天 | 中 |
| 阶段五 | 权限管控 | 3天 | 中 |
| 测试 | 全量回归测试 | 2天 | 高 |

**总计**：约15天

---

## 技术约束

1. **存储成本**：快照/版本数据采用增量存储
2. **数据一致性**：缓存策略需避免数据不一致
3. **最终一致性**：异步发布需保证数据最终一致性
4. **日志隔离**：操作日志独立存储，与业务数据隔离
5. **密钥轮换**：加密密钥定期轮换，且密钥存储与业务系统隔离
