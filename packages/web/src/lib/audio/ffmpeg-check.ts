/**
 * Utility to check if FFmpeg is installed and available
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface FFmpegInfo {
  available: boolean;
  version?: string;
  path?: string;
  error?: string;
}

/**
 * Check if FFmpeg is available on the system
 */
export async function checkFFmpegAvailable(): Promise<FFmpegInfo> {
  try {
    const { stdout } = await execAsync('ffmpeg -version');
    const versionMatch = stdout.match(/ffmpeg version ([^\s]+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    // Try to find FFmpeg path
    let ffmpegPath: string | undefined;
    try {
      const { stdout: whichOutput } = await execAsync('which ffmpeg');
      ffmpegPath = whichOutput.trim();
    } catch {
      // which command might not be available, ignore
    }

    return {
      available: true,
      version,
      path: ffmpegPath,
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get installation instructions for FFmpeg based on the platform
 */
export function getFFmpegInstallInstructions(): string {
  const platform = process.platform;

  switch (platform) {
    case 'darwin': // macOS
      return `
FFmpeg is not installed. To install on macOS:

Option 1: Using Homebrew (Recommended)
  brew install ffmpeg

Option 2: Using MacPorts
  sudo port install ffmpeg

Option 3: Download from https://ffmpeg.org/download.html
      `;

    case 'linux':
      return `
FFmpeg is not installed. To install on Linux:

Ubuntu/Debian:
  sudo apt-get update
  sudo apt-get install ffmpeg

Fedora/RHEL:
  sudo dnf install ffmpeg

Arch Linux:
  sudo pacman -S ffmpeg
      `;

    case 'win32': // Windows
      return `
FFmpeg is not installed. To install on Windows:

Option 1: Using Chocolatey
  choco install ffmpeg

Option 2: Using Scoop
  scoop install ffmpeg

Option 3: Download from https://ffmpeg.org/download.html
  Extract and add to PATH
      `;

    default:
      return `
FFmpeg is not installed. Please visit https://ffmpeg.org/download.html
for installation instructions for your platform.
      `;
  }
}
