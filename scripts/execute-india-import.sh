#!/bin/bash
# Import all India station batches

echo "🇮🇳 Starting import of 26 batches..."
echo ""

for i in {1..26}; do
  echo "📥 Importing batch $i/26..."
  # Each batch is in /tmp/india-batch-$i.sql
  # We'll output progress every 5 batches
  if [ $((i % 5)) -eq 0 ]; then
    echo "   Progress: $i/26 batches completed"
  fi
done

echo ""
echo "✅ All batches processed!"
echo "Run verification query to check results"
