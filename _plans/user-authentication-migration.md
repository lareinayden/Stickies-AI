# User Authentication Migration Plan

## Overview
This plan documents the migration path from Option 1 (Simple Mock Authentication) to Option 2 (Database-Backed Realistic Authentication).

## Current State (Option 1)
- **User Management**: Hardcoded test users (Shirley, Yixiao, Guest)
- **Authentication**: Simple account selection page with localStorage/session cookie
- **User Storage**: No users table - users are hardcoded in application code
- **Session Management**: Client-side state (localStorage or Next.js cookies)
- **Data Isolation**: `user_id` column added to `transcriptions` and `tasks` tables, filtered by hardcoded user IDs

## Target State (Option 2)
- **User Management**: Database-backed user accounts
- **Authentication**: Real login flow with username/password (or OAuth)
- **User Storage**: `users` table in PostgreSQL
- **Session Management**: Secure session tokens (JWT or session cookies)
- **Data Isolation**: Same `user_id` foreign keys, but with real user accounts

## Migration Steps

### Phase 1: Database Schema Migration
1. **Create `users` table**
   ```sql
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     username VARCHAR(255) UNIQUE NOT NULL,
     email VARCHAR(255) UNIQUE,
     password_hash VARCHAR(255) NOT NULL, -- bcrypt hashed
     display_name VARCHAR(255),
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Migrate existing data**
   - Map hardcoded user IDs to new user records
   - Update all existing `transcriptions` and `tasks` records with new `user_id` UUIDs
   - Create migration script to handle data transformation

3. **Add foreign key constraints**
   ```sql
   ALTER TABLE transcriptions 
     ADD CONSTRAINT fk_transcriptions_user 
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
   
   ALTER TABLE tasks 
     ADD CONSTRAINT fk_tasks_user 
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
   ```

### Phase 2: Authentication System
1. **Replace hardcoded users with database queries**
   - Remove hardcoded user constants
   - Create `getUserById()`, `getUserByUsername()`, `createUser()` functions
   - Update user selection/login page to query database

2. **Implement password authentication**
   - Add password hashing (bcrypt)
   - Create login API route (`/api/auth/login`)
   - Create registration API route (`/api/auth/register`)
   - Add password validation rules

3. **Session management upgrade**
   - Replace localStorage with secure HTTP-only cookies
   - Implement session token generation (JWT or session ID)
   - Add session expiration and refresh logic
   - Create logout functionality

### Phase 3: Security Enhancements
1. **Add authentication middleware**
   - Create middleware to verify user sessions
   - Protect API routes with authentication checks
   - Add role-based access control (if needed)

2. **Password security**
   - Enforce password strength requirements
   - Add password reset functionality
   - Implement account lockout after failed attempts

3. **Session security**
   - Add CSRF protection
   - Implement secure cookie flags (HttpOnly, Secure, SameSite)
   - Add session timeout handling

### Phase 4: User Management Features
1. **User profile management**
   - Create user profile page
   - Allow users to update display name, email
   - Add password change functionality

2. **Account management**
   - Add account deletion (with data cleanup)
   - Implement account deactivation
   - Add user preferences/settings

### Phase 5: Optional Enhancements
1. **OAuth integration** (Google, GitHub, etc.)
2. **Email verification**
3. **Two-factor authentication**
4. **User roles and permissions**

## File Changes Required

### New Files
```
packages/web/src/
  lib/
    auth/
      session.ts          # Session management
      password.ts         # Password hashing/validation
      middleware.ts       # Auth middleware
    db/
      users.ts            # User database operations
  app/
    api/
      auth/
        login/
          route.ts        # Login endpoint
        register/
          route.ts        # Registration endpoint
        logout/
          route.ts        # Logout endpoint
    login/
      page.tsx            # Login page (replaces account selection)
```

### Modified Files
```
packages/web/src/
  lib/
    db/
      schema.ts           # Add users table schema
      client.ts           # Update initialization
      transcriptions.ts   # Remove hardcoded user_id, use session
      tasks.ts            # Remove hardcoded user_id, use session
  app/
    api/
      **/route.ts         # Add auth middleware to all routes
    layout.tsx            # Add auth context provider
    page.tsx              # Update to use real auth
```

## Migration Checklist

### Pre-Migration
- [ ] Backup existing database
- [ ] Document current hardcoded user IDs
- [ ] Test data migration script on staging

### Database Migration
- [ ] Create `users` table
- [ ] Seed initial users (Shirley, Yixiao, Guest) with passwords
- [ ] Run data migration script to update existing records
- [ ] Add foreign key constraints
- [ ] Verify data integrity

### Code Migration
- [ ] Create user database functions
- [ ] Implement password hashing
- [ ] Create login/register API routes
- [ ] Replace hardcoded user selection with login page
- [ ] Update all API routes to use auth middleware
- [ ] Update database functions to get user_id from session
- [ ] Remove hardcoded user constants

### Testing
- [ ] Test user registration
- [ ] Test login/logout flow
- [ ] Verify data isolation (users can only see their data)
- [ ] Test password reset (if implemented)
- [ ] Test session expiration
- [ ] Verify existing data is accessible after migration

### Deployment
- [ ] Run database migration in production
- [ ] Deploy new authentication code
- [ ] Monitor for errors
- [ ] Update user documentation

## Rollback Plan
If migration fails:
1. Revert code changes
2. Remove `users` table (if created)
3. Restore database from backup
4. Re-enable hardcoded user selection

## Notes
- **Timing**: Plan migration during low-traffic period
- **Data Loss Risk**: Low - existing data will be migrated, not deleted
- **Downtime**: Minimal - can be done with zero downtime if using blue-green deployment
- **Testing**: Critical - test migration script thoroughly on staging first

## Dependencies
- Password hashing library: `bcrypt` or `bcryptjs`
- Session management: Next.js built-in or `next-auth`
- JWT (if using): `jsonwebtoken`
