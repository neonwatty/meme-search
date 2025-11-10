# syntax=docker/dockerfile:1.4
FROM python:3.12-slim

# Set the working directory
WORKDIR /app

# Install uv with BuildKit cache mount and retry
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --timeout=300 --retries 5 uv

# Copy only requirements first (optimize layer caching)
COPY ./requirements.txt ./

# Install dependencies with BuildKit cache mounts
# Cache both pip and uv caches across builds
# Note: uv doesn't support --timeout or --retry flags
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/root/.cache/uv \
    uv pip install \
      --system \
      -r requirements.txt

# Copy application code AFTER dependencies (separate layer)
COPY ./app ./

# Expose the port the app runs on
EXPOSE 8000

# download model
# RUN python model_init.py

# Command to run the application
CMD ["python", "app.py"]
