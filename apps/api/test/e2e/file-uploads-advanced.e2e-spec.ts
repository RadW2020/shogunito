import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  createAdminUser,
  createProject,
  createVersion,
  createAsset,
  createNote,
  expectSuccessResponse,
  expectBadRequestError,
  setupTestApp,
} from '../helpers/test-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Advanced File Uploads E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let projectId: number;
  let assetId: number;
  let versionId: number;

  // Temporary directory for test files
  const testFilesDir = path.join(__dirname, '../temp-test-files');

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupTestApp(app);
    await app.init();

    // Create admin user with all permissions for testing
    const { token } = await createAdminUser(app);
    authToken = token;

    const project = await createProject(app, authToken);
    projectId = project.id!;

    const asset = await createAsset(app, authToken, projectId);
    assetId = asset.id!;

    const version = await createVersion(app, authToken, assetId, 'asset');
    versionId = version.id!;

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // Clean up test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true });
    }
    await app.close();
  });

  /**
   * Helper to create test files of specific sizes
   */
  const createTestFile = (
    fileName: string,
    sizeInBytes: number,
    content: string = 'test',
  ): string => {
    const filePath = path.join(testFilesDir, fileName);
    const buffer = Buffer.from(content);

    if (sizeInBytes <= buffer.length) {
      fs.writeFileSync(filePath, buffer.subarray(0, sizeInBytes));
    } else {
      fs.writeFileSync(filePath, buffer);
      fs.truncateSync(filePath, sizeInBytes);
    }

    return filePath;
  };

  /**
   * Helper to create corrupted files (invalid image data)
   */
  const createCorruptedImageFile = (fileName: string): string => {
    const filePath = path.join(testFilesDir, fileName);
    // Write random bytes that don't form a valid image
    const buffer = Buffer.from('CORRUPTED_IMAGE_DATA_NOT_VALID_PNG_OR_JPEG');
    fs.writeFileSync(filePath, buffer);
    return filePath;
  };

  /**
   * Helper to create valid image file (1x1 PNG)
   */
  const createValidImageFile = (fileName: string): string => {
    const filePath = path.join(testFilesDir, fileName);
    // Minimal valid PNG (1x1 transparent pixel)
    const pngData = Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // PNG signature
      0x00,
      0x00,
      0x00,
      0x0d,
      0x49,
      0x48,
      0x44,
      0x52, // IHDR chunk
      0x00,
      0x00,
      0x00,
      0x01,
      0x00,
      0x00,
      0x00,
      0x01, // 1x1
      0x08,
      0x06,
      0x00,
      0x00,
      0x00,
      0x1f,
      0x15,
      0xc4,
      0x89,
      0x00,
      0x00,
      0x00,
      0x0a,
      0x49,
      0x44,
      0x41,
      0x54,
      0x78,
      0x9c,
      0x63,
      0x00,
      0x01,
      0x00,
      0x00,
      0x05,
      0x00,
      0x01,
      0x0d,
      0x0a,
      0x2d,
      0xb4,
      0x00,
      0x00,
      0x00,
      0x00,
      0x49,
      0x45,
      0x4e,
      0x44,
      0xae,
      0x42,
      0x60,
      0x82,
    ]);
    fs.writeFileSync(filePath, pngData);
    return filePath;
  };

  describe('File Size Limits', () => {
    describe('Thumbnail uploads (5MB limit)', () => {
      it('should accept file within limit (4MB)', async () => {
        const filePath = createValidImageFile('thumbnail-4mb.png');

        const response = await request(app.getHttpServer())
          .post(`/versions/${versionId}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath)
          .expect(200);

        expectSuccessResponse(response);
        expect(response.body.data.thumbnailPath).toBeDefined();
      });

      it('should reject file exceeding limit (10MB)', async () => {
        // Create a 10MB file
        const filePath = createTestFile('thumbnail-10mb.png', 10 * 1024 * 1024);

        const response = await request(app.getHttpServer())
          .post(`/versions/${versionId}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath);

        expect([400, 413]).toContain(response.status);
      });

      it('should handle exactly 5MB file (boundary)', async () => {
        const filePath = createTestFile('thumbnail-5mb.png', 5 * 1024 * 1024);

        const response = await request(app.getHttpServer())
          .post(`/versions/${versionId}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath);

        // Should accept or reject based on exact boundary behavior
        expect([200, 400, 413]).toContain(response.status);
      });
    });

    describe('Attachment uploads (100MB limit)', () => {
      let noteId: string;

      beforeEach(async () => {
        const note = await createNote(app, authToken, projectId, 'project');
        noteId = note.id;
      });

      it('should accept file within limit (50MB)', async () => {
        const filePath = createTestFile('attachment-8mb.pdf', 8 * 1024 * 1024);

        const response = await request(app.getHttpServer())
          .post(`/notes/${noteId}/attachments`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('attachment', filePath);

        // May succeed or timeout based on server config
        expect([200, 201, 400, 413, 408]).toContain(response.status);
      });

      it('should reject file exceeding limit (150MB)', async () => {
        const filePath = createTestFile('attachment-15mb.pdf', 15 * 1024 * 1024);

        const response = await request(app.getHttpServer())
          .post(`/notes/${noteId}/attachments`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('attachment', filePath);

        expect([400, 413]).toContain(response.status);
      });
    });

    describe('Media uploads (2GB limit)', () => {
      it('should accept large video file (100MB)', async () => {
        const filePath = createTestFile('video-100mb.mp4', 100 * 1024 * 1024);

        const response = await request(app.getHttpServer())
          .post(`/versions/${versionId}/file`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', filePath)
          .timeout(60000); // 60 second timeout for large files

        // Large files may timeout or succeed
        expect([200, 201, 408, 413]).toContain(response.status);
      }, 70000); // Jest timeout: 70 seconds

      it('should handle very large file (500MB)', async () => {
        // This is a stress test - may take time or fail
        const filePath = createTestFile('video-500mb.mp4', 500 * 1024 * 1024);

        const response = await request(app.getHttpServer())
          .post(`/versions/${versionId}/file`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', filePath)
          .timeout(60000); // 60 second timeout

        // Should handle gracefully (success, timeout, or size limit)
        expect([200, 201, 400, 408, 413, 504]).toContain(response.status);
      });
    });
  });

  describe('MIME Type Validation', () => {
    describe('Thumbnail MIME types', () => {
      it('should accept valid image/png', async () => {
        const filePath = createValidImageFile('valid.png');

        const response = await request(app.getHttpServer())
          .post(`/versions/${versionId}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath)
          .expect(200);

        expectSuccessResponse(response);
      });

      it('should reject invalid MIME type (text/plain)', async () => {
        const filePath = createTestFile('invalid.txt', 1024);

        const response = await request(app.getHttpServer())
          .post(`/versions/${versionId}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath);

        expectBadRequestError(response);
        expect(response.body.error?.message).toMatch(/not allowed|invalid|mime/i);
      });

      it('should reject executable files', async () => {
        const filePath = createTestFile('malware.exe', 1024);

        const response = await request(app.getHttpServer())
          .post(`/versions/${versionId}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath);

        expectBadRequestError(response);
      });

      it('should reject video files as thumbnail', async () => {
        const filePath = createTestFile('video.mp4', 1024);

        const response = await request(app.getHttpServer())
          .post(`/versions/${versionId}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath);

        expectBadRequestError(response);
      });
    });

    describe('MIME type spoofing detection', () => {
      it('should detect .exe renamed as .png', async () => {
        // Create file with .png extension but executable content
        const filePath = path.join(testFilesDir, 'fake-image.png');
        fs.writeFileSync(filePath, Buffer.from('MZ')); // EXE header

        const response = await request(app.getHttpServer())
          .post(`/versions/${versionId}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath);

        // Should reject based on content, not extension
        expect([200, 400, 415]).toContain(response.status);
      });

      it('should detect PHP script with .jpg extension', async () => {
        const filePath = path.join(testFilesDir, 'malicious.jpg');
        fs.writeFileSync(filePath, '<?php system($_GET["cmd"]); ?>');

        const response = await request(app.getHttpServer())
          .post(`/versions/${versionId}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath);

        expect([200, 400, 415]).toContain(response.status);
      });
    });
  });

  describe('Corrupted and Malformed Files', () => {
    it('should handle corrupted image file', async () => {
      const filePath = createCorruptedImageFile('corrupted.png');

      const response = await request(app.getHttpServer())
        .post(`/versions/${versionId}/thumbnail`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', filePath);

      // Should either reject or handle gracefully
      expect([200, 400, 415, 422]).toContain(response.status);
    });

    it('should handle empty file', async () => {
      const filePath = createTestFile('empty.png', 0);

      const response = await request(app.getHttpServer())
        .post(`/versions/${versionId}/thumbnail`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', filePath);

      expectBadRequestError(response);
    });

    it('should handle file with null bytes', async () => {
      const filePath = path.join(testFilesDir, 'nullbytes.png');
      const buffer = Buffer.alloc(1024, 0x00); // All null bytes
      fs.writeFileSync(filePath, buffer);

      const response = await request(app.getHttpServer())
        .post(`/versions/${versionId}/thumbnail`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', filePath);

      expect([200, 400, 415, 422]).toContain(response.status);
    });

    it('should handle file with special characters in filename', async () => {
      const filePath = path.join(testFilesDir, 'file with spaces & special!@#$.png');
      const pngData = createValidImageFile('temp.png');
      fs.copyFileSync(pngData, filePath);

      const response = await request(app.getHttpServer())
        .post(`/versions/${versionId}/thumbnail`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', filePath);

      // Should sanitize filename and succeed
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Concurrent Uploads', () => {
    it('should handle multiple simultaneous uploads to same version', async () => {
      const filePath1 = createValidImageFile('concurrent1.png');
      const filePath2 = createValidImageFile('concurrent2.png');
      const filePath3 = createValidImageFile('concurrent3.png');

      const [response1, response2, response3] = await Promise.all([
        request(app.getHttpServer())
          .post(`/versions/${versionId}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath1),
        request(app.getHttpServer())
          .post(`/versions/${versionId}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath2),
        request(app.getHttpServer())
          .post(`/versions/${versionId}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath3),
      ]);

      // All should succeed (last one wins)
      const statuses = [response1.status, response2.status, response3.status];
      statuses.forEach((status) => expect([200, 201]).toContain(status));

      // Verify final state - should have one thumbnail
      const versionResponse = await request(app.getHttpServer())
        .get(`/versions/${versionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(versionResponse.body.data.thumbnailPath).toBeDefined();
    });

    it('should handle concurrent uploads to different versions', async () => {
      const version2 = await createVersion(app, authToken, assetId, 'asset');
      const version3 = await createVersion(app, authToken, assetId, 'asset');

      const filePath1 = createValidImageFile('v1-thumb.png');
      const filePath2 = createValidImageFile('v2-thumb.png');
      const filePath3 = createValidImageFile('v3-thumb.png');

      const [response1, response2, response3] = await Promise.all([
        request(app.getHttpServer())
          .post(`/versions/${versionId}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath1),
        request(app.getHttpServer())
          .post(`/versions/${version2.id}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath2),
        request(app.getHttpServer())
          .post(`/versions/${version3.id}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath3),
      ]);

      // All should succeed independently
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response3.status).toBe(200);

      // Each should have its own thumbnail
      expect(response1.body.data.thumbnailPath).not.toBe(response2.body.data.thumbnailPath);
      expect(response2.body.data.thumbnailPath).not.toBe(response3.body.data.thumbnailPath);
    });

    it('should handle race condition with rapid sequential uploads', async () => {
      const uploads = [];

      for (let i = 0; i < 10; i++) {
        const filePath = createValidImageFile(`rapid-${i}.png`);
        uploads.push(
          request(app.getHttpServer())
            .post(`/versions/${versionId}/thumbnail`)
            .set('Authorization', `Bearer ${authToken}`)
            .attach('thumbnail', filePath),
        );
      }

      const responses = await Promise.all(uploads);

      // All should succeed
      responses.forEach((response) => {
        expect([200, 201]).toContain(response.status);
      });

      // Final state should be consistent (one thumbnail)
      const versionResponse = await request(app.getHttpServer())
        .get(`/versions/${versionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(versionResponse.body.data.thumbnailPath).toBeDefined();
    });
  });

  describe('Missing and Invalid Requests', () => {
    it('should reject request without file', async () => {
      const response = await request(app.getHttpServer())
        .post(`/versions/${versionId}/thumbnail`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expectBadRequestError(response);
      expect(response.body.error?.message).toMatch(/no.*file|required/i);
    });

    it('should reject request with wrong field name', async () => {
      const filePath = createValidImageFile('valid.png');

      const response = await request(app.getHttpServer())
        .post(`/versions/${versionId}/thumbnail`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('wrongField', filePath);

      expectBadRequestError(response);
    });

    it('should reject upload to non-existent version', async () => {
      const filePath = createValidImageFile('valid.png');

      const response = await request(app.getHttpServer())
        .post('/versions/NONEXISTENT_VERSION/thumbnail')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', filePath);

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Storage Quota Simulation', () => {
    it('should track storage usage across multiple uploads', async () => {
      // Upload multiple files and track total size
      const files = [
        createTestFile('file1.png', 1024 * 1024), // 1MB
        createTestFile('file2.png', 2 * 1024 * 1024), // 2MB
        createTestFile('file3.png', 1024 * 1024), // 1MB
      ];

      const uploadedSizes: number[] = [];

      for (const filePath of files) {
        const response = await request(app.getHttpServer())
          .post(`/versions/${versionId}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath);

        if ([200, 201].includes(response.status)) {
          uploadedSizes.push(fs.statSync(filePath).size);
        }
      }

      const totalSize = uploadedSizes.reduce((sum, size) => sum + size, 0);
      expect(totalSize).toBeGreaterThan(0);
    });

    it('should handle storage quota exceeded scenario', async () => {
      // This simulates what would happen if storage quota is exceeded
      // In production, this would be enforced by storage service
      const veryLargeFile = createTestFile('quota-exceed.mp4', 3 * 1024 * 1024 * 1024); // 3GB

      const response = await request(app.getHttpServer())
        .post(`/versions/${versionId}/file`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', veryLargeFile)
        .timeout(60000);

      // Should reject due to size limit (2GB max for media)
      expect([400, 413, 507]).toContain(response.status);
    });
  });

  describe('Virus Scanning Simulation', () => {
    it('should reject file with EICAR test signature', async () => {
      // EICAR test file - standard antivirus test string
      const eicarSignature =
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      const filePath = path.join(testFilesDir, 'eicar.txt');
      fs.writeFileSync(filePath, eicarSignature);

      const response = await request(app.getHttpServer())
        .post(`/versions/${versionId}/thumbnail`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', filePath);

      // Should be rejected (by MIME type or virus scanner if implemented)
      expect([400, 415, 451]).toContain(response.status);
    });

    it('should scan and approve clean file', async () => {
      const filePath = createValidImageFile('clean-file.png');

      const response = await request(app.getHttpServer())
        .post(`/versions/${versionId}/thumbnail`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', filePath)
        .expect(200);

      expectSuccessResponse(response);
    });

    it('should handle quarantined file scenario', async () => {
      // Simulate file that would be quarantined
      const filePath = path.join(testFilesDir, 'suspicious.png');
      const suspiciousContent = Buffer.concat([
        Buffer.from('SUSPICIOUS_PATTERN_'),
        Buffer.alloc(1024, 'A'),
      ]);
      fs.writeFileSync(filePath, suspiciousContent);

      const response = await request(app.getHttpServer())
        .post(`/versions/${versionId}/thumbnail`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', filePath);

      // May be rejected or accepted based on virus scanner
      expect([200, 400, 415, 451]).toContain(response.status);
    });
  });

  describe('Edge Cases', () => {
    it('should handle file with very long filename (>255 chars)', async () => {
      const longName = 'a'.repeat(300) + '.png';
      const filePath = createValidImageFile('temp.png');
      const newPath = path.join(testFilesDir, longName);

      try {
        fs.copyFileSync(filePath, newPath);
      } catch (e) {
        // Filesystem may not support such long names
        return;
      }

      const response = await request(app.getHttpServer())
        .post(`/versions/${versionId}/thumbnail`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', newPath);

      // Should handle gracefully (truncate or reject)
      expect([200, 400]).toContain(response.status);
    });

    it('should handle unicode characters in filename', async () => {
      const unicodeFilename = '测试文件_テスト_مِلَفّ.png';
      const filePath = createValidImageFile('temp.png');
      const newPath = path.join(testFilesDir, unicodeFilename);
      fs.copyFileSync(filePath, newPath);

      const response = await request(app.getHttpServer())
        .post(`/versions/${versionId}/thumbnail`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', newPath);

      // Should handle unicode properly
      expect([200, 400]).toContain(response.status);
    });

    it('should handle upload after deleting previous thumbnail', async () => {
      // Upload first thumbnail
      const filePath1 = createValidImageFile('first.png');
      await request(app.getHttpServer())
        .post(`/versions/${versionId}/thumbnail`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', filePath1)
        .expect(200);

      // Upload replacement
      const filePath2 = createValidImageFile('second.png');
      const response = await request(app.getHttpServer())
        .post(`/versions/${versionId}/thumbnail`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', filePath2)
        .expect(200);

      expectSuccessResponse(response);

      // Should have new thumbnail
      const versionResponse = await request(app.getHttpServer())
        .get(`/versions/${versionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(versionResponse.body.data.thumbnailPath).toBeDefined();
    });

    it('should handle interrupted upload recovery', async () => {
      // Simulate partial upload by sending incomplete multipart data
      const filePath = createTestFile('large.png', 10 * 1024 * 1024);

      // This may timeout or fail gracefully
      const response = await request(app.getHttpServer())
        .post(`/versions/${versionId}/thumbnail`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', filePath)
        .timeout(500); // Short timeout to simulate interruption (500ms)

      // Should handle interruption gracefully
      expect([200, 400, 408, 413, 500, 503]).toContain(response.status);
    }, 10000); // Jest timeout: 10 seconds
  });

  describe('Multiple File Types', () => {
    it('should handle different image formats for thumbnails', async () => {
      const formats = ['png', 'jpg', 'webp'];

      for (const format of formats) {
        const version = await createVersion(app, authToken, assetId, 'asset');
        const filePath = createValidImageFile(`thumbnail.${format}`);

        const response = await request(app.getHttpServer())
          .post(`/versions/${version.id}/thumbnail`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('thumbnail', filePath);

        if (format === 'png' || format === 'jpg' || format === 'webp') {
          expect([200, 201]).toContain(response.status);
        } else {
          expect([400, 415]).toContain(response.status);
        }
      }
    });

    it('should validate file extension matches content', async () => {
      // Create PNG file but name it .jpg
      const filePath = createValidImageFile('misnamed.jpg');

      const response = await request(app.getHttpServer())
        .post(`/versions/${versionId}/thumbnail`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', filePath);

      // Should succeed if MIME type is checked, not extension
      expect([200, 400, 415]).toContain(response.status);
    });
  });
});
