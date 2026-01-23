# FFmpeg Setup Guide

The audio normalization service requires FFmpeg to be installed on your system.

## Check if FFmpeg is Installed

```bash
ffmpeg -version
```

If you see version information, FFmpeg is installed. If you get a "command not found" error, install it using the instructions below.

## Installation Instructions

### macOS

**Using Homebrew (Recommended):**
```bash
brew install ffmpeg
```

**Using MacPorts:**
```bash
sudo port install ffmpeg
```

### Linux

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Fedora/RHEL:**
```bash
sudo dnf install ffmpeg
```

**Arch Linux:**
```bash
sudo pacman -S ffmpeg
```

### Windows

**Using Chocolatey:**
```bash
choco install ffmpeg
```

**Using Scoop:**
```bash
scoop install ffmpeg
```

**Manual Installation:**
1. Download from https://ffmpeg.org/download.html
2. Extract the archive
3. Add the `bin` directory to your system PATH

## Verify Installation

After installation, verify it works:

```bash
ffmpeg -version
```

You should see output like:
```
ffmpeg version 6.x.x Copyright (c) 2000-2024 the FFmpeg developers
...
```

## Testing Audio Normalization

Once FFmpeg is installed, you can test the audio normalization:

```bash
# Run tests (will skip if FFmpeg not available)
npm test

# Or test manually by importing the AudioNormalizer
```

## Troubleshooting

### FFmpeg not found in PATH

If you installed FFmpeg but it's not found:

1. **macOS (Homebrew):** Add to your shell profile:
   ```bash
   echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

2. **Linux:** Ensure `/usr/bin` or `/usr/local/bin` is in your PATH

3. **Windows:** Add FFmpeg bin directory to System Environment Variables

### Permission Errors

If you get permission errors, ensure FFmpeg has execute permissions:
```bash
chmod +x $(which ffmpeg)
```

## Note for Production

In production environments (Docker, cloud services), you'll need to:
- Include FFmpeg in your Docker image
- Or use a service that provides FFmpeg
- Or use a cloud-based audio processing service

For Docker, add to your Dockerfile:
```dockerfile
RUN apt-get update && apt-get install -y ffmpeg
```
