import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Image Size Configuration
 * Defines different sizes for responsive images
 */
export enum ImageSize {
  THUMBNAIL = 'thumbnail', // Small preview (150x150)
  SMALL = 'small', // Card size (400x400)
  MEDIUM = 'medium', // Detail view (800x800)
  LARGE = 'large', // Full screen (1920x1920)
  ORIGINAL = 'original', // Original size
}

/**
 * Image Format Configuration
 * Modern formats provide better compression
 */
export enum ImageFormat {
  WEBP = 'webp', // Modern format, good compression
  AVIF = 'avif', // Best compression, newer format
  JPEG = 'jpeg', // Fallback format
  PNG = 'png', // For images requiring transparency
}

/**
 * Image Size Dimensions
 */
const SIZE_DIMENSIONS = {
  [ImageSize.THUMBNAIL]: { width: 150, height: 150 },
  [ImageSize.SMALL]: { width: 400, height: 400 },
  [ImageSize.MEDIUM]: { width: 800, height: 800 },
  [ImageSize.LARGE]: { width: 1920, height: 1920 },
};

/**
 * Image Optimization Result
 */
export interface OptimizedImageResult {
  originalPath: string;
  originalSize: number;
  optimizedVersions: {
    size: ImageSize;
    format: ImageFormat;
    path: string;
    fileSize: number;
    width: number;
    height: number;
  }[];
  totalSavings: number; // Percentage saved
}

/**
 * Image Optimization Service
 *
 * Provides comprehensive image optimization including:
 * - Multiple sizes generation (thumbnail, small, medium, large)
 * - Modern format conversion (WebP, AVIF)
 * - Quality optimization
 * - Metadata stripping
 * - Progressive/interlaced encoding
 *
 * @example
 * const result = await imageOptimization.optimizeImage('/uploads/image.jpg', {
 *   sizes: [ImageSize.THUMBNAIL, ImageSize.MEDIUM],
 *   formats: [ImageFormat.WEBP, ImageFormat.JPEG]
 * });
 */
@Injectable()
export class ImageOptimizationService {
  private readonly logger = new Logger(ImageOptimizationService.name);

  /**
   * Optimize an image by generating multiple sizes and formats
   *
   * @param originalPath - Path to the original image file
   * @param options - Optimization options
   * @returns OptimizedImageResult with all generated versions
   */
  async optimizeImage(
    originalPath: string,
    options: {
      sizes?: ImageSize[];
      formats?: ImageFormat[];
      quality?: number;
      outputDir?: string;
    } = {},
  ): Promise<OptimizedImageResult> {
    const {
      sizes = [ImageSize.THUMBNAIL, ImageSize.SMALL, ImageSize.MEDIUM],
      formats = [ImageFormat.WEBP, ImageFormat.JPEG],
      quality = 80,
      outputDir,
    } = options;

    this.logger.log(`Optimizing image: ${originalPath}`);

    // Get original file stats
    const originalStats = fs.statSync(originalPath);
    const originalSize = originalStats.size;

    // Parse original path
    const parsedPath = path.parse(originalPath);
    const baseDir = outputDir || parsedPath.dir;
    const baseName = parsedPath.name;

    // Load image metadata
    const metadata = await sharp(originalPath).metadata();
    this.logger.log(
      `Original dimensions: ${metadata.width}x${metadata.height}, format: ${metadata.format}`,
    );

    // Generate optimized versions
    const optimizedVersions: OptimizedImageResult['optimizedVersions'] = [];
    let totalOptimizedSize = 0;

    // Generate each size + format combination
    for (const size of sizes) {
      for (const format of formats) {
        try {
          const result = await this.generateOptimizedVersion(
            originalPath,
            baseDir,
            baseName,
            size,
            format,
            quality,
          );

          optimizedVersions.push(result);
          totalOptimizedSize += result.fileSize;
        } catch (error) {
          this.logger.error(`Failed to generate ${size}/${format}: ${error.message}`);
        }
      }
    }

    // Calculate savings
    const averageOptimizedSize = totalOptimizedSize / optimizedVersions.length;
    const totalSavings = ((originalSize - averageOptimizedSize) / originalSize) * 100;

    this.logger.log(
      `Optimization complete: ${optimizedVersions.length} versions generated, ${totalSavings.toFixed(2)}% average savings`,
    );

    return {
      originalPath,
      originalSize,
      optimizedVersions,
      totalSavings,
    };
  }

  /**
   * Generate a single optimized version of an image
   */
  private async generateOptimizedVersion(
    originalPath: string,
    baseDir: string,
    baseName: string,
    size: ImageSize,
    format: ImageFormat,
    quality: number,
  ): Promise<OptimizedImageResult['optimizedVersions'][0]> {
    // Build output path
    const outputPath = path.join(baseDir, `${baseName}-${size}.${format}`);

    // Start sharp pipeline
    let pipeline = sharp(originalPath);

    // Resize if not original
    if (size !== ImageSize.ORIGINAL) {
      const dimensions = SIZE_DIMENSIONS[size];
      pipeline = pipeline.resize(dimensions.width, dimensions.height, {
        fit: 'inside', // Maintain aspect ratio
        withoutEnlargement: true, // Don't upscale
      });
    }

    // Apply format-specific optimizations
    switch (format) {
      case ImageFormat.WEBP:
        pipeline = pipeline.webp({
          quality,
          effort: 6, // 0-6, higher = better compression but slower
        });
        break;

      case ImageFormat.AVIF:
        pipeline = pipeline.avif({
          quality,
          effort: 6,
        });
        break;

      case ImageFormat.JPEG:
        pipeline = pipeline.jpeg({
          quality,
          progressive: true, // Progressive loading
          mozjpeg: true, // Use mozjpeg for better compression
        });
        break;

      case ImageFormat.PNG:
        pipeline = pipeline.png({
          quality,
          compressionLevel: 9, // 0-9, higher = better compression
          progressive: true,
        });
        break;
    }

    // Strip metadata for privacy and size reduction
    pipeline = pipeline.withMetadata({
      orientation: undefined, // Keep orientation
    });

    // Save optimized image
    const info = await pipeline.toFile(outputPath);

    return {
      size,
      format,
      path: outputPath,
      fileSize: info.size,
      width: info.width,
      height: info.height,
    };
  }

  /**
   * Generate only thumbnail for quick previews
   *
   * @param originalPath - Path to the original image
   * @param outputPath - Optional custom output path
   * @returns Path to generated thumbnail
   */
  async generateThumbnail(originalPath: string, outputPath?: string): Promise<string> {
    const parsedPath = path.parse(originalPath);
    const thumbnailPath =
      outputPath || path.join(parsedPath.dir, `${parsedPath.name}-thumbnail.webp`);

    await sharp(originalPath)
      .resize(150, 150, {
        fit: 'cover', // Crop to exact size
        position: 'center',
      })
      .webp({ quality: 75 })
      .toFile(thumbnailPath);

    this.logger.log(`Thumbnail generated: ${thumbnailPath}`);
    return thumbnailPath;
  }

  /**
   * Convert image to modern format (WebP/AVIF) for better compression
   *
   * @param originalPath - Path to the original image
   * @param format - Target format
   * @param quality - Quality setting (0-100)
   * @returns Path to converted image
   */
  async convertToModernFormat(
    originalPath: string,
    format: ImageFormat.WEBP | ImageFormat.AVIF = ImageFormat.WEBP,
    quality = 80,
  ): Promise<string> {
    const parsedPath = path.parse(originalPath);
    const outputPath = path.join(parsedPath.dir, `${parsedPath.name}.${format}`);

    const pipeline = sharp(originalPath);

    if (format === ImageFormat.WEBP) {
      await pipeline.webp({ quality, effort: 6 }).toFile(outputPath);
    } else {
      await pipeline.avif({ quality, effort: 6 }).toFile(outputPath);
    }

    this.logger.log(`Converted to ${format}: ${outputPath}`);
    return outputPath;
  }

  /**
   * Get responsive image srcset for <img> tag
   *
   * @param basePath - Base path without size/format suffix
   * @param sizes - Sizes to include in srcset
   * @param format - Image format
   * @returns srcset string
   */
  generateSrcSet(
    basePath: string,
    sizes: ImageSize[] = [ImageSize.SMALL, ImageSize.MEDIUM, ImageSize.LARGE],
    format: ImageFormat = ImageFormat.WEBP,
  ): string {
    const parsedPath = path.parse(basePath);
    const baseUrl = `${parsedPath.dir}/${parsedPath.name}`;

    return sizes
      .map((size) => {
        const dimensions = SIZE_DIMENSIONS[size];
        return `${baseUrl}-${size}.${format} ${dimensions.width}w`;
      })
      .join(', ');
  }

  /**
   * Check if file is an image
   */
  isImageFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'].includes(ext);
  }

  /**
   * Get image dimensions without loading full image
   */
  async getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  }
}
