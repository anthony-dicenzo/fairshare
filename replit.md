# FairShare - Expense Sharing Application

## Overview

FairShare is a modern web application for sharing and tracking expenses among groups of users. Built with React frontend and Node.js/Express backend, it uses PostgreSQL with Supabase for data storage and Firebase for authentication. The application features real-time balance calculations, group management, and comprehensive expense tracking with optimized performance through caching and background processing.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with custom Fairshare color palette
- **UI Components**: Radix UI primitives with shadcn/ui
- **State Management**: React Query (@tanstack/react-query) for server state
- **Authentication**: Firebase Authentication with Google OAuth
- **Build Tool**: Vite for development and production builds
- **PWA Support**: Progressive Web App capabilities with manifest and service worker

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with database storage
- **Background Processing**: Bull queue system for balance calculations
- **Caching**: Redis with in-memory fallback for performance optimization

## Key Components

### Database Layer
- **Primary Database**: PostgreSQL hosted on Supabase
- **Schema Management**: Drizzle ORM with migration support
- **Row Level Security (RLS)**: Database-level security enforcing user access control
- **Connection Pooling**: Optimized PostgreSQL connection management
- **Performance Indexes**: Strategic indexes for RLS queries and balance calculations

### Authentication System
- **Provider**: Firebase Authentication
- **Method**: Google OAuth 2.0 sign-in
- **Session Handling**: Express sessions with secure cookie management
- **Authorization**: RLS policies ensuring users only access authorized data
- **Security**: Environment-based configuration with no hardcoded credentials

### Core Business Logic
- **Groups**: Create and manage expense-sharing groups with member roles
- **Expenses**: Record and split expenses among group members
- **Payments**: Track payments between users to settle balances
- **Balance Calculations**: Real-time balance tracking with optimized algorithms
- **Activity Logging**: Comprehensive audit trail for all user actions

### Performance Optimization
- **Background Processing**: Non-blocking balance calculations using job queues
- **Caching Strategy**: Multi-layer caching (Redis + in-memory) for frequently accessed data
- **Database Optimization**: Strategic indexes and optimized RLS policies
- **Incremental Updates**: Efficient balance updates on expense changes

## Data Flow

### User Authentication Flow
1. User initiates Google OAuth through Firebase
2. Firebase handles OAuth validation and returns user token
3. Backend validates Firebase token and creates session
4. RLS context is set for database-level authorization
5. All subsequent requests use session-based authentication

### Expense Management Flow
1. User creates expense with participant details
2. Expense data is validated and stored in database
3. Balance calculation job is queued for background processing
4. Cache invalidation ensures immediate UI updates
5. Background worker updates all affected user balances
6. Activity log records the action for audit purposes

### Group Management Flow
1. Group creation establishes member relationships
2. Invite codes are generated for new member onboarding
3. RLS policies automatically enforce group-based data access
4. Balance tables are initialized for new group members

## External Dependencies

### Required Services
- **Supabase**: PostgreSQL database hosting with built-in RLS support
- **Firebase**: Authentication service with Google OAuth integration
- **Redis**: Optional caching layer for production performance

### Key NPM Packages
- **Database**: `drizzle-orm`, `pg` (PostgreSQL driver)
- **Authentication**: `firebase` (client-side), `@supabase/supabase-js`
- **Background Jobs**: `bull` for job queue management
- **UI Framework**: `react`, `@radix-ui/*` components
- **Validation**: `@hookform/resolvers` with form handling
- **Styling**: `tailwindcss` with custom configuration

## Deployment Strategy

### Environment Configuration
- Development: Local environment with `.env.local` configuration
- Production: Replit deployment with secure environment variables
- Database: Supabase PostgreSQL with SSL connection
- Authentication: Firebase project with domain authorization

### Build Process
1. Frontend build using Vite compilation
2. Backend build using esbuild for Node.js optimization
3. Static asset generation and optimization
4. Environment variable validation and security checks

### Security Implementation
- **Credential Management**: All sensitive data in environment variables
- **Database Security**: Row Level Security policies prevent unauthorized access
- **Session Security**: Secure cookie configuration with proper domain settings
- **API Security**: Request validation and authentication middleware

### Performance Monitoring
- Balance calculation performance targeting sub-100ms operations
- Database query optimization through strategic indexing
- Cache hit rate monitoring for performance optimization
- Background job queue monitoring for system health

## Changelog
- June 21, 2025: Enhanced expense editing functionality for new group members
  - Improved user selection interface to show all group members as clickable options
  - Added clear visual indicators with payers highlighted using blue rings
  - Enhanced participant management allowing easy addition/removal of people from existing expenses
  - Implemented better validation preventing saves with invalid split totals
  - Added helpful text showing selected participant count and usage instructions
  - Fixed JSX syntax issues in expense editing components
- June 14, 2025: Fixed password reset functionality
  - Configured Resend email service with verified sender domain
  - Updated URL generation to use production domain instead of development URL
  - Added comprehensive error handling and logging for email service failures
  - Password reset emails now properly direct users to live deployment
- June 14, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.