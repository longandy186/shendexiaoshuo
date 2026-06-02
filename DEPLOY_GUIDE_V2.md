# 神的小说工坊 V2 - Coze 部署指南

> 版本：V2.0
> 日期：2026-06-02
> 部署平台：Coze

---

## 📋 部署流程总览

```
1. Supabase 数据库迁移（创建新表）
   ↓
2. 配置 Coze 环境变量（所有 API Keys）
   ↓
3. 本地代码提交并推送
   ↓
4. Coze 触发部署
   ↓
5. 功能测试验证
```

---

## 步骤 1：Supabase 数据库迁移

### 1.1 登录 Supabase

访问 https://supabase.com/dashboard
找到你的项目

### 1.2 执行迁移 SQL

1. 在 Supabase 控制台左侧菜单找到 **SQL Editor**
2. 点击 **New Query**
3. 复制以下 SQL 并执行：

```sql
-- =====================================================
-- 神的小说工坊 V2 - 完整数据库迁移
-- 执行日期：2026-06-02
-- =====================================================

-- 1. 情节设定表
CREATE TABLE IF NOT EXISTS plot_settings (
  id VARCHAR(36) DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id VARCHAR(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL,
  core_conflict TEXT DEFAULT '',
  main_plot TEXT DEFAULT '',
  sub_plots JSONB DEFAULT '[]'::jsonb NOT NULL,
  turning_points JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT plot_settings_novel_id_unique UNIQUE (novel_id)
);
CREATE INDEX IF NOT EXISTS idx_plot_settings_novel_id ON plot_settings(novel_id);

-- 2. 分卷表
CREATE TABLE IF NOT EXISTS volumes (
  id VARCHAR(36) DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id VARCHAR(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(256) NOT NULL,
  description TEXT DEFAULT '',
  main_conflict TEXT DEFAULT '',
  key_events JSONB DEFAULT '[]'::jsonb NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_volumes_novel_id ON volumes(novel_id);
CREATE INDEX IF NOT EXISTS idx_volumes_sort_order ON volumes(novel_id, sort_order);

-- 3. 章节大纲表
CREATE TABLE IF NOT EXISTS chapter_outlines (
  id VARCHAR(36) DEFAULT gen_random_uuid() PRIMARY KEY,
  volume_id VARCHAR(36) NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
  novel_id VARCHAR(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL,
  chapter_number INTEGER DEFAULT 0 NOT NULL,
  title VARCHAR(256) NOT NULL,
  summary TEXT DEFAULT '',
  key_scenes JSONB DEFAULT '[]'::jsonb NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT chapter_outlines_status_check CHECK (status IN ('draft', 'written', 'revised'))
);
CREATE INDEX IF NOT EXISTS idx_chapter_outlines_volume_id ON chapter_outlines(volume_id);
CREATE INDEX IF NOT EXISTS idx_chapter_outlines_novel_id ON chapter_outlines(novel_id);
CREATE INDEX IF NOT EXISTS idx_chapter_outlines_sort_order ON chapter_outlines(volume_id, sort_order);

-- 4. 角色版本表
CREATE TABLE IF NOT EXISTS character_versions (
  id VARCHAR(36) DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id VARCHAR(36) NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  novel_id VARCHAR(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  character_data JSONB NOT NULL,
  change_summary TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_character_versions_char_id ON character_versions(character_id, created_at DESC);

-- 5. 矛盾检测记录表
CREATE TABLE IF NOT EXISTS contradiction_checks (
  id VARCHAR(36) DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id VARCHAR(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_id VARCHAR(36) REFERENCES chapters(id) ON DELETE SET NULL,
  user_id VARCHAR(36) NOT NULL,
  summary TEXT DEFAULT '',
  contradictions JSONB DEFAULT '[]'::jsonb NOT NULL,
  status VARCHAR(20) DEFAULT 'completed' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contradiction_checks_novel_id ON contradiction_checks(novel_id);
CREATE INDEX IF NOT EXISTS idx_contradiction_checks_chapter_id ON contradiction_checks(chapter_id);

-- 6. 伏线追踪表
CREATE TABLE IF NOT EXISTS foreshadowing (
  id VARCHAR(36) DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id VARCHAR(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(128) NOT NULL,
  description TEXT DEFAULT '',
  planted_chapter VARCHAR(64) DEFAULT '',
  planned_resolution TEXT DEFAULT '',
  resolved_chapter VARCHAR(64) DEFAULT '',
  related_characters TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'planted' NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT foreshadowing_status_check CHECK (status IN ('planted', 'pushed', 'resolved', 'abandoned'))
);
CREATE INDEX IF NOT EXISTS idx_foreshadowing_novel_id ON foreshadowing(novel_id);
CREATE INDEX IF NOT EXISTS idx_foreshadowing_status ON foreshadowing(status);

-- 7. 推敲记录表
CREATE TABLE IF NOT EXISTS revision_records (
  id VARCHAR(36) DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id VARCHAR(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_id VARCHAR(36) REFERENCES chapters(id) ON DELETE SET NULL,
  user_id VARCHAR(36) NOT NULL,
  phase VARCHAR(1) NOT NULL,
  score INTEGER,
  issues JSONB DEFAULT '[]'::jsonb NOT NULL,
  summary TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT revision_records_phase_check CHECK (phase IN ('A', 'B', 'C'))
);
CREATE INDEX IF NOT EXISTS idx_revision_records_novel_id ON revision_records(novel_id);
CREATE INDEX IF NOT EXISTS idx_revision_records_chapter_id ON revision_records(chapter_id);

-- 8. 为 characters 表添加 details 列
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'details'
  ) THEN
    ALTER TABLE characters ADD COLUMN details JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ✅ 迁移完成
```

### 1.3 验证迁移成功

执行以下 SQL 检查表是否创建成功：

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'plot_settings', 'volumes', 'chapter_outlines',
  'character_versions', 'contradiction_checks',
  'foreshadowing', 'revision_records'
);
```

预期结果：7 行记录

---

## 步骤 2：配置 Coze 环境变量

### 2.1 登录 Coze 平台

访问 https://www.coze.com
找到项目 `shendexiaoshuo`
项目 ID：`7614824638762893331`

### 2.2 进入环境变量配置

1. 项目详情页 → **设置** → **环境变量**
2. 删除旧的环境变量（如果有）
3. 添加以下所有环境变量：

### 2.3 环境变量清单

| 变量名 | 值示例 | 说明 | 获取方式 |
|--------|--------|------|----------|
| `JWT_SECRET` | `your-random-secret-key` | JWT 签名密钥 | 使用 `openssl rand -base64 32` 生成 |
| `DATABASE_URL` | `https://xxx.supabase.co` | Supabase 项目地址 | Supabase → Settings → API |
| `DATABASE_KEY` | `eyJhbGci...` | Supabase Anon Key | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | 同上，客户端用 | 同上 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | 同上，客户端用 | 同上 |
| `DEEPSEEK_API_KEY` | `sk-xxxxxxxx` | DeepSeek API Key | https://platform.deepseek.com |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com/v1` | DeepSeek API 地址 | 固定值 |
| `DEEPSEEK_MODEL` | `deepseek-v4-flash` | 模型名称 | 固定值 |
| `EMAIL_HOST` | `smtp.163.com` | 163邮箱SMTP | 固定值 |
| `EMAIL_PORT` | `465` | SMTP端口 | 固定值 |
| `EMAIL_SECURE` | `true` | SSL启用 | 固定值 |
| `EMAIL_USER` | `your@163.com` | 发件邮箱 | 你的163邮箱 |
| `EMAIL_PASS` | `XXXXXXXX` | 邮箱授权码 | 163邮箱 → 设置 → POP3/SMTP → 授权码 |
| `EMAIL_FROM` | `your@163.com` | 发件地址 | 同 EMAIL_USER |
| `NEXT_PUBLIC_SUPER_ADMIN_EMAILS` | `admin@example.com` | 管理员邮箱 | 你的邮箱 |
| `NEXT_PUBLIC_SUPER_ADMIN_USERNAME` | `admin` | 管理员用户名 | 自定义 |
| `NODE_ENV` | `production` | 运行环境 | 固定值 |

### 2.4 保存配置

点击 **保存** 或 **应用**

---

## 步骤 3：代码提交并推送

### 3.1 进入项目目录

```bash
cd /path/to/shendexiaoshuo
```

### 3.2 添加 .env 文件（本地开发用）

创建 `.env` 文件：

```bash
JWT_SECRET=your-random-secret-key
DATABASE_URL=https://xxx.supabase.co
DATABASE_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DEEPSEEK_API_KEY=sk-your-deepseek-key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-v4-flash
EMAIL_HOST=smtp.163.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your@163.com
EMAIL_PASS=your-auth-code
EMAIL_FROM=your@163.com
NEXT_PUBLIC_SUPER_ADMIN_EMAILS=your@email.com
NEXT_PUBLIC_SUPER_ADMIN_USERNAME=admin
NODE_ENV=development
```

### 3.3 提交代码

```bash
git add .
git commit -m "feat: V2.0 - DeepSeek AI, plot settings, volumes, revision workflow, contradiction detection, foreshadowing tracking"
git push
```

---

## 步骤 4：Coze 触发部署

### 4.1 自动部署

代码推送后，Coze 会自动触发构建

### 4.2 手动部署

如果需要手动触发：
1. Coze 项目页面 → **部署**
2. 点击 **重新部署** 或 **部署**
3. 等待构建完成（通常 2-5 分钟）

### 4.3 查看部署日志

在 Coze 控制台查看构建日志，确认无错误

---

## 步骤 5：功能测试验证

### 5.1 基础功能测试

```bash
# 测试网站访问
curl -I https://shendexiaoshuo.coze.site/

# 测试登录
curl -s -X POST https://shendexiaoshuo.coze.site/api/auth/quick-login \
  -H "Content-Type: application/json" \
  -d '{"account": "admin"}'
```

### 5.2 新功能验证清单

访问 `https://shendexiaoshuo.coze.site` 并测试：

- [ ] **情节设定页面**：进入小说 → 点击"情节设定" → 填写核心冲突/主线/支线/转折点
- [ ] **分卷大纲页面**：进入小说 → 点击"分卷大纲" → 创建分卷 → 添加章节大纲
- [ ] **编辑器左侧栏**：切换到"分卷"Tab → 显示分卷和章节树
- [ ] **编辑器顶部按钮**：显示"情节设定""分卷大纲""推敲""矛盾检测""伏线"按钮
- [ ] **编辑器右侧面板**：有"写作""推敲""伏线""矛盾"四个Tab
- [ ] **角色36项模板**：进入角色管理 → 查看完整分类表单
- [ ] **DeepSeek AI生成**：尝试生成章节 → 查看是否正常流式输出
- [ ] **矛盾检测**：在矛盾Tab点击检测 → 查看是否有结果
- [ ] **伏线追踪**：在伏线Tab添加/修改伏线 → 查看状态切换

### 5.3 测试用户反馈

所有新功能测试后，在浏览器控制台（F12）查看是否有错误

---

## ❓ 常见问题

### Q1: 部署失败，提示 JWT_SECRET 未设置
**A**: 在 Coze 环境变量中添加 `JWT_SECRET`（使用 `openssl rand -base64 32` 生成）

### Q2: AI 生成提示 "API Key 未配置"
**A**: 检查 `DEEPSEEK_API_KEY` 是否正确配置，且 Key 有余额

### Q3: 页面加载空白
**A**: 检查浏览器控制台，可能是 Supabase URL/Key 配置错误

### Q4: 数据库表不存在
**A**: 确认已在 Supabase SQL Editor 执行完整迁移脚本

### Q5: 部署超时
**A**: Coze 部署有超时限制，尝试删除不必要的依赖或优化构建

---

## ✅ 部署完成确认

所有测试通过后，部署完成！

### V2.0 新增功能总览

| 功能 | 路径 |
|------|------|
| 情节设定 | `/novel/[id]/plot` |
| 分卷大纲 | `/novel/[id]/volumes` |
| 左侧分卷Tab | 编辑器左侧栏 |
| 顶部新按钮 | 编辑器顶部工具栏 |
| 右侧AI四Tab | 编辑器右侧面板 |
| 36项角色模板 | `/novel/[id]/characters` |
| 矛盾检测 | 编辑器 → 矛盾 Tab |
| 伏线追踪 | 编辑器 → 伏线 Tab |
| 推敲工作流 | 编辑器 → 推敲 Tab |

---

## 📞 技术支持

如遇问题，提供以下信息：
- 部署日志截图
- 浏览器控制台错误信息
- 网络请求（Network Tab）中的错误响应
