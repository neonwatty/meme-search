# Task 08: Production Deployment

**Goal**: Prepare and deploy the React Islands application to production

**Estimated Time**: 3-4 hours

**Prerequisites**: Task 07 complete, all tests passing

---

## Deployment Overview

Steps:
1. Optimize production build
2. Update Docker configuration
3. Configure environment variables
4. Test production build locally
5. Deploy to production
6. Monitor and verify

---

## Step 1: Production Build Optimization

### 1.1 Optimize Vite Build
Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import RubyPlugin from 'vite-plugin-ruby'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    RubyPlugin(),
    react({
      fastRefresh: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app/javascript'),
      '@/components': path.resolve(__dirname, './app/javascript/components'),
      '@/lib': path.resolve(__dirname, './app/javascript/lib'),
      '@/hooks': path.resolve(__dirname, './app/javascript/hooks'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
  },
})
```

**Checklist:**
- [ ] Manual chunks configured for vendor splitting
- [ ] Chunk size warning limit set
- [ ] Production optimizations enabled

### 1.2 Test Production Build
```bash
cd meme_search_pro/meme_search_app

# Build assets
RAILS_ENV=production npm run build

# Precompile Rails assets
RAILS_ENV=production bundle exec rails assets:precompile
```

**Checklist:**
- [ ] Vite build succeeds
- [ ] Assets generated in `public/vite/`
- [ ] Rails assets precompiled
- [ ] No errors or warnings

### 1.3 Check Bundle Size
```bash
# After build, check sizes
ls -lh public/vite/assets/
```

**Target sizes:**
- Main bundle: < 300KB
- React vendor: < 150KB
- Total: < 500KB gzipped

**Checklist:**
- [ ] Bundle sizes acceptable
- [ ] No unexpected large files
- [ ] All chunks present

---

## Step 2: Update Docker Configuration

### 2.1 Update Dockerfile
Update `meme_search_pro/meme_search_app/Dockerfile`:

```dockerfile
FROM ruby:3.3.2-slim AS base

# Install dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    curl \
    build-essential \
    git \
    libpq-dev \
    libvips \
    pkg-config \
    && rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm@latest

WORKDIR /rails

# Install gems
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Install node packages
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Copy application code
COPY . .

# Build Vite assets
RUN NODE_ENV=production npm run build

# Precompile Rails assets
RUN RAILS_ENV=production bundle exec rails assets:precompile

# Clean up
RUN rm -rf node_modules tmp/cache

# Final stage
FROM ruby:3.3.2-slim

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    libpq5 \
    libvips \
    && rm -rf /var/lib/apt/lists

WORKDIR /rails

COPY --from=base /usr/local/bundle /usr/local/bundle
COPY --from=base /rails /rails

RUN useradd rails --create-home --shell /bin/bash && \
    chown -R rails:rails /rails

USER rails:rails

EXPOSE 3000

CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
```

**Checklist:**
- [ ] Multi-stage build for smaller image
- [ ] Node.js 20 installed
- [ ] Vite build in Docker
- [ ] Assets precompiled
- [ ] Production dependencies only
- [ ] Non-root user

### 2.2 Update docker-compose.yml
Update `docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
      POSTGRES_DB: meme_search_production
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - meme_search_network

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - meme_search_network

  image_to_text_generator:
    build:
      context: ./image_to_text_generator
      dockerfile: Dockerfile
    environment:
      - REDIS_URL=redis://redis:6379/0
      - MODEL_CACHE_DIR=/models
    volumes:
      - model_cache:/models
      - ${MEMES_PATH:-./memes}:/app/public/memes:ro
    deploy:
      resources:
        limits:
          memory: 12G
    restart: unless-stopped
    networks:
      - meme_search_network

  web:
    build:
      context: ./meme_search_app
      dockerfile: Dockerfile
    environment:
      RAILS_ENV: production
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD:-password}@db:5432/meme_search_production
      REDIS_URL: redis://redis:6379/0
      ML_SERVICE_URL: http://image_to_text_generator:8000
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
      RAILS_LOG_TO_STDOUT: "true"
      RAILS_SERVE_STATIC_FILES: "true"
    ports:
      - "${APP_PORT:-3000}:3000"
    volumes:
      - ${MEMES_PATH:-./memes}:/rails/public/memes
    depends_on:
      - db
      - redis
      - image_to_text_generator
    restart: unless-stopped
    networks:
      - meme_search_network

volumes:
  postgres_data:
  redis_data:
  model_cache:

networks:
  meme_search_network:
    driver: bridge
```

**Checklist:**
- [ ] Production environment variables
- [ ] Proper service dependencies
- [ ] Volume mounts configured
- [ ] Network isolation
- [ ] Restart policies set
- [ ] Resource limits on ML service

### 2.3 Create .env.example
Create `.env.example`:

```bash
# Database
DB_PASSWORD=your_secure_password_here

# Rails
SECRET_KEY_BASE=your_secret_key_base_here
RAILS_ENV=production

# Application
APP_PORT=3000
MEMES_PATH=/path/to/your/memes

# ML Service
MODEL_CACHE_DIR=/path/to/model/cache

# Feature Flags
USE_REACT_GALLERY=true
```

**Checklist:**
- [ ] .env.example created
- [ ] All required variables documented
- [ ] No sensitive values in example

---

## Step 3: Generate Production Secrets

### 3.1 Generate SECRET_KEY_BASE
```bash
cd meme_search_pro/meme_search_app
RAILS_ENV=production bundle exec rails secret
```

Copy output to `.env` file.

**Checklist:**
- [ ] SECRET_KEY_BASE generated
- [ ] Added to .env file
- [ ] .env file in .gitignore

### 3.2 Create .env File
Create `.env` (DO NOT commit this):

```bash
DB_PASSWORD=generate_secure_password_here
SECRET_KEY_BASE=paste_generated_secret_here
APP_PORT=3000
MEMES_PATH=/path/to/memes
USE_REACT_GALLERY=true
```

**Checklist:**
- [ ] .env file created
- [ ] All values filled in
- [ ] .env in .gitignore

---

## Step 4: Database Migration

### 4.1 Prepare Database Migration Script
Create `deploy/db_migrate.sh`:

```bash
#!/bin/bash
set -e

echo "Running database migrations..."
bundle exec rails db:migrate

echo "Database migrations complete!"
```

Make executable:
```bash
chmod +x deploy/db_migrate.sh
```

**Checklist:**
- [ ] Migration script created
- [ ] Script is executable

### 4.2 Create Database Backup Script
Create `deploy/db_backup.sh`:

```bash
#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"

mkdir -p $BACKUP_DIR

echo "Creating database backup..."
docker compose exec -T db pg_dump -U postgres meme_search_production > $BACKUP_FILE

echo "Backup created: $BACKUP_FILE"
```

Make executable:
```bash
chmod +x deploy/db_backup.sh
```

**Checklist:**
- [ ] Backup script created
- [ ] Script is executable

---

## Step 5: Deploy to Production

### 5.1 Pre-Deployment Checklist

**Code:**
- [ ] All tests passing
- [ ] No console errors in production build
- [ ] Git repo is clean
- [ ] Tagged release version

**Configuration:**
- [ ] .env file configured
- [ ] SECRET_KEY_BASE set
- [ ] Database password set
- [ ] MEMES_PATH correct
- [ ] ML service configured

**Infrastructure:**
- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Sufficient disk space
- [ ] Network ports available

### 5.2 Backup Current Production
```bash
# If upgrading existing deployment
./deploy/db_backup.sh
```

**Checklist:**
- [ ] Database backed up
- [ ] Memes directory backed up (if needed)

### 5.3 Build and Deploy
```bash
cd /path/to/meme-search

# Pull latest code
git pull origin main

# Build images
docker compose build

# Stop old containers
docker compose down

# Start new containers
docker compose up -d

# Run migrations
docker compose exec web bundle exec rails db:migrate

# Check logs
docker compose logs -f web
```

**Checklist:**
- [ ] Images built successfully
- [ ] Containers started
- [ ] Migrations ran successfully
- [ ] No errors in logs

### 5.4 Verify Deployment
Visit your production URL and check:

**Basic Functionality:**
- [ ] Homepage loads
- [ ] React Islands hydrate
- [ ] Gallery displays memes
- [ ] Search works (keyword)
- [ ] Search works (semantic)
- [ ] View mode switching works
- [ ] Generate description works
- [ ] Edit meme works
- [ ] Delete meme works

**Performance:**
- [ ] Page load < 2 seconds
- [ ] Images lazy load
- [ ] No JavaScript errors in console
- [ ] HMR not running (production mode)

**Browser Compatibility:**
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

---

## Step 6: Production Monitoring

### 6.1 Set Up Log Monitoring
```bash
# View live logs
docker compose logs -f web

# View last 100 lines
docker compose logs --tail=100 web

# View ML service logs
docker compose logs -f image_to_text_generator
```

**Checklist:**
- [ ] Can access logs
- [ ] No error messages
- [ ] Requests being processed

### 6.2 Monitor Resource Usage
```bash
# View container stats
docker stats

# Check disk usage
df -h

# Check memory
free -h
```

**Checklist:**
- [ ] CPU usage reasonable
- [ ] Memory usage acceptable
- [ ] Disk space sufficient

### 6.3 Set Up Health Checks
Add to `docker-compose.yml` for web service:

```yaml
web:
  # ... existing config ...
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/up"]
    interval: 30s
    timeout: 3s
    retries: 3
    start_period: 40s
```

**Checklist:**
- [ ] Health check configured
- [ ] Health check passing

---

## Step 7: Rollback Plan

### 7.1 Document Rollback Procedure
Create `deploy/ROLLBACK.md`:

```markdown
# Rollback Procedure

## Quick Rollback

1. Stop current deployment:
   ```bash
   docker compose down
   ```

2. Checkout previous version:
   ```bash
   git checkout v1.6-search  # or previous working tag
   ```

3. Rebuild and deploy:
   ```bash
   docker compose build
   docker compose up -d
   ```

4. Restore database if needed:
   ```bash
   docker compose exec -T db psql -U postgres meme_search_production < backups/db_backup_TIMESTAMP.sql
   ```

## Post-Rollback

- Investigate what went wrong
- Fix issues in development
- Test thoroughly
- Redeploy when ready
```

**Checklist:**
- [ ] Rollback procedure documented
- [ ] Team knows how to rollback

### 7.2 Test Rollback (Optional)
If you want to be extra safe, test the rollback procedure on staging first.

**Checklist:**
- [ ] Rollback procedure tested
- [ ] Verified we can restore previous version

---

## Step 8: Post-Deployment Tasks

### 8.1 Update Documentation
Update `README.md`:

```markdown
# Meme Search - Production Setup

## Quick Start (Docker)

1. Clone repository
2. Copy `.env.example` to `.env` and fill in values
3. Run: `docker compose up -d`
4. Visit: http://localhost:3000

## React Islands

This app uses React Islands architecture for enhanced interactivity:
- Gallery page: Modern grid/list views
- Search page: Real-time semantic and keyword search
- Progressive enhancement: works without JavaScript

## Environment Variables

See `.env.example` for required configuration.

## Deployment

See `deploy/` directory for deployment scripts.
```

**Checklist:**
- [ ] README updated
- [ ] Deployment docs added
- [ ] Architecture explained

### 8.2 Tag Release
```bash
git tag -a v2.0.0 -m "React Islands migration complete - Production ready"
git push origin v2.0.0
```

**Checklist:**
- [ ] Release tagged
- [ ] Tag pushed to remote

### 8.3 Celebrate! 🎉
You've successfully migrated meme-search to React Islands architecture!

**Achievement Unlocked:**
- [x] Modern React UI
- [x] Server-side rendering
- [x] Progressive enhancement
- [x] Production deployed
- [x] Tests passing
- [x] Users happy

---

## Step 9: Monitoring & Maintenance

### 9.1 Regular Health Checks
Schedule regular checks:

**Daily:**
- [ ] Check application is accessible
- [ ] Review error logs
- [ ] Check ML service is responding

**Weekly:**
- [ ] Review performance metrics
- [ ] Check disk space
- [ ] Update dependencies if needed

**Monthly:**
- [ ] Database backup verification
- [ ] Security updates
- [ ] Performance optimization review

### 9.2 Performance Monitoring

Key metrics to watch:
- Page load time (target: < 2s)
- Time to Interactive (target: < 3s)
- API response times (target: < 500ms)
- ML service processing time
- Database query times
- Error rate (target: < 0.1%)

**Checklist:**
- [ ] Monitoring tools set up
- [ ] Alerts configured for issues
- [ ] Team knows how to access metrics

---

## Troubleshooting

### Issue: "Vite assets not loading"
**Solution:**
1. Check `RAILS_SERVE_STATIC_FILES=true` in production
2. Verify assets exist in `public/vite/`
3. Check nginx/reverse proxy config if using one

### Issue: "React components not hydrating"
**Solution:**
1. Check JavaScript console for errors
2. Verify `vite_client_tag` in development
3. Check component registry includes all components

### Issue: "Database connection failed"
**Solution:**
1. Verify DATABASE_URL is correct
2. Check database container is running: `docker compose ps`
3. Check database logs: `docker compose logs db`

### Issue: "ML service unavailable"
**Solution:**
1. Check ML container is running
2. Verify memory limits (needs 12GB)
3. Check ML service logs
4. Ensure memes volume is mounted correctly

---

## Success Criteria

- [x] Production build optimized
- [x] Docker configured correctly
- [x] Environment variables set
- [x] Successfully deployed
- [x] All functionality working
- [x] No errors in logs
- [x] Performance acceptable
- [x] Monitoring in place
- [x] Documentation updated
- [x] Rollback plan ready

---

## Congratulations! 🚀

You've completed the React Islands migration!

**What you've achieved:**
1. Migrated from importmap to Vite
2. Integrated React with Rails (Islands pattern)
3. Built modern, accessible UI with shadcn/ui
4. Created comprehensive API layer
5. Implemented Gallery and Search as React Islands
6. Added full test coverage
7. Deployed to production

**Next steps:**
- Monitor application performance
- Gather user feedback
- Plan next features
- Continue iterating and improving

---

**Migration Complete!** ✨
