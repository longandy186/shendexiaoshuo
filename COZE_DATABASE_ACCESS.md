# Coze 平台数据库访问指南

## 🎯 如何访问数据库管理界面

### 方法1: 通过项目设置

1. **返回项目首页**
   - 点击左上角的「神的小说工坊」项目名称
   - 或点击面包屑导航

2. **进入项目设置**
   - 在项目首页，找到「设置」或「配置」按钮（不是编辑器设置）
   - 通常在页面右上角或左侧导航栏

3. **查找数据库选项**
   - 在设置页面，查找以下任一选项：
     - 📊 **数据库** (Database)
     - 💾 **数据存储** (Data Storage)
     - 🔗 **集成** (Integrations) - 如果使用第三方数据库
     - ⚙️ **环境变量** (Environment Variables) - 如果使用连接字符串

---

### 方法2: 通过 Supabase 平台（直接访问）

如果你的项目使用 Supabase 数据库，可以直接访问 Supabase 平台管理数据库。

#### 步骤1: 获取 Supabase 连接信息

**查找位置**:
1. 在 Coze 项目中，查看 `.env` 文件或环境变量
2. 查找 `DATABASE_URL` 或 `SUPABASE_URL` 等连接字符串
3. 提取 Supabase 项目 URL

**示例连接字符串格式**:
```
postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
```

#### 步骤2: 访问 Supabase 平台

1. 打开浏览器，访问: https://supabase.com
2. 使用你的 Supabase 账号登录
3. 进入你的项目

#### 步骤3: 打开 SQL 编辑器

1. 在 Supabase 项目左侧菜单，找到「SQL Editor」或「SQL编辑器」
2. 点击进入
3. 就可以执行 SQL 脚本了

---

### 方法3: 通过 Coze CLI（命令行）

如果你有命令行访问权限，可以使用以下方式：

#### 使用 psql（PostgreSQL 客户端）

```bash
# 从环境变量中获取数据库连接信息
export DATABASE_URL="你的数据库连接字符串"

# 连接到数据库
psql $DATABASE_URL
```

#### 使用 Supabase CLI（如果已安装）

```bash
# 安装 Supabase CLI（如果未安装）
npm install -g supabase

# 登录 Supabase
supabase login

# 链接到你的项目
supabase link --project-ref [project-id]

# 打开数据库管理界面
supabase db execute
```

---

## 📝 数据库迁移脚本（简化版）

如果找不到数据库管理界面，可以尝试以下方式执行迁移：

### 方法1: 通过 API 接口（如果有数据库管理API）

```bash
curl -X POST https://your-coze-platform.com/api/db/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_plan VARCHAR(32);"
  }'
```

### 方法2: 创建迁移脚本在应用启动时执行

在你的应用代码中添加数据库迁移逻辑，在应用启动时自动执行：

```typescript
// src/lib/db-migrate.ts
export async function runMigrations() {
  const client = getSupabaseClient();

  const migrations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_plan VARCHAR(32)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_models_limit INTEGER DEFAULT 0`,
    // ... 其他迁移语句
  ];

  for (const migration of migrations) {
    try {
      await client.rpc('exec_sql', { sql: migration });
      console.log('Migration executed:', migration);
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }
}
```

---

## ⚠️ 重要说明

### Coze 平台的数据库访问限制

某些 Coze 平台版本可能：
- ❌ 不提供直接的数据库管理界面
- ❌ 只能通过环境变量配置数据库连接
- ✅ 需要直接访问数据库提供商的管理界面

### 建议的解决方案

**如果 Coze 平台没有数据库管理界面**:

1. **直接访问 Supabase 平台**
   - 这是最直接、最可靠的方式
   - 提供完整的数据库管理功能

2. **创建专门的数据库管理工具**
   - 在你的应用中添加一个简单的 SQL 执行页面（仅管理员可用）
   - 通过这个页面执行迁移脚本

3. **联系 Coze 平台技术支持**
   - 询问如何访问数据库管理界面
   - 获取数据库连接信息的完整指南

---

## 🚀 下一步行动

### 立即执行

1. **尝试在 Coze 平台查找**
   - 查看项目设置的所有子页面
   - 寻找「数据库」、「数据存储」或「集成」选项

2. **检查环境变量**
   - 查看数据库连接字符串
   - 确定数据库类型和访问方式

3. **直接访问 Supabase（如果使用Supabase）**
   - 访问 https://supabase.com
   - 登录并进入你的项目
   - 使用 SQL 编辑器执行迁移

---

## 💡 快速验证数据库连接

### 测试方法1: 通过应用日志

在你的应用中添加测试代码，查看数据库连接是否正常：

```typescript
// src/app/api/test-db/route.ts
export async function GET() {
  const client = getSupabaseClient();

  try {
    const { data, error } = await client
      .from('users')
      .select('count')
      .limit(1);

    if (error) throw error;

    return Response.json({ success: true, count: data?.length });
  } catch (error) {
    return Response.json({ success: false, error: String(error) });
  }
}
```

访问 `/api/test-db` 查看结果。

### 测试方法2: 通过管理员接口

你的项目已经有 `/api/admin/stats` 接口，可以测试这个接口是否能正常返回数据：
```bash
curl https://shendexiaoshuo.coze.site/api/admin/stats
```

如果能返回数据，说明数据库连接正常。

---

## 📞 需要帮助？

如果以上方法都无法找到数据库管理界面：

1. **截图你的项目首页**
   - 让我看到完整的导航菜单
   - 我可以帮你找到正确的入口

2. **提供项目信息**
   - Coze 平台版本号
   - 使用的数据库名称（Supabase / PostgreSQL / 其他）

3. **检查环境变量**
   - 查看数据库连接字符串
   - 确定数据库提供商

---

## 🎯 最简单的解决方案

**如果你只想快速完成迁移，我推荐**:

1. 直接访问 Supabase 平台（https://supabase.com）
2. 登录你的 Supabase 账号
3. 找到你的项目
4. 使用 SQL 编辑器执行迁移脚本

这是最直接、最可靠的方式！
