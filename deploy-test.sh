#!/bin/bash

echo "=========================================="
echo "神的小说工坊 - 完整部署测试脚本"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
PASS=0
FAIL=0

# 测试函数
test_api() {
  local test_name="$1"
  local command="$2"

  echo "测试: $test_name"
  echo "命令: $command"
  echo ""

  local response=$(eval $command)
  local code=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('code', 0))" 2>/dev/null)

  if [ "$code" == "200" ]; then
    echo -e "${GREEN}✓ 通过${NC}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}✗ 失败${NC}"
    echo "响应: $response"
    FAIL=$((FAIL + 1))
  fi
  echo ""
}

# 开始测试
echo "=========================================="
echo "线上环境 API 接口测试"
echo "目标: https://shendexiaoshuo.coze.site"
echo "=========================================="
echo ""

# 测试 1: 邮件发送
test_api "邮件发送" \
  "curl -s -X POST https://shendexiaoshuo.coze.site/api/auth/send-code -H 'Content-Type: application/json' -d '{\"email\": \"test@example.com\", \"type\": \"register\"}'"

# 测试 2: 超级管理员登录（用户名）
test_api "超级管理员登录 - 用户名" \
  "curl -s -X POST https://shendexiaoshuo.coze.site/api/auth/quick-login -H 'Content-Type: application/json' -d '{\"account\": \"342\"}'"

# 测试 3: 超级管理员登录（邮箱）
test_api "超级管理员登录 - 邮箱" \
  "curl -s -X POST https://shendexiaoshuo.coze.site/api/auth/quick-login -H 'Content-Type: application/json' -d '{\"account\": \"13960104@qq.com\"}'"

# 测试 4: 邮件配置测试
test_api "邮件配置测试" \
  "curl -s -X POST https://shendexiaoshuo.coze.site/api/admin/test-email-config -H 'Content-Type: application/json' -d '{\"host\": \"smtp.163.com\", \"port\": 465, \"secure\": true, \"user\": \"longandy@163.com\", \"password\": \"FXa4W8rtgRdcsUgv\", \"from_email\": \"longandy@163.com\"}'"

# 输出结果
echo "=========================================="
echo "测试结果"
echo "=========================================="
echo -e "${GREEN}通过: $PASS${NC}"
echo -e "${RED}失败: $FAIL${NC}"
echo "总计: $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}所有测试通过！${NC}"
  exit 0
else
  echo -e "${RED}存在失败的测试，请检查配置${NC}"
  exit 1
fi
