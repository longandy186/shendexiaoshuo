# 神的小说工坊 - 邮件配置指南

## 问题说明

线上环境 `https://shendexiaoshuo.coze.site` 的邮件发送功能失败，错误信息：
```
邮件发送失败: Invalid login: 535 Error: authentication failed
```

## 解决方案

### 步骤 1: 登录 Coze 平台

1. 访问 Coze 平台
2. 找到项目 `shendexiaoshuo`
3. 进入项目设置

### 步骤 2: 配置环境变量

在 Coze 平台的环境变量配置中，添加以下配置：

```env
EMAIL_HOST=smtp.163.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=longandy@163.com
EMAIL_PASS=FXa4W8rtgRdcsUgv
EMAIL_FROM=longandy@163.com
```

### 步骤 3: 重新部署

1. 保存环境变量配置
2. 触发项目部署
3. 等待部署完成

### 步骤 4: 测试邮件发送

1. 访问 `https://shendexiaoshuo.coze.site/login`
2. 切换到"注册"标签
3. 输入邮箱地址
4. 点击"发送验证码"
5. 检查邮箱是否收到验证码

## 配置说明

### 163 邮箱配置

| 参数 | 值 | 说明 |
|------|-----|------|
| EMAIL_HOST | smtp.163.com | 163 邮箱 SMTP 服务器 |
| EMAIL_PORT | 465 | SMTP 端口（SSL/TLS） |
| EMAIL_SECURE | true | 启用 SSL/TLS |
| EMAIL_USER | longandy@163.com | 发件人邮箱 |
| EMAIL_PASS | FXa4W8rtgRdcsUgv | 授权密码 |
| EMAIL_FROM | longandy@163.com | 发件人地址 |

### QQ 邮箱配置（备用）

如果 163 邮箱有问题，可以使用 QQ 邮箱：

```env
EMAIL_HOST=smtp.qq.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=13960104@qq.com
EMAIL_PASS=pubvvgqrdkaibidj
EMAIL_FROM=13960104@qq.com
```

## 测试接口

### 本地测试

```bash
curl -X POST http://localhost:5000/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "type": "register"}'
```

### 线上测试

```bash
curl -X POST https://shendexiaoshuo.coze.site/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "type": "register"}'
```

### 管理员测试接口

测试邮件配置是否正确：

```bash
curl -X POST https://shendexiaoshuo.coze.site/api/admin/test-email-config \
  -H "Content-Type: application/json" \
  -d '{
    "host": "smtp.163.com",
    "port": 465,
    "secure": true,
    "user": "longandy@163.com",
    "password": "FXa4W8rtgRdcsUgv",
    "from_email": "longandy@163.com"
  }'
```

## 故障排查

### 错误 1: Invalid login: 535 Error: authentication failed

**原因**：授权密码错误或未设置

**解决**：
1. 登录 163 邮箱
2. 重新获取授权密码
3. 更新环境变量

### 错误 2: Unexpected socket close

**原因**：SMTP 端口或协议配置不正确

**解决**：
- 使用 465 端口 + SSL
- 或使用 587 端口 + TLS

### 错误 3: Connection timeout

**原因**：网络连接问题

**解决**：
- 检查防火墙设置
- 尝试更换邮箱服务商

## 联系支持

如果以上方案都无法解决问题，请：

1. 联系 Coze 技术支持
2. 提供项目信息：`shendexiaoshuo` (ID: 7614824638762893331)
3. 说明问题：邮件发送失败，需要配置环境变量

## 相关文件

- 邮件服务：`src/services/emailService.ts`
- 发送验证码接口：`src/app/api/auth/send-code/route.ts`
- 测试接口：`src/app/api/admin/test-email-config/route.ts`
- 配置文件：`COZE_ENV_CONFIG.env`
