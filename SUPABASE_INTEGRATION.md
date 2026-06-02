# Supabase 云端数据库集成指南

## 📋 已完成的工作

### 1. 数据库表结构设计 ✅

已创建以下数据表：
- **users** - 用户表
- **novels** - 小说表
- **chapters** - 章节表
- **characters** - 角色表
- **world_settings** - 世界观设定表

所有表已同步到 Supabase 数据库。

### 2. Supabase 客户端配置 ✅

- 已安装 `@supabase/supabase-js` 依赖
- 已创建 `src/storage/database/supabase-client.ts` 客户端配置
- 客户端自动从环境变量读取配置

### 3. Supabase 存储层实现 ✅

已创建 `src/lib/supabase-storage.ts`，包含所有 CRUD 操作：
- 用户管理：`createOrGetUser()`
- 小说管理：`getAllNovels()`, `getNovelById()`, `createNovel()`, `updateNovel()`, `deleteNovel()`
- 章节管理：`getChaptersByNovelId()`, `createChapter()`, `updateChapter()`, `deleteChapter()`
- 角色管理：`getCharactersByNovelId()`, `createCharacter()`, `updateCharacter()`, `deleteCharacter()`
- 世界观管理：`getWorldSettingsByNovelId()`, `createWorldSetting()`, `updateWorldSetting()`, `deleteWorldSetting()`
- 数据迁移：`migrateLocalStorageToSupabase()`

### 4. 存储适配器 ✅

已创建 `src/lib/storage-adapter.ts`，支持自动切换：
- 使用 `src/lib/storage-config.ts` 配置
- 可以在 localStorage 和 Supabase 之间无缝切换

### 5. 认证系统升级 ✅

- `loginUser()` 函数已升级为 async
- 登录时自动同步用户到数据库
- 支持创建和获取用户

---

## 🚀 如何启用 Supabase

### 步骤 1: 修改配置

编辑 `src/lib/storage-config.ts`：

```typescript
export const STORAGE_MODE = {
  USE_SUPABASE: true, // 改为 true 启用 Supabase
};

export const USE_SUPABASE = STORAGE_MODE.USE_SUPABASE;
```

### 步骤 2: 修复类型错误（关键步骤）

由于 Supabase 操作是异步的，需要将所有存储操作改为 async/await。需要修改以下文件：

#### 修改示例：

**之前（localStorage 同步操作）：**
```typescript
const novels = getAllNovels();
const novel = getNovelById(id);
```

**之后（Supabase 异步操作）：**
```typescript
const novels = await getAllNovels();
const novel = await getNovelById(id);
```

#### 需要修改的文件清单：

1. **`src/app/novels/page.tsx`**
   - `getAllNovels()` → `await getAllNovels()`
   - 在 useEffect 或事件处理函数中使用

2. **`src/app/novel/new/page.tsx`**
   - `createNovel()` → `await createNovel()`

3. **`src/app/novel/[id]/page.tsx`**
   - `getNovelById()` → `await getNovelById()`
   - `addChapter()` → `await addChapter()`
   - `updateChapter()` → `await updateChapter()`
   - `deleteChapter()` → `await deleteChapter()`

4. **`src/app/novel/[id]/editor/page.tsx`**
   - `getNovelById()` → `await getNovelById()`
   - `updateChapter()` → `await updateChapter()`
   - `deleteChapter()` → `await deleteChapter()`

5. **`src/app/novel/[id]/characters/page.tsx`**
   - `getNovelById()` → `await getNovelById()`
   - `addCharacter()` → `await addCharacter()`
   - `updateCharacter()` → `await updateCharacter()`
   - `deleteCharacter()` → `await deleteCharacter()`

6. **`src/app/novel/[id]/world/page.tsx`**
   - `getNovelById()` → `await getNovelById()`
   - `addWorldSetting()` → `await addWorldSetting()`
   - `updateWorldSetting()` → `await updateWorldSetting()`
   - `deleteWorldSetting()` → `await deleteWorldSetting()`

7. **`src/app/api/v1/ai/generate/route.ts`**
   - `getNovelById()` → `await getNovelById()`

### 步骤 3: 函数签名调整

部分函数的签名需要调整：

#### `addChapter()` 函数

**之前：**
```typescript
addChapter(novelId, chapterData: { title, order? })
```

**之后（Supabase）：**
```typescript
addChapter(novelId, chapterData: { title, order? })
```

#### `addCharacter()` 和 `addWorldSetting()` 函数

**之前（localStorage）：**
```typescript
addCharacter(novelId, character: Character)
```

**之后（Supabase）：**
```typescript
addCharacter(novelId, character: Character)
```

---

## 📦 数据迁移

启用 Supabase 后，可以使用数据迁移功能将 localStorage 的数据迁移到数据库：

```typescript
import { migrateLocalStorageToSupabase } from '@/lib/supabase-storage';
import * as localStorageOps from '@/lib/storage';

// 获取 localStorage 中的所有小说
const localStorageNovels = localStorageOps.getAllNovels();

// 迁移到 Supabase
await migrateLocalStorageToSupabase(localStorageNovels);
```

---

## ✅ 验证步骤

1. **启用 Supabase**
   ```bash
   # 修改 src/lib/storage-config.ts 中的 USE_SUPABASE = true
   ```

2. **构建检查**
   ```bash
   pnpm run build
   ```

3. **测试登录**
   - 使用不同用户名登录
   - 验证用户是否创建到数据库

4. **测试数据同步**
   - 在一个域名创建小说
   - 在另一个域名查看是否能看到
   - 应该能看到相同的数据

---

## 🔍 注意事项

### 1. 异步操作

Supabase 所有操作都是异步的，必须使用 async/await：

```typescript
// ❌ 错误
const novel = getNovelById(id);

// ✅ 正确
const novel = await getNovelById(id);
```

### 2. 错误处理

Supabase 操作返回 `{ data, error }`，需要检查错误：

```typescript
const { data, error } = await client.from('novels').select('*');
if (error) {
  console.error('查询失败:', error);
  return [];
}
```

### 3. 性能考虑

- Supabase 查询比 localStorage 慢
- 考虑添加加载状态提示
- 可以使用 React Query 或 SWR 缓存数据

### 4. 回退方案

如果遇到问题，可以随时回退到 localStorage：

```typescript
// src/lib/storage-config.ts
export const STORAGE_MODE = {
  USE_SUPABASE: false, // 改为 false
};
```

---

## 📚 参考资料

- Supabase TypeScript SDK: https://supabase.com/docs/reference/javascript
- Drizzle Schema 指南: `/skills/public/prod/supabase/references/typescript/drizzle-schema-guide.md`
- 数据库操作指南: `/skills/public/prod/supabase/references/typescript/database.md`

---

## 🤝 后续优化

1. **添加 React Query**
   - 自动缓存和重新验证
   - 减少 API 调用次数

2. **添加乐观更新**
   - UI 立即响应
   - 后台同步数据

3. **添加离线支持**
   - Service Worker 缓存
   - 离线时使用 localStorage
   - 联网后同步

4. **添加数据备份**
   - 定期自动备份
   - 支持导出为 JSON

---

## 🎯 总结

Supabase 云端数据库集成的基础设施已全部完成：
- ✅ 数据库表结构已创建
- ✅ Supabase 客户端已配置
- ✅ 存储层已实现
- ✅ 存储适配器已创建
- ✅ 认证系统已升级
- ⏳ 等待将异步操作应用到所有页面

启用 Supabase 后，用户可以在不同域名之间同步数据，彻底解决数据隔离问题。
