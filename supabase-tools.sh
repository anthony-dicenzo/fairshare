#!/bin/bash

# Supabase Database Migration Tools
# This script provides easy commands to manage Supabase database migration

# Print help message
function show_help {
  echo "Supabase Database Migration Tools"
  echo "================================="
  echo ""
  echo "Usage: ./supabase-tools.sh [command]"
  echo ""
  echo "Commands:"
  echo "  verify         Verify Supabase API and database connections"
  echo "  migrate        Migrate data to Supabase using direct connection"
  echo "  migrate-api    Migrate data to Supabase using the API"
  echo "  migrate-full   Complete migration (create tables, migrate data, update app)"
  echo "  revert         Revert application to use Replit database"
  echo "  help           Show this help message"
  echo ""
  echo "Examples:"
  echo "  ./supabase-tools.sh verify        # Check Supabase connections"
  echo "  ./supabase-tools.sh migrate-full  # Complete migration to Supabase (recommended)"
  echo ""
}

# Verify Supabase connections
function verify_supabase {
  echo "🔍 Verifying Supabase connections..."
  npx tsx verify-supabase.ts
}

# Migrate to Supabase (direct connection)
function migrate_to_supabase {
  echo "🚀 Starting migration to Supabase (direct connection)..."
  echo "⚠️ This method may not work in Replit due to network restrictions."
  npx tsx migrate-supabase.ts
}

# Migrate to Supabase (via API)
function migrate_to_supabase_api {
  echo "🚀 Starting migration to Supabase (via API)..."
  echo "✅ This method is more reliable in Replit."
  npx tsx api-migrate-to-supabase.ts
}

# Complete migration (all steps)
function migrate_full {
  echo "🚀 Starting complete migration to Supabase..."
  echo "✅ This is the recommended approach for reliable migration."
  npx tsx migrate-via-api.ts
}

# Revert to Replit database
function revert_to_replit {
  echo "🔄 Reverting to Replit database..."
  npx tsx revert-to-replit.ts
}

# Main function
function main {
  # Make script executable
  chmod +x supabase-tools.sh
  
  case "$1" in
    verify)
      verify_supabase
      ;;
    migrate)
      migrate_to_supabase
      ;;
    migrate-api)
      migrate_to_supabase_api
      ;;
    migrate-full)
      migrate_full
      ;;
    revert)
      revert_to_replit
      ;;
    help|--help|-h|"")
      show_help
      ;;
    *)
      echo "❌ Unknown command: $1"
      echo ""
      show_help
      exit 1
      ;;
  esac
}

# Run the script
main "$@"