# 数据库连接配置

## 🎯 核心原则

**本项目所有持久化数据必须统一使用 DATABASE_URL 和 DATABASE_KEY 环境变量连接到指定的 Supabase 数据库。**

- ✅ **用户数据**：存储在 Supabase `users` 表
- ✅ **小说数据**：存储在 Supabase `novels`、`chapters`、`characters`、`world_settings` 表
- ✅ **订单数据**：存储在 Supabase `orders` 表
- ✅ **认证数据**：存储在 Supabase `email_verifications` 表
- ❌ **禁止**：使用 localStorage、IndexedDB、sessionStorage 存储任何业务数据
- ❌ **禁止**：使用其他环境变量（如 COZE_SUPABASE_URL、PGDATABASE_URL）
- ❌ **禁止**：根据环境切换数据库（本地和生产必须使用同一个数据库）

## 📊 数据库连接信息

### 生产数据库配置

```env
DATABASE_URL=https://br-super-goat-910d7876.supabase2.aidap-global.cn-beijing.volces.com
DATABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjMzNTM1NzcyNzcsInJvbGUiOiJhbm9uIn0.DaPjtv8hH_5BZAo7usUYbg4NZ5xjbnJWZstkpd3qu_M
```

## 🔧 环境变量配置

### 本地开发环境

在项目根目录的 `.env` 文件中添加：

```env
DATABASE_URL=https://br-super-goat-910d7876.supabase2.aidap-global.cn-beijing.volces.com
DATABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjMzNTM1NzcyNzcsInJvbGUiOiJhbm9uIn0.DaPjtv8hH_5BZAo7usUYbg4NZ5xjbnJWZstkpd3qu_M
```

### 生产环境（Coze 平台）

在 Coze 平台项目的「环境变量」中添加：

```
DATABASE_URL=https://br-super-goat-910d7876.supabase2.aidap-global.cn-beijing.volces.com
DATABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjMzNTM1NzcyNzcsInJvbGUiOiJhbm9uIn0.DaPjtv8hH_5BZAo7usUYbg4NZ5xjbnJWZstkpd3qu_M
```

## ⚠️ 重要说明

### 1. 严格使用 DATABASE_URL 和 DATABASE_KEY

- **只支持** `DATABASE_URL` 和 `DATABASE_KEY` 两个环境变量
- **不支持**其他环境变量（如 COZE_SUPABASE_URL、PGDATABASE_URL）
- 如果未配置这两个环境变量，应用会抛出错误并拒绝启动

### 2. 本地和生产环境使用同一个数据库

- 本地开发环境和生产环境必须配置相同的数据库连接信息
- 禁止根据 `NODE_ENV` 或其他环境变量切换数据库
- 确保数据一致性：开发环境的数据和生产环境完全一致

### 3. 数据库连接方式

所有数据库操作都通过 `getSupabaseClient()` 函数获取客户端实例：

```typescript
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 无认证（公开操作）
const client = getSupabaseClient();

// 带认证（需要用户权限）
const clientWithAuth = getSupabaseClient(token);
```

## 📦 数据表结构

### 核心业务表

| 表名 | 用途 | 说明 |
|------|------|------|
| `users` | 用户信息 | 存储用户账号、角色、会员信息 |
| `novels` | 小说信息 | 存储小说标题、描述、状态 |
| `chapters` | 章节内容 | 存储章节标题、内容、顺序 |
| `characters` | 角色设定 | 存储角色姓名、外貌、性格等 |
| `world_settings` | 世界观设定 | 存储世界观背景、设定描述 |
| `orders` | 订单信息 | 存储会员购买订单 |
| `email_verifications` | 邮箱验证码 | 存储注册登录验证码 |

## 🚀 使用方式

### 获取数据库客户端

```typescript
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 无认证（公开操作）
const client = getSupabaseClient();

// 带认证（需要用户权限）
const clientWithAuth = getSupabaseClient(token);
```

### 查询数据

```typescript
// 查询用户
const { data: user, error } = await client
  .from('users')
  .select('*')
  .eq('email', 'user@example.com')
  .single();

// 查询小说列表
const { data: novels } = await client
  .from('novels')
  .select('*')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false });
```

### 插入数据

```typescript
const { data, error } = await client
  .from('novels')
  .insert({
    id: novelId,
    user_id: userId,
    title: '我的小说',
    description: '小说描述',
    genre: '玄幻',
    status: 'draft',
  })
  .select()
  .single();
```

### 更新数据

```typescript
const { data, error } = await client
  .from('novels')
  .update({ status: 'ongoing' })
  .eq('id', novelId)
  .select()
  .single();
```

### 删除数据

```typescript
const { error } = await client
  .from('novels')
  .delete()
  .eq('id', novelId);
```

## ✅ 数据库验证

### 验证连接和表结构

```typescript
import { verifyDatabase, verifyAdminUser, getDatabaseStats, verifyDatabaseConfig } from '@/lib/database-verify';

// 验证数据库配置
const config = await verifyDatabaseConfig();
console.log('数据库配置状态:', config.configured);

// 验证数据库连接和表结构
const result = await verifyDatabase();
console.log('数据库连接状态:', result.success);
console.log('所有表是否存在:', result.tablesExist);

// 验证管理员用户
const admin = await verifyAdminUser();
console.log('管理员是否存在:', admin?.exists);

// 获取数据库统计信息
const stats = await getDatabaseStats();
console.log('用户数量:', stats?.users);
console.log('小说数量:', stats?.novels);
```

### 调试 API

项目提供了以下调试 API 用于验证数据库连接：

1. **获取数据库连接信息**
   ```bash
   curl http://localhost:5000/api/debug/get-database-info
   ```

2. **测试数据库连接**
   ```bash
   curl -X POST http://localhost:5000/api/debug/test-connection
   ```

## 🔍 常见问题

### Q1: 为什么不能使用 COZE_SUPABASE_URL 等其他环境变量？

**A**: 为了确保：
1. 数据库连接配置的一致性和可预测性
2. 避免配置错误导致连接到错误的数据库
3. 简化配置管理，减少混淆
4. 确保本地和生产环境使用同一个数据库

### Q2: 如何确保本地和生产环境使用同一个数据库？

**A**: 按照以下步骤：

1. **本地开发环境**
   在 `.env` 文件中配置：
   ```env
   DATABASE_URL=https://br-super-goat-910d7876.supabase2.aidap-global.cn-beijing.volces.com
   DATABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **生产环境（Coze 平台）**
   在「环境变量」中配置相同的内容

3. **验证连接**
   ```bash
   curl http://localhost:5000/api/debug/get-database-info
   ```

### Q3: 如何验证当前连接的是哪个数据库？

**A**: 使用调试 API：

```bash
curl http://localhost:5000/api/debug/get-database-info
```

查看返回的 `data.databaseConfig.fullUrl` 确认是否是目标数据库。

### Q4: 数据库连接失败怎么办？

**A**: 检查以下几点：

1. **确认环境变量配置正确**
   - 检查 `.env` 文件（本地）或 Coze 平台「环境变量」（生产）
   - 确认 `DATABASE_URL` 和 `DATABASE_KEY` 都已设置

2. **确认网络连接正常**
   - 检查是否能访问 Supabase 服务

3. **查看错误日志**
   ```bash
   tail -n 50 /app/work/logs/bypass/app.log
   ```

### Q5: 为什么应用启动时报错 "DATABASE_URL environment variable is not set"？

**A**: 这表示：
- 本地开发环境：需要在 `.env` 文件中配置 `DATABASE_URL` 和 `DATABASE_KEY`
- 生产环境：需要在 Coze 平台「环境变量」中配置

## 📝 开发规范

### 1. 统一使用 `getSupabaseClient()`

```typescript
// ✅ 正确
import { getSupabaseClient } from '@/storage/database/supabase-client';
const client = getSupabaseClient();

// ❌ 错误：不要直接创建客户端
import { createClient } from '@supabase/supabase-js';
const client = createClient(url, key);
```

### 2. 正确处理错误

```typescript
// ✅ 正确
const { data, error } = await client.from('users').select('*');
if (error) {
  console.error('查询失败:', error);
  return errorResponse('查询失败', 500);
}

// ❌ 错误：忽略错误处理
const { data } = await client.from('users').select('*');
```

### 3. 使用 snake_case 字段名

```typescript
// ✅ 正确
const { data } = await client
  .from('users')
  .select('id, email, user_name, created_at')
  .eq('is_premium', true);

// ❌ 错误：使用 camelCase
const { data } = await client
  .from('users')
  .select('id, email, userName, createdAt')
  .eq('isPremium', true);
```

### 4. 事务和批量操作

```typescript
// ✅ 推荐：使用批量插入
const { data } = await client
  .from('characters')
  .insert([
    { name: '张三', novel_id: novelId },
    { name: '李四', novel_id: novelId },
  ]);

// ❌ 避免：多次单独插入
for (const char of characters) {
  await client.from('characters').insert(char);
}
```

## 🎯 检查清单

在提交代码前，确保：

- [ ] 所有数据库操作都使用 `getSupabaseClient()`
- [ ] 没有使用 localStorage、IndexedDB 等临时存储
- [ ] 字段名使用 snake_case
- [ ] 正确处理了 `{ data, error }` 返回值
- [ ] 本地环境已配置 `DATABASE_URL` 和 `DATABASE_KEY`
- [ ] 生产环境已配置 `DATABASE_URL` 和 `DATABASE_KEY`
- [ ] 通过调试 API 验证了数据库连接
- [ ] 数据库表结构正确（使用 `verifyDatabase()` 验证）
- [ ] 本地和生产环境连接到同一个数据库

## 📚 相关文档

- [Supabase 官方文档](https://supabase.com/docs)
- [数据库验证工具](../lib/database-verify.ts)
- [数据库 Schema 定义](./shared/schema.ts)
