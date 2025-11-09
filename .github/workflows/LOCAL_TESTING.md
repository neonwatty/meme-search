# Testing GitHub Actions Workflows Locally with Act

## Overview

You can test the Docker build workflows locally using `act`, but be aware of limitations around multi-platform builds and resource constraints.

## Installation (Already Installed)

```bash
act --version
# act version 0.2.82
```

## Important Limitations

### ❌ What WON'T Work Locally

1. **Multi-platform builds (ARM64 on x86_64)**
   - `act` runs in Docker containers that inherit host architecture
   - Building `linux/arm64` on M-series Mac: ✅ Works natively
   - Building `linux/arm64` on Intel Mac/Linux: ❌ Requires QEMU (same as CI)
   - **Solution**: Test only AMD64 builds locally, or accept QEMU slowness

2. **GitHub Container Registry pushes**
   - `push: true` will fail without GHCR authentication
   - **Solution**: Use dry-run mode or skip push steps

3. **GitHub Actions cache**
   - `cache-from/cache-to: type=gha` won't work (GHA-specific)
   - **Solution**: Use local Docker cache instead

4. **Resource limits**
   - Your machine may have more RAM/disk than CI runners (7GB/14GB)
   - Tests may pass locally but fail in CI
   - **Solution**: Add Docker resource limits to simulate CI

### ✅ What WILL Work Locally

1. Workflow syntax validation
2. Disk cleanup steps (will clean your local Docker)
3. Dependency installation with retry logic
4. BuildKit cache mounts (uses local Docker cache)
5. Build timing instrumentation
6. Single-platform builds (native architecture)

---

## Testing Strategies

### Strategy 1: Dry-Run Validation (Recommended - Fast)

Test workflow steps WITHOUT building/pushing images:

```bash
# Test Python workflow (dry-run)
act workflow_dispatch \
  --workflows .github/workflows/pro-image-to-text-build.yml \
  --dry-run

# Test Rails workflow (dry-run)
act workflow_dispatch \
  --workflows .github/workflows/pro-app-build.yml \
  --dry-run
```

**What this validates**:
- ✅ YAML syntax is correct
- ✅ All actions are available
- ✅ Steps are in correct order
- ✅ No obvious errors

**Time**: ~30 seconds per workflow

---

### Strategy 2: Syntax + Shell Commands Only (Fast)

Test shell scripts (cleanup, timing) without Docker builds:

```bash
# Test only shell steps (skip Docker build)
act workflow_dispatch \
  --workflows .github/workflows/pro-image-to-text-build.yml \
  --job build_pro_image_to_text \
  --skip-build
```

**What this validates**:
- ✅ Bash scripts run correctly
- ✅ Disk cleanup works
- ✅ Retry logic syntax is valid
- ✅ Timing calculations work

**Time**: ~2-3 minutes

---

### Strategy 3: Single-Platform Build (Native Only)

Test a real build for your native architecture only:

**For ARM64 Macs (M1/M2/M3)**:

```bash
# Create test workflow that only builds ARM64
cp .github/workflows/pro-app-build.yml .github/workflows/test-local-build.yml

# Edit test-local-build.yml to:
# 1. Change matrix to: platform: [linux/arm64]  (remove linux/amd64)
# 2. Change push: false (don't push to registry)
# 3. Remove cache-from/cache-to GHA (use local Docker cache)

act workflow_dispatch \
  --workflows .github/workflows/test-local-build.yml \
  --platform ubuntu-22.04=ghcr.io/catthehacker/ubuntu:act-22.04
```

**For Intel Macs / x86_64 Linux**:

```bash
# Same as above but use: platform: [linux/amd64]

act workflow_dispatch \
  --workflows .github/workflows/test-local-build.yml \
  --platform ubuntu-22.04=ghcr.io/catthehacker/ubuntu:act-22.04
```

**What this validates**:
- ✅ Dockerfile syntax
- ✅ BuildKit cache mounts
- ✅ Dependency installation with retry
- ✅ Build completes successfully
- ✅ Resource usage (check with `docker stats`)

**Time**: 10-20 minutes (first build), 3-5 minutes (cached)

---

### Strategy 4: Simulate CI Resource Limits (Most Accurate)

Run with Docker resource limits matching GitHub runners:

```bash
# Create act configuration file
cat > ~/.actrc << 'EOF'
--container-daemon-socket -
--container-options "--memory=7g --memory-swap=7g --cpus=2"
EOF

# Run with resource limits
act workflow_dispatch \
  --workflows .github/workflows/test-local-build.yml \
  --platform ubuntu-22.04=ghcr.io/catthehacker/ubuntu:act-22.04
```

**What this validates**:
- ✅ Build succeeds with CI memory limits
- ✅ No OOM errors
- ✅ Disk cleanup is sufficient
- ✅ Matches CI environment closely

**Time**: Same as Strategy 3

---

## Step-by-Step Testing Guide

### Step 1: Validate Workflow Syntax

```bash
cd /Users/neonwatty/Desktop/meme-search

# Quick syntax check
act --list --workflows .github/workflows/pro-image-to-text-build.yml
act --list --workflows .github/workflows/pro-app-build.yml
```

**Expected output**:
```
Stage  Job ID                    Job name                  Workflow name               Workflow file
0      build_pro_image_to_text   build_pro_image_to_text   pro image to text build     pro-image-to-text-build.yml
```

If errors, fix YAML syntax.

---

### Step 2: Test Shell Scripts (No Docker Build)

Create a test workflow that runs only pre-build steps:

```bash
cat > .github/workflows/test-shell-steps.yml << 'EOF'
name: "test shell steps"
on: workflow_dispatch

jobs:
  test:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4

      - name: Free Disk Space
        run: |
          echo "=== Disk space before cleanup ==="
          df -h
          sudo rm -rf /usr/share/dotnet || true
          sudo rm -rf /usr/local/lib/android || true
          sudo rm -rf /opt/ghc || true
          echo "=== Disk space after cleanup ==="
          df -h

      - name: Test retry logic
        run: |
          echo "Testing retry syntax..."
          for i in {1..3}; do
            echo "Attempt $i"
            break
          done

      - name: Test timing
        id: start
        run: |
          echo "timestamp=$(date +%s)" >> $GITHUB_OUTPUT
          sleep 2
          END=$(date +%s)
          START=${{ steps.start.outputs.timestamp }}
          echo "Duration: $((END - START)) seconds"
EOF

act workflow_dispatch \
  --workflows .github/workflows/test-shell-steps.yml \
  --platform ubuntu-22.04=ghcr.io/catthehacker/ubuntu:act-22.04
```

**Time**: ~2 minutes

---

### Step 3: Test Single-Platform Docker Build (Recommended)

Create simplified test workflow:

```bash
cat > .github/workflows/test-docker-build.yml << 'EOF'
name: "test docker build"
on: workflow_dispatch

jobs:
  test_build:
    runs-on: ubuntu-22.04
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - name: Free Disk Space
        run: |
          df -h
          docker system prune -af --volumes

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Python Service (AMD64 only, no push)
        uses: docker/build-push-action@v6
        with:
          context: ./meme_search_pro/image_to_text_generator
          platforms: linux/amd64
          push: false
          load: true
          tags: test-image:latest
          cache-from: type=local,src=/tmp/.buildx-cache
          cache-to: type=local,dest=/tmp/.buildx-cache,mode=max

      - name: Verify image works
        run: |
          docker run --rm test-image:latest python -c "print('Success!')"
EOF

# Run test
act workflow_dispatch \
  --workflows .github/workflows/test-docker-build.yml \
  --platform ubuntu-22.04=ghcr.io/catthehacker/ubuntu:act-22.04 \
  --verbose
```

**What to watch for**:
- ✅ BuildKit cache mount syntax works
- ✅ Dependencies install successfully
- ✅ Image builds without errors
- ✅ Retry logic triggers if network fails

**Time**: 15-20 minutes first run, 3-5 minutes cached

---

### Step 4: Monitor Resource Usage

While build runs (from Step 3):

```bash
# In another terminal
watch -n 1 'docker stats --no-stream'

# Or check disk usage
watch -n 5 'df -h'
```

**Expected**:
- Memory: <6GB peak (with 7GB limit)
- Disk: <10GB used after cleanup

---

## Quick Testing Commands

### Test Python Workflow (Syntax Only)
```bash
act --list -W .github/workflows/pro-image-to-text-build.yml
```

### Test Rails Workflow (Syntax Only)
```bash
act --list -W .github/workflows/pro-app-build.yml
```

### Test Python Build (Single Platform, No Push)
```bash
# Create minimal test
cat > .actrc << 'EOF'
-P ubuntu-22.04=ghcr.io/catthehacker/ubuntu:act-22.04
--container-options "--memory=7g --cpus=2"
EOF

act workflow_dispatch \
  -W .github/workflows/test-docker-build.yml \
  --verbose
```

---

## Limitations Summary

| Feature | Works Locally | Notes |
|---------|---------------|-------|
| YAML syntax validation | ✅ Yes | Fast, always test this |
| Bash scripts | ✅ Yes | Disk cleanup, retry logic |
| Single-platform builds | ✅ Yes | Use native architecture |
| BuildKit cache mounts | ✅ Yes | Uses local Docker cache |
| Multi-platform (QEMU) | ⚠️ Slow | Same as CI, takes hours |
| GHA cache | ❌ No | Use `type=local` instead |
| GHCR push | ❌ No | Set `push: false` |
| Resource limits | ⚠️ Manual | Use `--container-options` |

---

## Recommended Testing Flow

1. **Before committing**:
   ```bash
   # Quick syntax check (30 seconds)
   act --list -W .github/workflows/pro-app-build.yml
   act --list -W .github/workflows/pro-image-to-text-build.yml
   ```

2. **Before pushing to main**:
   ```bash
   # Test shell steps (2 minutes)
   act workflow_dispatch -W .github/workflows/test-shell-steps.yml
   ```

3. **For major changes**:
   ```bash
   # Full single-platform build (15-20 minutes)
   act workflow_dispatch -W .github/workflows/test-docker-build.yml
   ```

4. **Multi-platform testing**:
   - ❌ **Skip locally** (too slow with QEMU)
   - ✅ **Test in CI** via manual workflow dispatch
   - ✅ **Use GitHub's runners** (free for public repos)

---

## Debugging Failed Builds

If `act` build fails:

```bash
# Run with debug output
act workflow_dispatch \
  -W .github/workflows/test-docker-build.yml \
  --verbose \
  --env ACT=true

# Enter container for debugging
docker exec -it $(docker ps -q --filter "label=act") bash

# Check logs
act workflow_dispatch \
  -W .github/workflows/test-docker-build.yml \
  --verbose 2>&1 | tee act-debug.log
```

---

## Alternative: GitHub Manual Dispatch (Recommended for Multi-Platform)

Instead of testing multi-platform locally, use GitHub's free CI:

```bash
# Push to feature branch
git checkout -b test/docker-builds
git add .
git commit -m "Test: Docker build optimizations"
git push -u origin test/docker-builds

# Manually trigger workflow in GitHub UI
# Or via CLI:
gh workflow run pro-app-build.yml --ref test/docker-builds
gh workflow run pro-image-to-text-build.yml --ref test/docker-builds

# Watch progress
gh run watch
```

**Why this is better for multi-platform**:
- ✅ Free for public repos
- ✅ Native ARM64 runners (faster than QEMU)
- ✅ Matches production environment exactly
- ✅ Tests GHA cache integration
- ✅ No local resource consumption

---

## Cleanup After Testing

```bash
# Remove test workflows
rm .github/workflows/test-*.yml

# Clean up Docker (careful!)
docker system prune -af --volumes

# Remove act cache
rm -rf ~/.actrc
```

---

## Summary: What to Test Locally vs CI

### Test Locally ✅
- YAML syntax (instant)
- Shell script logic (2 min)
- Single-platform builds (15-20 min)
- BuildKit cache mounts (validates Dockerfile syntax)

### Test in CI ✅
- Multi-platform builds (30-40 min with optimizations)
- GitHub Actions cache integration
- GHCR push authentication
- ARM64 builds (if not on M-series Mac)

### Recommended Approach
1. **Syntax check locally** with `act --list`
2. **Push to test branch** and trigger manual workflow dispatch
3. **Monitor first CI run** for any issues
4. **Merge after successful CI run**

This gives you confidence without waiting hours for QEMU emulation locally.
