# AI 模型配置说明

## 当前状态

### 已配置模型（全部可用 ✅）

| 前端选项 | SDK 模型 ID | 状态 | 说明 |
|---------|------------|------|------|
| doubao | doubao-seed-1-8-251228 | ✅ 已验证可用 | 豆包多模态 Agent 优化模型（默认） |
| qwen | glm-4-7-251222 | ✅ 已验证可用 | 智谱 GLM-4-7 通用模型（替代千问） |
| kimi | kimi-k2-5-260127 | ✅ 已验证可用 | Kimi 最智能模型（长上下文处理） |

### 配置方式

项目使用 **coze-coding-dev-sdk**（官方 LLM Skill）直接调用大模型，无需配置集成 ID。

配置文件位置：`src/app/api/v1/ai/generate/route.ts`

```typescript
const modelMap: Record<string, string> = {
  doubao: 'doubao-seed-1-8-251228',  // 豆包多模态 Agent 优化模型
  qwen: 'glm-4-7-251222',             // GLM-4-7 通用模型
  kimi: 'kimi-k2-5-260127'           // Kimi K2.5 最智能模型
};
```

## 官方可用模型列表

以下模型均来自 **coze-coding-dev-sdk** 官方文档（`/skills/public/prod/llm/typescript/README.md`）

### 豆包系列 (Doubao)

| 模型 ID | 名称 | 描述 | 适用场景 |
|---------|------|------|---------|
| doubao-seed-1-8-251228 | 豆包 Seed 1.8 | 多模态 Agent 优化模型（默认） | Agent 场景、多模态理解、工具使用 ✅ |
| doubao-seed-1-6-251015 | 豆包 Seed 1.6 | 平衡性能模型 | 通用对话 |
| doubao-seed-1-6-flash-250615 | 豆包 Flash | 快速响应模型 | 快速响应 |
| doubao-seed-1-6-thinking-250715 | 豆包 Thinking | 思维模型 | 复杂推理（需启用 thinking 模式） |
| doubao-seed-1-6-vision-250815 | 豆包 Vision | 视觉模型 | 图像/视频理解 |
| doubao-seed-1-6-lite-251015 | 豆包 Lite | 轻量模型 | 简单任务、成本优化 |
| doubao-seed-2-0-pro-260215 | 豆包 2.0 Pro | 旗舰模型 | 复杂推理、多步规划、长上下文 |
| doubao-seed-2-0-lite-260215 | 豆包 2.0 Lite | 平衡性能和成本 | 内容创作、数据分析、企业任务 |
| doubao-seed-2-0-mini-260215 | 豆包 2.0 Mini | 快速响应 | 低延迟、高并发、轻量任务 |

### DeepSeek 系列

| 模型 ID | 名称 | 描述 | 适用场景 |
|---------|------|------|---------|
| deepseek-v3-2-251201 | DeepSeek V3.2 | 高级推理模型 | 高级推理 |
| deepseek-r1-250528 | DeepSeek R1 | 研究分析模型 | 研究和分析 |

### GLM 系列（智谱）

| 模型 ID | 名称 | 描述 | 适用场景 |
|---------|------|------|---------|
| glm-4-7-251222 | GLM-4-7 | 通用模型 | 通用目的 ✅（作为千问替代） |

### Kimi 系列

| 模型 ID | 名称 | 描述 | 适用场景 | 限制 |
|---------|------|------|---------|------|
| kimi-k2-250905 | Kimi K2 | 长上下文处理模型 | 长上下文处理 | - |
| kimi-k2-5-260127 | Kimi K2.5 | Kimi 最智能模型 | Agent、代码、视觉、多模态任务 ⚠️ temperature 必须是 0.6 或 1.0 ✅ |

## 模型使用指南

### 小说创作

**推荐模型**：
- 豆包 Seed 1.8（默认）- 平衡性能，适合大多数创作场景
- 豆包 2.0 Pro - 复杂情节规划，长篇创作
- Kimi K2.5 - 超长上下文，适合保持设定一致性

**参数建议**：
- Temperature: 0.7-0.9（适度的创造力）
- Caching: enabled（启用缓存以降低成本）

### 快速续写

**推荐模型**：
- 豆包 Flash - 极速响应
- 豆包 2.0 Mini - 低延迟

**参数建议**：
- Temperature: 0.5-0.7（相对保守）

### 复杂推理

**推荐模型**：
- 豆包 Thinking - 深度推理（需启用 thinking 模式）
- DeepSeek V3.2 - 高级推理

**参数建议**：
- Thinking: enabled（仅豆包 Thinking 模型）
- Temperature: 0.3-0.5（确定性输出）

### 长文本处理

**推荐模型**：
- Kimi K2 - 长上下文处理
- Kimi K2.5 - 最智能长上下文模型

**参数建议**：
- Temperature: 0.6（Kimi K2.5 固定值）

## 特殊模型限制

### Kimi K2.5 模型

Kimi K2.5 模型有严格的参数限制：

**必须使用的参数**：
- `temperature`: 固定为 `0.6`（非思考模式）或 `1.0`（思考模式）
- `top_p`: 固定为 `0.95`
- `n`: 固定为 `1`
- `presence_penalty`: 固定为 `0.0`
- `frequency_penalty`: 固定为 `0.0`
- `max_tokens`: 默认 32k (32768)

**代码示例**：
```typescript
const llmConfig = {
  model: 'kimi-k2-5-260127',
  temperature: 0.6, // ✅ 正确
};

// ❌ 错误示例
const wrongConfig = {
  model: 'kimi-k2-5-260127',
  temperature: 0.8, // ❌ 会导致 400 错误
};
```

### 豆包 Thinking 模型

使用豆包 Thinking 模型时，**必须**启用 thinking 模式：

```typescript
const llmConfig = {
  model: 'doubao-seed-1-6-thinking-250715',
  thinking: 'enabled', // ✅ 必须
  temperature: 0.7
};
```

## 如何测试模型

### 方法 1：使用调试页面

访问 `http://localhost:5000/debug/models`，使用模型测试工具：

1. 从列表选择模型 ID，或手动输入
2. 点击"测试"按钮验证模型是否可用
3. 查看测试结果

### 方法 2：直接测试 API

```bash
# 测试豆包
curl -X POST http://localhost:5000/api/v1/ai/test-model \
  -H "Content-Type: application/json" \
  -d '{"modelId": "doubao-seed-1-8-251228"}'

# 测试 GLM-4-7（千问替代）
curl -X POST http://localhost:5000/api/v1/ai/test-model \
  -H "Content-Type: application/json" \
  -d '{"modelId": "glm-4-7-251222"}'

# 测试 Kimi K2.5
curl -X POST http://localhost:5000/api/v1/ai/test-model \
  -H "Content-Type: application/json" \
  -d '{"modelId": "kimi-k2-5-260127"}'
```

## 修改模型配置

### 步骤

1. 打开 `src/app/api/v1/ai/generate/route.ts`
2. 找到 `modelMap` 对象（约第 34 行）
3. 修改对应模型的 ID
4. 保存文件（会自动热更新）
5. 使用调试页面测试新配置

### 示例：切换到豆包 2.0 Pro

```typescript
// 修改前
const modelMap: Record<string, string> = {
  doubao: 'doubao-seed-1-8-251228',
  qwen: 'glm-4-7-251222',
  kimi: 'kimi-k2-5-260127'
};

// 修改后
const modelMap: Record<string, string> = {
  doubao: 'doubao-seed-2-0-pro-260215',  // 切换到 2.0 Pro
  qwen: 'glm-4-7-251222',
  kimi: 'kimi-k2-5-260127'
};
```

### 添加新模型

如果你想添加新的模型选项：

1. 在前端添加模型选择（编辑器页面的 AI 助手面板）
2. 在 `modelMap` 中添加映射
3. 为特殊模型添加参数处理（如 Kimi K2.5）

```typescript
// 示例：添加 DeepSeek 模型
const modelMap: Record<string, string> = {
  doubao: 'doubao-seed-1-8-251228',
  qwen: 'glm-4-7-251222',
  kimi: 'kimi-k2-5-260127',
  deepseek: 'deepseek-v3-2-251201'  // 新增
};

// 为 DeepSeek 添加特殊处理（如果有）
if (selectedModel === 'deepseek-v3-2-251201') {
  llmConfig.temperature = 0.5;  // DeepSeek 更适合低温度
}
```

## 常见错误处理

### 1. "invalid temperature: only X is allowed for this model"

**原因**：Kimi K2.5 等模型有固定的 temperature 要求

**解决方案**：
- Kimi K2.5: 使用 `temperature: 0.6`
- 豆包 Thinking: 启用 `thinking: 'enabled'`

### 2. "model not found"

**原因**：模型 ID 不正确

**解决方案**：
- 使用调试页面测试不同的模型 ID
- 参考 [官方模型列表](#官方可用模型列表)

### 3. "balance not enough"

**原因**：账户余额不足

**解决方案**：
- 检查 Coze 平台账户余额
- 充值后重试

### 4. "rate limit exceeded"

**原因**：调用频率超限

**解决方案**：
- 等待一段时间后重试
- 减少调用频率

### 5. 流式输出中断

**原因**：网络问题或超时

**解决方案**：
- 检查网络连接
- 查看浏览器控制台和服务器日志
- 重试生成

## 技术细节

### SDK 配置

项目使用 `coze-coding-dev-sdk`，已自动配置：

```typescript
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const config = new Config();
const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
const client = new LLMClient(config, customHeaders);
```

### 流式响应实现

使用 Server-Sent Events (SSE) 实现流式输出：

```typescript
const readableStream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder();

    try {
      const stream = client.stream(messages, llmConfig);

      for await (const chunk of stream) {
        if (chunk.content) {
          const text = chunk.content.toString();
          const data = `data: ${JSON.stringify({ content: text })}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    } catch (error) {
      controller.error(error);
    }
  }
});
```

### 温度控制

Temperature 参数控制输出的随机性：

| Temperature | 输出特性 | 适用场景 |
|-------------|---------|---------|
| 0.0-0.3 | 确定性、一致 | 代码生成、数据分析 |
| 0.4-0.6 | 相对保守 | 事实性回答、技术文档 |
| 0.7-0.9 | 平衡创造力 | 通用对话、小说创作 ✅ |
| 1.0-1.5 | 高创造力 | 创意写作、头脑风暴 |
| 1.6-2.0 | 超高随机性 | 实验性创作 |

## 调试工具

### 日志位置

- 应用日志：`/app/work/logs/bypass/app.log`
- 控制台日志：`/app/work/logs/bypass/console.log`

### 查看日志

```bash
# 查看最新日志
tail -n 50 /app/work/logs/bypass/app.log

# 搜索错误
grep -iE "error|exception" /app/work/logs/bypass/app.log

# 查看 AI 生成相关日志
grep "AI Generate" /app/work/logs/bypass/app.log

# 查看模型调用
grep "使用 coze-coding-dev-sdk 调用模型" /app/work/logs/bypass/app.log
```

### 测试工具

- **调试页面**: `http://localhost:5000/debug/models`
- **模型测试接口**: `/api/v1/ai/test-model`
- **生成接口**: `/api/v1/ai/generate`

## 最佳实践

1. **默认使用豆包 Seed 1.8**：平衡性能和成本，适合大多数场景
2. **启用缓存**：多轮对话时启用 `caching: 'enabled'` 降低成本
3. **合理设置温度**：小说创作用 0.7-0.9，代码生成用 0.2-0.5
4. **遵守模型限制**：Kimi K2.5 必须使用指定参数
5. **监控日志**：及时查看错误日志，快速定位问题
6. **测试验证**：切换模型前先用测试接口验证可用性

## 相关资源

- **LLM Skill 文档**: `/skills/public/prod/llm/typescript/README.md`
- **SDK 源码**: `node_modules/coze-coding-dev-sdk`
- **官方示例**: 查看 Skill 文档中的完整示例

## 更新日志

- **2026-03-12**: 使用 coze-coding-dev-sdk 官方模型列表，全部模型配置完成并测试通过
- **2026-03-12**: 添加 Kimi K2.5 特殊参数处理
- **2026-03-12**: 使用 GLM-4-7 替代千问模型
