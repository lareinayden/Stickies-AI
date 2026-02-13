# Database Setup Guide
## Before Start, make sure you are at correct directory by running
```bash
cd packages/web
```

## Problem
The error `ECONNREFUSED` on port 5432 means PostgreSQL is not running or not accessible.

## Solution Options

### Option 1: Install PostgreSQL Locally (macOS)

#### Using Homebrew (Recommended)
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create database
createdb stickies_ai

# If encounter: 
zsh: command not found: createdb
## On Apple Silicon (most likely):
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
## On Intel Mac:
echo 'export PATH="/usr/local/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
## Now verify:
which createdb
createdb --version
## Then create the DB:
createdb stickies_ai


# Set up .env file
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

#### Using Postgres.app
1. Download from https://postgresapp.com/
2. Install and start the app
3. Create database `stickies_ai` using the GUI
4. Configure `.env` file

### Option 2: Use Docker (Easiest for Development)

#### Quick Start with Docker
```bash
# Run PostgreSQL in Docker
docker run --name stickies-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=stickies_ai \
  -p 5432:5432 \
  -d postgres:15

# Wait a few seconds for PostgreSQL to start, then initialize:
npm run db:init
```

#### Using Docker Compose (Recommended)
Create `docker-compose.yml` in the project root:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: stickies-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: stickies_ai
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Then run:
```bash
docker-compose up -d
cd packages/web
npm run db:init
```

### Option 3: Use Cloud Database (Production)

#### Supabase (Free Tier Available)
1. Sign up at https://supabase.com
2. Create a new project
3. Get connection string from Settings > Database
4. Update `.env` with connection details

#### Neon (Free Tier Available)
1. Sign up at https://neon.tech
2. Create a new project
3. Get connection string
4. Update `.env` with connection details

## Environment Configuration

After setting up PostgreSQL, create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
# For local PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stickies_ai
DB_USER=postgres
DB_PASSWORD=postgres

# For Docker (default)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stickies_ai
DB_USER=postgres
DB_PASSWORD=postgres

# For cloud databases, use the connection details provided
```

## Verify Setup

After setting up PostgreSQL and configuring `.env`:

```bash
# Test connection and initialize schema
npm run db:init
```

You should see:
```
Testing database connection...
Database connection successful
Initializing database schema...
Database schema initialized successfully
Database initialization complete
Done
```

## Troubleshooting

### Port 5432 already in use
```bash
# Check what's using the port
lsof -i :5432

# If it's another PostgreSQL instance, either:
# 1. Stop it: brew services stop postgresql@15
# 2. Use a different port in .env: DB_PORT=5433
```

### Permission denied
```bash
# Make sure PostgreSQL user has permissions
# For local install, your macOS user should work
# For Docker, use the POSTGRES_USER you set
```

### Database doesn't exist
```bash
# Create it manually
createdb stickies_ai

# Or via psql
psql -U postgres
CREATE DATABASE stickies_ai;
\q
```
