#!/usr/bin/env bash

set -u

# Load .env when available (safe parser; avoids executing .env content).
if [ -f .env ]; then
  while IFS= read -r raw_line || [ -n "$raw_line" ]; do
    line="${raw_line%$'\r'}"
    case "$line" in
      ""|\#*) continue ;;
    esac
    if [[ "$line" != *"="* ]]; then
      continue
    fi
    key="${line%%=*}"
    value="${line#*=}"
    key="${key//[[:space:]]/}"
    if [[ "$value" =~ ^\".*\"$ ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" =~ ^\'.*\'$ ]]; then
      value="${value:1:${#value}-2}"
    fi
    if [ -z "${!key+x}" ]; then
      export "$key=$value"
    fi
  done < .env
fi

# Config with env-first defaults
BOT_TOKEN="${BOT_TOKEN:-}"
WEBHOOK_URL="${WEBHOOK_URL:-https://webhook.xseries.site/telegram/webhook}"
SECRET="${WEBHOOK_SECRET:-local-dev-secret}"
LOCAL_API="${LOCAL_API:-${LOCAL_BOT_API_BASE_URL:-http://127.0.0.1:8082}}"

if [ -z "$BOT_TOKEN" ]; then
  echo "ERROR: BOT_TOKEN is missing. Set it in .env or environment."
  exit 1
fi

print_json() {
  if command -v jq >/dev/null 2>&1; then
    jq .
  else
    cat
  fi
}

FAKE_UPDATE_JSON='{
  "update_id": 999999999,
  "message": {
    "message_id": 1,
    "from": { "id": 123456789, "first_name": "TestUser" },
    "chat": { "id": 123456789, "type": "private" },
    "date": 1715670000,
    "text": "Hello from webhook test!"
  }
}'

echo "=== Testing Bot API Server ==="
curl -sS "$LOCAL_API/bot$BOT_TOKEN/getMe" | print_json

echo
echo "=== Setting Webhook ==="
curl -sS "$LOCAL_API/bot$BOT_TOKEN/setWebhook" \
  -d "url=$WEBHOOK_URL" \
  -d "secret_token=$SECRET" | print_json

echo
echo "=== Checking Webhook Info ==="
curl -sS "$LOCAL_API/bot$BOT_TOKEN/getWebhookInfo" | print_json

echo
echo "=== Sending Fake Update to Webhook ==="
curl -sS -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: $SECRET" \
  -d "$FAKE_UPDATE_JSON" | print_json

echo
echo "=== Done ==="
