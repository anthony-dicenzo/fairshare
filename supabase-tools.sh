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
  echo "  verify      Verify Supabase API and database connections"
  echo "  migrate     Migrate data from Replit database to Supabase"
  echo "  revert      Revert application to use Replit database"
  echo "  help        Show this help message"
  echo ""
  echo "Examples:"
  echo "  ./supabase-tools.sh verify   # Check if Supabase connections are working"
  echo "  ./supabase-tools.sh migrate  # Migrate data to Supabase"
  echo ""
}

# Verify Supabase connections
function verify_supabase {
  echo "🔍 Verifying Supabase connections..."
  npx tsx verify-supabase.ts
}

# Migrate to Supabase
function migrate_to_supabase {
  echo "🚀 Starting migration to Supabase..."
  npx tsx migrate-supabase.ts
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