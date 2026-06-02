#!/bin/bash

echo "==================================="
echo "测试超级管理员免验证登录"
echo "==================================="
echo ""

# 测试 1: 使用用户名登录
echo "测试 1: 使用用户名 '342' 登录"
echo "-----------------------------------"
curl -s -X POST http://localhost:5000/api/auth/quick-login \
  -H "Content-Type: application/json" \
  -d '{"account": "342"}' | python3 -m json.tool
echo ""
echo ""

# 测试 2: 使用邮箱登录
echo "测试 2: 使用邮箱 '13960104@qq.com' 登录"
echo "-----------------------------------"
curl -s -X POST http://localhost:5000/api/auth/quick-login \
  -H "Content-Type: application/json" \
  -d '{"account": "13960104@qq.com"}' | python3 -m json.tool
echo ""
echo ""

echo "==================================="
echo "测试完成！"
echo "==================================="
