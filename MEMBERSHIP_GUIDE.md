# 付费会员系统 - 使用指南

## 概述

本系统实现了完整的付费会员功能和推荐奖励系统，包括会员购买、支付集成（微信/支付宝）、推荐链接生成等功能。

## 功能特性

### 会员功能
- ✅ 新用户7天免费试用
- ✅ 多种会员套餐（月/季/半年/年）
- ✅ 微信/支付宝支付支持
- ✅ 自动计算会员到期时间
- ✅ 支持会员时间叠加

### 推荐系统
- ✅ 每个用户自动生成唯一推荐码
- ✅ 通过推荐链接注册，双方各获7天会员
- ✅ 推荐奖励可无限叠加
- ✅ 推荐次数统计显示

### 支付功能
- ✅ 订单管理
- ✅ 支付状态查询
- ✅ 模拟支付（测试用）
- ✅ 支持微信和支付宝

## 会员套餐

| 套餐 | 时长 | 价格 | 原价 | 说明 |
|------|------|------|------|------|
| 月度会员 | 30天 | ¥19.9 | ¥29.9 | 适合短期体验 |
| 季度会员 | 90天 | ¥49.9 | ¥59.9 | 最受欢迎 |
| 半年会员 | 180天 | ¥89.9 | ¥119.9 | 超值优惠 |
| 年度会员 | 365天 | ¥159.9 | ¥239.9 | 最划算 |

## 数据库表结构

### users 表（新增字段）

```sql
-- 会员相关
is_premium BOOLEAN DEFAULT FALSE NOT NULL,           -- 是否为会员
premium_expires_at TIMESTAMP WITH TIME ZONE,          -- 会员到期时间

-- 推荐相关
referral_code VARCHAR(16) UNIQUE,                     -- 推荐码
referred_by VARCHAR(36),                              -- 被谁推荐的（推荐人ID）
referral_rewards INTEGER DEFAULT 0 NOT NULL,          -- 推荐奖励天数
```

### orders 表（新建）

```sql
CREATE TABLE orders (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(32) UNIQUE NOT NULL,               -- 订单号
  user_id VARCHAR(36) NOT NULL,                       -- 用户ID
  amount DECIMAL(10,2) NOT NULL,                      -- 金额
  duration INTEGER NOT NULL,                          -- 会员时长（天）
  payment_method VARCHAR(32) NOT NULL,                -- 支付方式（wechat/alipay）
  status VARCHAR(32) DEFAULT 'pending' NOT NULL,       -- 订单状态
  transaction_id VARCHAR(128),                         -- 交易号
  paid_at TIMESTAMP WITH TIME ZONE,                   -- 支付时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

订单状态：
- `pending`: 待支付
- `paid`: 已支付
- `failed`: 支付失败
- `cancelled`: 已取消

## API接口文档

### 1. 获取会员信息
```
GET /api/membership/order
```

响应：
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "plans": [...],
    "userMembership": {
      "isPremium": true,
      "premiumExpiresAt": "2024-01-08T00:00:00.000Z",
      "referralCode": "ABCD1234",
      "referralRewards": 14
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. 创建订单
```
POST /api/membership/order
```

请求体：
```json
{
  "planId": "month",
  "paymentMethod": "wechat"
}
```

响应：
```json
{
  "code": 200,
  "msg": "订单创建成功",
  "data": {
    "order": {
      "id": "uuid",
      "orderNo": "NO20240101120000XXXX",
      "amount": 19.9,
      "duration": 30,
      "paymentMethod": "wechat",
      "status": "pending"
    },
    "payment": {
      "paymentUrl": "/payment/mock?orderNo=...",
      "qrCode": "mock_qr_code_..."
    },
    "plan": {...}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. 查询订单状态
```
GET /api/membership/orders/{orderNo}
```

### 4. 模拟支付成功（测试用）
```
POST /api/membership/orders/{orderNo}
```

## 使用流程

### 1. 用户注册（推荐流程）

1. 用户A通过推荐链接访问：`/register?ref=ABCD1234`
2. 用户A填写注册信息，推荐码自动填入
3. 用户A注册成功，自动获得7天免费试用
4. 用户B（推荐人）自动获得7天会员奖励
5. 双方推荐奖励天数叠加

### 2. 用户购买会员

1. 访问 `/membership` 会员中心
2. 查看当前会员状态和剩余天数
3. 选择会员套餐（月/季/半年/年）
4. 选择支付方式（微信/支付宝）
5. 点击"立即开通"创建订单
6. 完成支付
7. 系统自动更新会员到期时间

### 3. 推荐好友

1. 访问 `/membership` 会员中心
2. 复制推荐链接
3. 分享给好友
4. 好友通过链接注册，双方各获7天会员

## 推荐规则

1. **推荐码格式**: 8位大写字母或数字
2. **推荐奖励**: 每推荐一个用户，双方各获7天会员
3. **奖励叠加**: 推荐奖励可以无限叠加
4. **自动发放**: 推荐成功后奖励立即生效
5. **推荐统计**: 显示累计推荐奖励天数

## 会员权限检查

### 后端中间件

```typescript
import { requireMembership, getUserMembership } from '@/utils/membership';

// 检查用户是否有会员权限
const hasMembership = await requireMembership(userId);
if (!hasMembership) {
  return errorResponse('需要会员权限', 403);
}

// 获取会员详细信息
const membership = await getUserMembership(userId);
console.log(membership.daysRemaining); // 剩余天数
```

### 前端使用

```typescript
import { getUserMembership } from '@/lib/auth';

const membership = await getUserMembership(userId);
if (membership.isPremium) {
  // 用户有会员权限
  console.log(`剩余 ${membership.daysRemaining} 天`);
} else {
  // 用户无会员权限
  router.push('/membership');
}
```

## 支付集成说明

当前系统使用**模拟支付**，实际生产环境需要对接真实的微信/支付宝支付API。

### 微信支付集成步骤

1. 注册微信商户号
2. 获取商户ID和API密钥
3. 配置支付回调地址
4. 实现以下接口：
   - 统一下单
   - 支付结果通知
   - 订单查询
   - 退款接口

### 支付宝集成步骤

1. 注册支付宝商户号
2. 获取应用ID和私钥
3. 配置支付回调地址
4. 实现以下接口：
   - 统一下单
   - 支付结果通知
   - 订单查询
   - 退款接口

### 模拟支付说明

当前系统的模拟支付流程：
1. 创建订单后，延迟2秒自动模拟支付成功
2. 调用 `POST /api/membership/orders/{orderNo}` 模拟支付
3. 系统自动更新订单状态和用户会员信息

## 配置说明

会员配置位于 `src/config/payment.ts`：

```typescript
export const PAYMENT_CONFIG = {
  // 会员价格配置
  MEMBERSHIP_PRICES: {
    MONTH: 19.9,
    QUARTER: 49.9,
    HALF_YEAR: 89.9,
    YEAR: 159.9,
  },

  // 推荐奖励天数
  REFERRAL_REWARD_DAYS: 7,
};
```

修改价格或奖励天数：
1. 编辑 `src/config/payment.ts` 文件
2. 修改 `MEMBERSHIP_PLANS` 数组中的价格
3. 修改 `PAYMENT_CONFIG` 中的配置
4. 重启服务生效

## 文件结构

```
src/
├── config/
│   └── payment.ts                    # 支付配置
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── register/
│   │   │       └── route.ts          # 注册（支持推荐码）
│   │   └── membership/
│   │       ├── order/
│   │       │   └── route.ts          # 获取套餐、创建订单
│   │       └── orders/
│   │           └── [orderNo]/
│   │               └── route.ts      # 查询订单、模拟支付
│   ├── membership/
│   │   └── page.tsx                  # 会员中心页面
│   └── login/
│       └── page.tsx                  # 登录/注册（支持推荐码）
├── services/
│   └── paymentService.ts             # 支付服务
├── utils/
│   ├── membership.ts                 # 会员工具
│   ├── referral.ts                   # 推荐工具
│   └── order.ts                      # 订单工具
└── lib/
    └── auth.ts                       # 认证工具
```

## 前端页面

- `/membership` - 会员中心
- `/login?ref=ABCD1234` - 注册页面（带推荐码）

## 测试流程

### 1. 测试注册（无推荐）

```bash
# 访问注册页面
open http://localhost:5000/login

# 注册新用户
# 系统自动给7天免费试用
```

### 2. 测试推荐注册

```bash
# 用户A获取推荐码
# 1. 登录用户A
# 2. 访问 /membership
# 3. 复制推荐链接

# 用户B通过推荐链接注册
open "http://localhost:5000/login?ref=用户A的推荐码"
# 注册后，用户A和用户B各获7天会员
```

### 3. 测试购买会员

```bash
# 1. 访问会员中心
open http://localhost:5000/membership

# 2. 选择套餐
# 3. 选择支付方式
# 4. 点击立即开通
# 5. 等待2秒，自动模拟支付成功
# 6. 查看会员到期时间是否更新
```

### 4. 测试会员叠加

```bash
# 1. 购买月度会员（30天）
# 2. 再次购买季度会员（90天）
# 3. 检查会员到期时间 = 当前时间 + 30天 + 90天
```

## 注意事项

1. **推荐码唯一性**: 每个用户的推荐码是唯一的
2. **会员时间叠加**: 多次购买会员，时间会累加
3. **推荐奖励叠加**: 推荐奖励也会叠加到会员到期时间
4. **模拟支付**: 当前使用模拟支付，生产环境需对接真实支付
5. **测试环境**: 测试时可以使用模拟支付接口

## 价格调整

如需调整会员价格：

1. 编辑 `src/config/payment.ts`：
```typescript
export const MEMBERSHIP_PLANS = [
  {
    id: 'month',
    name: '月度会员',
    duration: 30,
    price: 29.9,  // 修改价格
    originalPrice: 39.9,
    description: '适合短期体验',
    features: [...],
  },
  // ...
];
```

2. 重启服务生效

## 后续优化

1. **真实支付集成**: 对接微信/支付宝官方API
2. **优惠券功能**: 支持优惠券和折扣
3. **会员等级**: 不同等级享受不同权益
4. **自动续费**: 支持会员自动续费
5. **退款功能**: 支持订单退款
6. **推荐统计**: 详细的推荐数据和收益
