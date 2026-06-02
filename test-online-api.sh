#!/bin/bash

echo "==================================="
echo "测试线上环境 API 接口"
echo "目标：https://shendexiaoshuo.coze.site"
echo "==================================="
echo ""

# 测试 1: 免验证登录 - 使用用户名
echo "测试 1: 免验证登录 - 使用用户名 '342'"
echo "-----------------------------------"
curl -s -X POST https://shendexiaoshuo.coze.site/api/auth/quick-login \
  -H "Content-Type: application/json" \
  -d '{"account": "342"}' | python3 -m json.tool
echo ""
echo ""

# 测试 2: 免验证登录 - 使用邮箱
echo "测试 2: 免验证登录 - 使用邮箱 '13960104@qq.com'"
echo "-----------------------------------"
curl -s -X POST https://shendexiaoshuo.coze.site/api/auth/quick-login \
  -H "Content-Type: application/json" \
  -d '{"account": "13960104@qq.com"}' | python3 -m json.tool
echo ""
echo ""

# 测试 3: 发送验证码
echo "测试 3: 发送验证码"
echo "-----------------------------------"
curl -s -X POST https://shendexiaoshuo.coze.site/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "type": "register"}' | python3 -m json.tool
echo ""
echo ""

echo "==================================="
echo "测试完成！"
echo "==================================="
