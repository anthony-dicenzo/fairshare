#!/bin/bash

# Shell script to run the House of Anthica balance correction

echo "Starting House of Anthica balance correction script..."
echo "==============================================="
echo ""

# Ensure we have the latest dependencies
echo "Checking environment..."
if [ ! -f ./server/db.js ]; then
  echo "Error: Required files not found. Make sure you're running this script from the project root."
  exit 1
fi

# Run the balance correction script
echo "Executing data correction script..."
node fix-house-of-anthica.js

# Check the exit code
if [ $? -eq 0 ]; then
  echo ""
  echo "==============================================="
  echo "✅ Balance correction completed successfully!"
  echo "Balance issues with House of Anthica have been fixed."
  echo "Please verify the changes in the application."
else
  echo ""
  echo "==============================================="
  echo "❌ Balance correction encountered errors."
  echo "Please check the logs above for details."
  exit 1
fi