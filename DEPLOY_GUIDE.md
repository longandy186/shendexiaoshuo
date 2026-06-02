# 神的小说工坊 - 完整部署指南

## 📋 部署流程总览

```
1. 登录 Coze 平台
   ↓
2. 配置环境变量
   ↓
3. 提交代码
   ↓
4. 触发部署
   ↓
5. 测试功能
```

---

## 🔧 步骤 1: 登录 Coze 平台

### 访问地址
- Coze 平台：https://www.coze.com
- 或访问你常用的 Coze 登录地址

### 登录后
1. 找到项目列表
2. 搜索项目：`shendexiaoshuo`
3. 点击项目进入详情页
4. 记录项目 ID：`7614824638762893331`

---

## ⚙️ 步骤 2: 配置环境变量

### 进入环境变量配置
1. 在项目详情页，找到"设置"或"配置"选项
2. 点击"环境变量"或"环境配置"
3. 进入环境变量管理页面

### 添加环境变量

#### 方式 1: 手动添加
逐个添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `EMAIL_HOST` | `smtp.163.com` | 163 邮箱 SMTP 服务器 |
| `EMAIL_PORT` | `465` | SMTP 端口 |
| `EMAIL_SECURE` | `true` | 启用 SSL |
| `EMAIL_USER` | `longandy@163.com` | 发件人邮箱 |
| `EMAIL_PASS` | `FXa4W8rtgRdcsUgv` | 授权密码 |
| `EMAIL_FROM` | `longandy@163.com` | 发件人地址 |

#### 方式 2: 批量导入
如果平台支持，复制以下内容一次性导入：

```env
EMAIL_HOST=smtp.163.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=longandy@163.com
EMAIL_PASS=FXa4W8rtgRdcsUgv
EMAIL_FROM=longandy@163.com
```

### 保存配置
- 点击"保存"或"应用"按钮
- 确认所有配置已保存成功

---

## 📦 步骤 3: 提交代码

### 确认代码修改
在本地执行：

```bash
git status
git add .
git commit -m "fix: 配置邮件服务环境变量"
```

### 推送代码
```bash
git push
```

---

## 🚀 步骤 4: 触发部署

### 自动部署
如果 Coze 平台支持自动部署：
- 代码推送后会自动触发部署
- 在"部署"页面查看部署状态

### 手动部署
如果需要手动触发：
1. 进入"部署"或"构建"页面
2. 点击"部署"或"重新部署"按钮
3. 等待部署完成

### 监控部署状态
- 查看部署日志
- 确认部署成功
- 记录部署时间

---

## 🧪 步骤 5: 测试功能

### 测试前准备
确保部署已完成（通常需要 2-5 分钟）

### 快速测试
使用测试脚本：

```bash
chmod +x deploy-test.sh
./deploy-test.sh
```

### 手动测试

#### 测试 1: 访问网站
```bash
curl -I https://shendexiaoshuo.coze.site/
```

**预期结果**：
```
HTTP/1.1 200 OK
...
```

#### 测试 2: 发送验证码
```bash
curl -s -X POST https://shendexiaoshuo.coze.site/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "type": "register"}'
```

**预期结果**：
```json
{
  "code": 200,
  "msg": "验证码已发送至您的邮箱，5分钟内有效",
  "data": {
    "email": "test@example.com",
    "type": "register"
  }
}
```

#### 测试 3: 超级管理员登录
```bash
curl -s -X POST https://shendexiaoshuo.coze.site/api/auth/quick-login \
  -H "Content-Type: application/json" \
  -d '{"account": "342"}'
```

**预期结果**：
```json
{
  "code": 200,
  "msg": "登录成功",
  "data": {
    "user": {
      "id": "...",
      "email": "13960104@qq.com",
      "username": "342",
      "role": "admin"
    },
    "token": "..."
  }
}
```

### 前端测试
1. 访问：https://shendexiaoshuo.coze.site/login
2. 切换到"注册"标签
3. 输入邮箱：`longandy@163.com`
4. 点击"发送验证码"
5. 检查邮箱是否收到验证码

---

## ❓ 常见问题

### Q1: 环境变量在哪里配置？
**A**:
- 登录 Coze 平台
- 进入项目设置
- 找到"环境变量"选项

### Q2: 部署需要多长时间？
**A**:
- 通常 2-5 分钟
- 具体时间取决于项目大小

### Q3: 如何确认部署成功？
**A**:
- 查看"部署"页面
- 状态显示"成功"或"部署完成"
- 访问网站能正常打开

### Q4: 邮件发送仍然失败？
**A**:
1. 检查环境变量是否正确配置
2. 检查 163 邮箱授权密码是否有效
3. 查看部署日志
4. 联系技术支持

### Q5: 用户 342 不存在？
**A**:
- 确认数据库已正确同步
- 使用数据库管理工具检查用户表
- 如果不存在，手动添加用户

---

## 📞 技术支持

### 联系方式
- Coze 技术支持
- 项目 ID：7614824638762893331

### 提供信息
```
项目名称：shendexiaoshuo
项目 ID：7614824638762893331
问题描述：邮件发送失败
错误信息：Invalid login: 535 Error: authentication failed
```

---

## ✅ 部署检查清单

在部署完成后，确认以下内容：

- [ ] 环境变量已正确配置
- [ ] 代码已成功提交
- [ ] 项目已成功部署
- [ ] 网站可以正常访问
- [ ] 邮件发送功能正常
- [ ] 超级管理员登录正常
- [ ] 注册功能正常
- [ ] 登录功能正常

---

## 🎉 完成确认

如果以上所有测试都通过，恭喜你！部署成功！

现在可以正常使用所有功能：
- ✅ 用户注册
- ✅ 用户登录
- ✅ 邮件验证码
- ✅ 推荐码系统
- ✅ 会员系统

---

## 📝 相关文件

- 配置文件：`COZE_ENV_CONFIG.env`
- 配置指南：`EMAIL_CONFIG_GUIDE.md`
- 测试脚本：`deploy-test.sh`
- 状态检查：`check-online-status.sh`
