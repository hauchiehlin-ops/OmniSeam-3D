#!/bin/bash
set -e

# OmniSeam 3D - 1-Click Deploy to Hugging Face Spaces
# Usage:
#   ./scripts/deploy_to_hf.sh <username>/<space-name>
# Example:
#   ./scripts/deploy_to_hf.sh hauchieh/omniseam-engine

SPACE_TARGET="$1"

if [ -z "$SPACE_TARGET" ]; then
    echo "=========================================================="
    echo "❌ 請提供您的 Hugging Face Space 名稱！"
    echo "用法："
    echo "  ./scripts/deploy_to_hf.sh <你的HF使用者名稱>/<Space名稱>"
    echo "範例："
    echo "  ./scripts/deploy_to_hf.sh hauchieh/omniseam-engine"
    echo "=========================================================="
    exit 1
fi

HF_REMOTE_URL="https://huggingface.co/spaces/${SPACE_TARGET}"

echo "=========================================================="
echo "🚀 正在將 OmniSeam 3D 專屬轉譯節點同步至 Hugging Face Spaces..."
echo "目標 Space: ${HF_REMOTE_URL}"
echo "=========================================================="

# Check if hf remote exists
if git remote | grep -q "^hf$"; then
    git remote set-url hf "$HF_REMOTE_URL"
else
    git remote add hf "$HF_REMOTE_URL"
fi

echo "📦 正在推送程式碼至 Hugging Face (請在提示時輸入 Hugging Face 帳號與 Access Token / 密碼)..."
git push hf main:main --force

echo ""
echo "=========================================================="
echo "🎉 部署完成！"
echo "您的專屬節點網址為："
# Replace slash with dash for direct URL
USERNAME=$(echo "$SPACE_TARGET" | cut -d'/' -f1)
SPACENAME=$(echo "$SPACE_TARGET" | cut -d'/' -f2)
echo "🔗 https://${USERNAME}-${SPACENAME}.hf.space"
echo "=========================================================="
