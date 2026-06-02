# 邮箱验证码登录系统 - 部署指南

## 概述

本系统实现了完整的邮箱验证码登录/注册功能，包含用户管理、权限控制、超级管理员等功能。

## 功能特性

### 用户功能
- ✅ 邮箱验证码注册
- ✅ 邮箱验证码登录
- ✅ 用户信息管理
- ✅ Token认证（JWT + HttpOnly Cookie）
- ✅ 登出功能

### 管理员功能
- ✅ 用户列表查看（支持搜索、筛选、分页）
- ✅ 用户详情查看
- ✅ 用户状态管理（正常/暂停/封禁）
- ✅ 用户删除
- ✅ 统计数据仪表盘
- ✅ 超级管理员（longandy@163.com）不可删除/修改

### 安全特性
- ✅ JWT Token认证
- ✅ HttpOnly Cookie
- ✅ 权限控制（RBAC）
- ✅ 数据库隔离（用户只能访问自己的数据）
- ✅ 验证码有效期限制（5分钟）
- ✅ 验证码使用后立即失效

## 数据库表结构

### users 表
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(64) UNIQUE,
  role VARCHAR(32) DEFAULT 'user' NOT NULL,
  status VARCHAR(32) DEFAULT 'active' NOT NULL,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_role_idx ON users(role);
CREATE INDEX users_status_idx ON users(status);
CREATE UNIQUE INDEX users_username_unique ON users(username);
CREATE UNIQUE INDEX users_email_unique ON users(email);
```

### email_verifications 表
```sql
CREATE TABLE email_verifications (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  type VARCHAR(32) DEFAULT 'register' NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX email_verifications_email_idx ON email_verifications(email);
CREATE INDEX email_verifications_code_idx ON email_verifications(code);
CREATE INDEX email_verifications_expires_at_idx ON email_verifications(expires_at);
CREATE INDEX email_verifications_type_idx ON email_verifications(type);
```

## 配置说明

### 1. 环境变量配置

复制 `.env.example` 为 `.env`，并修改以下配置：

```env
# JWT 密钥（生产环境请更改为随机字符串）
JWT_SECRET=your-secret-key-change-in-production

# 邮箱服务配置（以163邮箱为例）
EMAIL_HOST=smtp.163.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your_email@163.com
EMAIL_PASS=your_email_password
EMAIL_FROM=your_email@163.com

# 其他配置
NODE_ENV=development
```

### 2. 邮箱服务配置说明

#### 163邮箱配置
1. 登录163邮箱网页版
2. 设置 → POP3/SMTP/IMAP
3. 开启"POP3/SMTP服务"
4. 获取授权密码（不是邮箱登录密码！）
5. 配置：
   ```
   EMAIL_HOST=smtp.163.com
   EMAIL_PORT=465
   EMAIL_SECURE=true
   EMAIL_USER=your_email@163.com
   EMAIL_PASS=授权密码
   EMAIL_FROM=your_email@163.com
   ```

#### QQ邮箱配置
1. 登录QQ邮箱网页版
2. 设置 → 账户
3. 开启"POP3/SMTP服务"
4. 生成授权码
5. 配置：
   ```
   EMAIL_HOST=smtp.qq.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your_email@qq.com
   EMAIL_PASS=授权码
   EMAIL_FROM=your_email@qq.com
   ```

#### Gmail配置（国际）
1. 开启两步验证
2. 生成应用专用密码
3. 配置：
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=465
   EMAIL_SECURE=true
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=应用专用密码
   EMAIL_FROM=your_email@gmail.com
   ```

## API接口文档

### 认证相关

#### 1. 发送验证码
```
POST /api/auth/send-code
```

请求体：
```json
{
  "email": "user@example.com",
  "type": "register"  // 或 "login"
}
```

响应：
```json
{
  "code": 200,
  "msg": "验证码已发送至您的邮箱，5分钟内有效",
  "data": {
    "email": "user@example.com",
    "type": "register"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 2. 注册
```
POST /api/auth/register
```

请求体：
```json
{
  "email": "user@example.com",
  "code": "123456",
  "username": "username"
}
```

响应：
```json
{
  "code": 200,
  "msg": "注册成功",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "role": "user"
    },
    "token": "jwt_token"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3. 登录
```
POST /api/auth/login
```

请求体：
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

响应：
```json
{
  "code": 200,
  "msg": "登录成功",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "role": "user"
    },
    "token": "jwt_token"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 4. 获取当前用户信息
```
GET /api/auth/me
```

响应：
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "role": "user",
      "status": "active",
      "lastLoginAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 5. 登出
```
POST /api/auth/logout
```

响应：
```json
{
  "code": 200,
  "msg": "登出成功",
  "data": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 管理员相关

#### 1. 获取用户列表
```
GET /api/admin/users?page=1&pageSize=20&search=&status=&role=
```

响应：
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "users": [...],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 2. 获取用户详情
```
GET /api/admin/users/{id}
```

#### 3. 更新用户状态
```
PUT /api/admin/users/{id}
```

请求体：
```json
{
  "status": "suspended",
  "role": "user",
  "username": "new_username"
}
```

#### 4. 删除用户
```
DELETE /api/admin/users/{id}
```

#### 5. 获取统计数据
```
GET /api/admin/stats
```

响应：
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "stats": {
      "users": {
        "total": 100,
        "active": 90,
        "suspended": 5,
        "banned": 5,
        "todayNew": 2
      },
      "novels": {
        "total": 500,
        "published": 200
      },
      "trends": {
        "last7Days": [...]
      }
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 超级管理员

系统内置超级管理员账号：
- **邮箱**: `longandy@163.com`
- **权限**:
  - 查看所有用户数据
  - 修改任何用户状态（除自己）
  - 删除任何用户（除自己）
  - 访问管理员控制台
  - 查看统计数据

**注意**: 超级管理员账号无法被删除或修改状态。

## 权限说明

### 角色类型
- `user`: 普通用户
- `admin`: 管理员

### 状态类型
- `active`: 正常
- `suspended`: 暂停登录
- `banned`: 永久封禁
- `deleted`: 已删除

### 权限矩阵

| 操作 | user | admin |
|------|------|-------|
| 登录/注册 | ✅ | ✅ |
| 创建小说 | ✅ | ✅ |
| 查看自己的数据 | ✅ | ✅ |
| 查看所有用户数据 | ❌ | ✅ |
| 修改用户状态 | ❌ | ✅ |
| 删除用户 | ❌ | ✅ |
| 查看统计数据 | ❌ | ✅ |

## 使用流程

### 用户注册流程
1. 访问 `/login`
2. 点击"注册"标签
3. 输入邮箱，点击发送验证码
4. 输入用户名和验证码
5. 点击注册
6. 自动登录并跳转到首页

### 用户登录流程
1. 访问 `/login`
2. 点击"登录"标签
3. 输入邮箱，点击发送验证码
4. 输入验证码
5. 点击登录
6. 跳转到首页

### 管理员操作流程
1. 使用 `longandy@163.com` 注册
2. 登录后，导航栏显示管理员图标（盾牌）
3. 点击管理员图标进入 `/admin`
4. 在仪表盘查看统计数据
5. 点击"用户管理"进入 `/admin/users`
6. 管理用户（搜索、筛选、修改状态、删除）

## 安全注意事项

1. **JWT密钥**: 生产环境必须使用随机字符串作为JWT_SECRET
2. **邮箱密码**: 不要使用邮箱登录密码，请使用授权密码
3. **HTTPS**: 生产环境必须使用HTTPS
4. **验证码**: 验证码有效期为5分钟，使用后立即失效
5. **权限控制**: 所有API都有权限检查，防止越权访问
6. **数据隔离**: 普通用户只能访问自己的数据
7. **Cookie安全**: 使用HttpOnly Cookie，防止XSS攻击

## 故障排查

### 问题1: 邮件发送失败
- 检查邮箱配置是否正确
- 确认是否使用授权密码（非登录密码）
- 检查SMTP端口是否开放
- 查看服务器日志

### 问题2: 登录后立即退出
- 检查JWT_SECRET配置
- 确认Cookie是否正常设置
- 检查Token是否过期

### 问题3: 验证码无效
- 检查验证码是否过期（5分钟有效期）
- 确认验证码类型是否正确（register/login）
- 检查验证码是否已被使用

### 问题4: 管理员无法访问
- 确认邮箱是否为 `longandy@163.com`
- 检查用户role字段是否为admin
- 确认用户状态是否为active

## 前端页面

- `/login` - 登录/注册页面
- `/admin` - 管理员仪表盘
- `/admin/users` - 用户管理页面

## 文件结构

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── send-code/route.ts      # 发送验证码
│   │   │   ├── register/route.ts       # 注册
│   │   │   ├── login/route.ts          # 登录
│   │   │   ├── logout/route.ts         # 登出
│   │   │   └── me/route.ts             # 获取当前用户
│   │   └── admin/
│   │       ├── stats/route.ts          # 统计数据
│   │       └── users/
│   │           ├── route.ts            # 用户列表
│   │           └── [id]/route.ts       # 用户详情/操作
│   ├── login/
│   │   └── page.tsx                    # 登录/注册页面
│   └── admin/
│       ├── page.tsx                    # 管理员仪表盘
│       └── users/
│           └── page.tsx                # 用户管理页面
├── services/
│   └── emailService.ts                 # 邮件服务
├── utils/
│   ├── jwt.ts                          # JWT工具
│   ├── codeGenerator.ts                # 验证码生成
│   └── auth.ts                         # 权限控制
└── lib/
    └── auth.ts                         # 前端认证工具
```
