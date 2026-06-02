#!/bin/bash

echo "=========================================="
echo "神的小说工坊 - 线上环境部署测试流程"
echo "=========================================="
echo ""

# 步骤 1: 检查线上环境状态
echo "步骤 1: 检查线上环境状态"
echo "----------------------------------------"
echo "访问: https://shendexiaoshuo.coze.site"
echo ""
curl -s -I https://shendexiaoshuo.coze.site/ | head -5
echo ""

# 步骤 2: 测试邮件发送（当前状态）
echo "步骤 2: 测试邮件发送（当前状态）"
echo "----------------------------------------"
curl -s -X POST https://shendexiaoshuo.coze.site/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "type": "register"}' | python3 -m json.tool
echo ""

# 步骤 3: 测试超级管理员登录
echo "步骤 3: 测试超级管理员登录"
echo "----------------------------------------"
curl -s -X POST https://shendexiaoshuo.coze.site/api/auth/quick-login \
  -H "Content-Type: application/json" \
  -d '{"account": "342"}' | python3 -m json.tool
echo ""

echo "=========================================="
echo "检查完成！"
echo "=========================================="
echo ""
echo "如果邮件发送失败，请按照 EMAIL_CONFIG_GUIDE.md 中的步骤配置环境变量"
echo ""
