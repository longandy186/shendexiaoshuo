# 数据库配置和测试指南

## ✅ 已完成的配置

### 1. 超级管理员账号已创建

已成功创建超级管理员账号：

```
用户名: 342
邮箱: longandy@163.com
角色: admin（超级管理员）
状态: active
推荐码: ADMIN888
会员: 终身会员（2034年到期）
```

### 2. 免验证登录接口已创建

**接口地址**: `POST /api/auth/quick-login`

**使用方式**:

```bash
# 使用用户名"342"登录
curl -X POST http://localhost:5000/api/auth/quick-login \
  -H "Content-Type: application/json" \
  -d '{"account": "342"}'

# 使用邮箱"longandy@163.com"登录
curl -X POST http://localhost:5000/api/auth/quick-login \
  -H "Content-Type: application/json" \
  -d '{"account": "longandy@163.com"}'
```

**前端调用示例**:

```typescript
const response = await fetch('/api/auth/quick-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ account: '342' }), // 或 'longandy@163.com'
});

const result = await response.json();
console.log(result); // { code: 200, msg: '登录成功', data: { user, token } }
```

### 3. 邮箱服务配置文件已创建

配置文件位于 `.env`，当前配置为QQ邮箱：

```env
EMAIL_HOST=smtp.qq.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=13960104@qq.com
EMAIL_PASS=your_qq_email_authorization_code
EMAIL_FROM=13960104@qq.com
```

## ⚠️ 需要完成的配置

### 获取QQ邮箱授权密码

为了发送验证码邮件，需要获取QQ邮箱的授权密码（不是邮箱登录密码）：

#### 步骤：

1. **登录QQ邮箱**
   - 访问 https://mail.qq.com
   - 使用 13960104@qq.com 登录

2. **开启SMTP服务**
   - 点击右上角"设置"
   - 选择"账户"
   - 找到"POP3/SMTP服务"或"IMAP/SMTP服务"
   - 点击"开启"

3. **生成授权密码**
   - 开启服务后会要求验证手机号
   - 验证成功后会显示授权密码
   - **复制这个授权密码**（16位字符）

4. **更新配置文件**
   - 编辑 `.env` 文件
   - 将 `EMAIL_PASS` 的值替换为刚才复制的授权密码

```env
EMAIL_PASS=你的16位授权密码
```

## 🧪 测试流程

### 测试1: 超级管理员免验证登录

#### 方法1: 使用curl测试

```bash
# 使用用户名登录
curl -X POST http://localhost:5000/api/auth/quick-login \
  -H "Content-Type: application/json" \
  -d '{"account": "342"}'
```

#### 方法2: 使用浏览器测试

打开浏览器控制台（F12），执行：

```javascript
fetch('/api/auth/quick-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ account: '342' })
})
.then(r => r.json())
.then(console.log);
```

**预期结果**:
```json
{
  "code": 200,
  "msg": "登录成功",
  "data": {
    "user": {
      "id": "a2989ed2-29a1-4ceb-87d9-467f9599a354",
      "email": "longandy@163.com",
      "username": "342",
      "role": "admin",
      "isPremium": true,
      "premiumExpiresAt": "2034-01-01T00:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 测试2: 13960104@qq.com 注册流程

#### 前置条件

⚠️ **必须先配置QQ邮箱授权密码**，否则无法发送验证码！

#### 注册步骤

1. **访问注册页面**
   ```
   http://localhost:5000/login
   ```

2. **切换到"注册"标签**

3. **填写注册信息**
   - 邮箱: `13960104@qq.com`
   - 用户名: `测试用户`（或任意2-20个字符）
   - 推荐码: `ADMIN888`（可选，使用管理员推荐码可获7天奖励）

4. **发送验证码**
   - 点击"发送验证码"按钮
   - 检查 QQ邮箱 收到验证码
   - 验证码格式：6位数字（如：123456）

5. **完成注册**
   - 输入收到的验证码
   - 点击"注册"按钮
   - 自动登录并跳转到首页

**预期结果**:
- 注册成功
- 自动获得7天免费试用
- 如果使用了推荐码，管理员账号额外获得7天奖励
- 自动登录并跳转到首页

### 测试3: 13960104@qq.com 登录流程

1. **访问登录页面**
   ```
   http://localhost:5000/login
   ```

2. **切换到"登录"标签**

3. **填写登录信息**
   - 邮箱: `13960104@qq.com`

4. **发送验证码**
   - 点击"发送验证码"按钮
   - 检查 QQ邮箱 收到验证码

5. **完成登录**
   - 输入收到的验证码
   - 点击"登录"按钮
   - 跳转到首页

**预期结果**:
- 登录成功
- 显示用户名
- 皇冠图标（会员中心入口）
- 管理员盾牌图标（如果角色是admin）

## 🔍 验证配置

### 检查超级管理员账号

```sql
SELECT id, username, email, role, status, is_premium, premium_expires_at, referral_code
FROM users
WHERE email = 'longandy@163.com';
```

**预期输出**:
```
id: a2989ed2-29a1-4ceb-87d9-467f9599a354
username: 342
email: longandy@163.com
role: admin
status: active
is_premium: true
premium_expires_at: 2034-01-01T00:00:00Z
referral_code: ADMIN888
```

### 检查新注册用户

```sql
SELECT id, username, email, role, status, is_premium, premium_expires_at, referred_by, created_at
FROM users
WHERE email = '13960104@qq.com';
```

## 📝 常见问题

### Q1: 验证码发送失败

**原因**: 邮箱授权密码未配置或配置错误

**解决方案**:
1. 确认已获取QQ邮箱授权密码
2. 检查 `.env` 文件中的 `EMAIL_PASS` 是否正确
3. 保存 `.env` 文件后重启服务

### Q2: 免验证登录提示"用户不存在"

**原因**: 账号输入错误

**解决方案**:
- 确保使用 `342` 或 `longandy@163.com`
- 注意大小写和拼写

### Q3: 注册后没有自动登录

**原因**: 可能是Token设置失败

**解决方案**:
1. 检查浏览器控制台是否有错误
2. 检查Cookie是否设置成功
3. 手动访问 `/api/auth/me` 查看登录状态

### Q4: 如何查看验证码日志

开发环境下，验证码会记录在日志中：

```bash
# 查看应用日志
tail -f /app/work/logs/bypass/app.log
```

## 🚀 下一步

完成邮箱配置后，即可开始测试：

1. ✅ 配置QQ邮箱授权密码（优先级：高）
2. ✅ 测试超级管理员免验证登录
3. ✅ 测试 13960104@qq.com 注册
4. ✅ 测试 13960104@qq.com 登录
5. ✅ 测试推荐码功能
6. ✅ 测试会员购买流程

## 📞 联系支持

如遇到问题，请提供：
1. 具体操作步骤
2. 错误信息截图
3. 浏览器控制台日志
4. 服务器日志（如需要）
