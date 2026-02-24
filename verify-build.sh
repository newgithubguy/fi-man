#!/bin/bash

echo "=== Checking Git Status ==="
git status
echo ""

echo "=== Latest Commit ==="
git log -1 --oneline
echo ""

echo "=== Checking for Account Sidebar in index.html ==="
grep -c "accounts-sidebar" index.html
echo ""

echo "=== Checking for Transfer Input in index.html ==="
grep -c "isTransferInput" index.html
echo ""

echo "=== Checking for Accounts in app.js ==="
grep -c "ACCOUNTS_STORAGE_KEY" app.js
echo ""

echo "=== File Sizes ==="
ls -lh app.js index.html styles.css
echo ""

echo "If all checks show positive numbers and files are updated, rebuild:"
echo "docker compose down"
echo "docker compose build --no-cache"
echo "docker compose up -d"
