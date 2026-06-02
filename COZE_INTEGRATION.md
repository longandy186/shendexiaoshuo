# Coze 内置集成调用指南

## 概述

通过 Coze 平台的内置集成调用大模型，而不是直接使用模型 ID。

## 配置步骤

### 1. 在 Coze 平台启用内置集成

1. 访问 https://code.coze.cn/w/7498544169900638247/integrations
2. 找到 LLM（大语言模型）集成
3. 启用需要的模型（豆包、千问、Kimi）
4. 记录集成 ID

### 2. 获取集成信息

在集成页面查找：
- 集成 ID
- 已启用的模型
- 每个模型的参数

### 3. 代码配置

需要修改 `client.stream()` 调用方式。

## 传统方式 vs 内置集成

**传统方式**：
```typescript
const stream = client.stream(messages, {
  model: 'doubao-seed-1-8-251228'
});
```

**内置集成方式**：
```typescript
const stream = client.stream(messages, {
  integration_id: 'your_integration_id'
});
```
