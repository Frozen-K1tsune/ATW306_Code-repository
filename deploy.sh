#!/bin/bash
# ─────────────────────────────────────────────────────────────────
#  JuristFlow AI Worker — Gemini Deployment Script
#  Requirements: Node.js 18+ (https://nodejs.org)
#  You need a free Google Gemini API key:
#  https://aistudio.google.com/app/apikey
# ─────────────────────────────────────────────────────────────────

set -e

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       JuristFlow AI Worker — Gemini Edition          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install it from https://nodejs.org then re-run this script."
  exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Current: $(node --version)"
  exit 1
fi

echo "✓ Node.js $(node --version) detected"

# Install wrangler if not present
if ! command -v wrangler &> /dev/null; then
  echo "📦 Installing Wrangler (Cloudflare CLI)..."
  npm install -g wrangler
fi

echo "✓ Wrangler $(wrangler --version) ready"
echo ""
echo "🔐 Log in to Cloudflare (opens browser)..."
echo ""

wrangler login

echo ""
echo "🔑 Enter your Google Gemini API key."
echo "   Get a free key at: https://aistudio.google.com/app/apikey"
echo ""
read -rsp "   Gemini API Key: " GEMINI_API_KEY
echo ""

if [ -z "$GEMINI_API_KEY" ]; then
  echo "❌ No API key entered. Aborting."
  exit 1
fi

echo ""
echo "🚀 Deploying JuristFlow AI Worker to Cloudflare..."
echo ""

wrangler deploy

echo ""
echo "🔒 Setting GEMINI_API_KEY secret..."
echo "$GEMINI_API_KEY" | wrangler secret put GEMINI_API_KEY

echo ""
echo "══════════════════════════════════════════════════════"
echo "✅ Deployment complete!"
echo ""
echo "Your Worker URL:"
echo "   https://juristflowprototype1.<your-subdomain>.workers.dev"
echo ""
echo "The juristflow.html frontend already points to your Worker."
echo "No further configuration needed — open juristflow.html and go!"
echo "══════════════════════════════════════════════════════"
