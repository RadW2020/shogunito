import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DirectVideoOptions {
  outputPath: string;
  duration: number;
  width: number;
  height: number;
  title: string;
  shotType: 'establishing' | 'medium' | 'closeup' | 'detail' | 'asset';
  versionNumber?: number;
  artist?: string;
  code?: string;
}

export class DirectFFmpegGenerator {
  private static getBackgroundColor(shotType: string): string {
    switch (shotType) {
      case 'establishing':
        return '#2E8B57'; // Sea Green
      case 'medium':
        return '#4169E1'; // Royal Blue
      case 'closeup':
        return '#DC143C'; // Crimson
      case 'detail':
        return '#FF8C00'; // Dark Orange
      case 'asset':
        return '#6A5ACD'; // Slate Blue
      default:
        return '#4682B4'; // Steel Blue
    }
  }

  static async generateVideo(options: DirectVideoOptions): Promise<string> {
    const {
      outputPath,
      duration,
      width,
      height,
      title,
      shotType,
      versionNumber = 1,
      code = 'UNKNOWN',
    } = options;

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const backgroundColor = this.getBackgroundColor(shotType);

    console.log(`🎬 Generating video with color: ${backgroundColor}`);

    // Find the ffmpeg container dynamically
    let containerName = 'shogun-ffmpeg-1';
    try {
      const { stdout } = await execAsync(
        'docker ps --filter name=shogun-ffmpeg --format "{{.Names}}"',
      );
      const containers = stdout
        .trim()
        .split('\n')
        .filter((name) => name.includes('ffmpeg'));
      if (containers.length > 0) {
        containerName = containers[0];
        console.log(`📦 Using container: ${containerName}`);
      }
    } catch {
      console.warn('⚠️  Could not find ffmpeg container, using default name');
    }

    // Create a Docker command to run ffmpeg in the ffmpeg container
    const fileName = path.basename(outputPath);
    const dockerCommand =
      `docker exec ${containerName} ffmpeg -f lavfi -i "color=${backgroundColor}:size=${width}x${height}:duration=${duration}:rate=24" ` +
      `-vf "drawtext=text='${title.replace(/'/g, "\\'")}':fontfile=/usr/share/fonts/dejavu/DejaVuSans.ttf:fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h*0.4:box=1:boxcolor=black@0.5:boxborderw=5,` +
      `drawtext=text='${code}':fontfile=/usr/share/fonts/dejavu/DejaVuSans.ttf:fontsize=24:fontcolor=yellow:x=20:y=20:box=1:boxcolor=black@0.7:boxborderw=3,` +
      `drawtext=text='v${versionNumber.toString().padStart(3, '0')}':fontfile=/usr/share/fonts/dejavu/DejaVuSans.ttf:fontsize=28:fontcolor=cyan:x=w-tw-20:y=20:box=1:boxcolor=black@0.7:boxborderw=3,` +
      "drawtext=text='%{pts\\\\:hms}':fontfile=/usr/share/fonts/dejavu/DejaVuSans.ttf:fontsize=36:fontcolor=white:x=(w-text_w)/2:y=h*0.8:box=1:boxcolor=black@0.8:boxborderw=5\" " +
      `-c:v libx264 -pix_fmt yuv420p -r 24 -y "/tmp/videos/${fileName}"`;

    try {
      console.log(`📝 Command: ${dockerCommand}`);
      const { stderr } = await execAsync(dockerCommand);

      if (stderr) {
        console.log(`FFmpeg output: ${stderr}`);
      }

      console.log(`✅ Video generated successfully: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error(`❌ Error generating video: ${error}`);
      throw error;
    }
  }

  static async generateMultipleVideos(videos: DirectVideoOptions[]): Promise<string[]> {
    const results: string[] = [];

    for (const video of videos) {
      try {
        const result = await this.generateVideo(video);
        results.push(result);
      } catch (error) {
        console.error(`Failed to generate video for ${video.title}:`, error);
        // Continue with other videos even if one fails
      }
    }

    return results;
  }
}
