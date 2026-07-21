# Use Node.js 20-slim as the base image for glibc compatibility (needed by onnxruntime / transformers)
FROM node:20-slim

# Install system dependencies:
# - ffmpeg (for audio processing)
# - python3 (runtime dependency for yt-dlp)
# - curl & ca-certificates (to download yt-dlp and fetch updates)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    curl \
    ca-certificates \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory inside the container
WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install project dependencies
RUN npm ci

# Copy the rest of the backend source code
COPY . .

# Compile TypeScript to JavaScript.
# Note: We pass "--noEmit false" to override the "noEmit: true" setting in tsconfig.json
RUN npm run build -- --noEmit false

# Create persistent storage directories for logging and audio chunks
RUN mkdir -p cache logs

# Expose the service port (matches PORT in .env / src/index.ts)
EXPOSE 3000

# Start the application using node on the compiled code
CMD ["npm", "start"]
