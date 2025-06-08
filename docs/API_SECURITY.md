# Backend API Security Layer Documentation

## Overview

Your FairShare application implements a comprehensive backend API security layer that follows industry best practices for protecting sensitive data and preventing unauthorized access.

## Security Architecture

### 1. Environment Variable Protection
- All sensitive credentials stored in environment variables
- Server-side validation of required environment variables on startup
- No service role keys exposed to frontend applications
- Secure configuration management through `config/environment.ts`

### 2. Authentication & Session Management
- **Multi-layered Authentication**: Supports both traditional username/password and Google OAuth
- **Secure Password Hashing**: Uses scrypt algorithm with salt for password storage
- **Session-based Authentication**: Express sessions with secure cookie settings
- **Session Storage**: Database-backed session storage for persistence
- **Rate Limiting**: Protects authentication endpoints from brute force attacks

### 3. API Endpoint Protection
- **Authentication Required**: All API endpoints require valid authentication
- **Input Validation**: Zod schemas validate all request data
- **SQL Injection Prevention**: Drizzle ORM provides safe database queries
- **XSS Protection**: Input sanitization middleware removes malicious scripts
- **CSRF Protection**: Secure session handling prevents cross-site request forgery

### 4. Security Headers & Middleware
- **Helmet.js**: Comprehensive security headers
- **Content Security Policy**: Restricts resource loading to trusted sources
- **Rate Limiting**: API and authentication rate limits
- **Request Sanitization**: Automatic cleanup of potentially dangerous input
- **Connection Monitoring**: Database health checks and monitoring

## API Endpoints Security

### Authentication Endpoints
```
POST /api/register    - User registration (rate limited)
POST /api/login       - User authentication (rate limited)
POST /api/google-auth - Google OAuth authentication (rate limited)
POST /api/logout      - Session termination
GET  /api/user        - Current user information (authenticated)
PUT  /api/user        - Profile updates (authenticated)
```

### Protected Endpoints
All endpoints under `/api/` require authentication:
- Group management (`/api/groups/*`)
- Expense management (`/api/expenses/*`)
- Payment tracking (`/api/payments/*`)
- Balance calculations (`/api/balances/*`)
- Activity logging (`/api/activity/*`)

## Database Security

### Connection Security
- SSL-required connections to Supabase
- Connection pooling with timeout management
- Health monitoring and automatic reconnection
- Secure credential handling

### Query Security
- Drizzle ORM prevents SQL injection
- Parameterized queries for all database operations
- Transaction support for complex operations
- Input validation before database operations

## Environment Configuration

### Required Environment Variables
```
DATABASE_URL         - Supabase database connection string
SUPABASE_URL        - Supabase API endpoint
SUPABASE_ANON_KEY   - Supabase anonymous key (public)
SESSION_SECRET      - Secret for session signing
```

### Security Best Practices
- Never expose service role keys to frontend
- Use anonymous key for client-side operations only
- Rotate session secret regularly
- Use strong, unique secrets for production

## Rate Limiting Configuration

### API Rate Limits
- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 attempts per 15 minutes per IP
- **Customizable**: Easily adjustable in security middleware

## Security Headers

### Implemented Headers
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Referrer control
- `Content-Security-Policy` - Resource loading restrictions

This security layer ensures your FairShare application meets enterprise-grade security standards while maintaining usability and performance.