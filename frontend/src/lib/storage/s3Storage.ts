import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

// S3/MinIO storage adapter for production
export class S3Storage {
  private s3Client: S3Client;
  private bucket: string;
  private basePath: string;

  constructor() {
    // Use environment variables for configuration
    const endpoint = process.env.S3_ENDPOINT || 'http://192.168.1.226:9768';
    const region = process.env.S3_REGION || 'us-east-1';
    this.bucket = process.env.S3_BUCKET || 'mirai';
    this.basePath = process.env.S3_BASE_PATH || 'data';

    // SECURITY: Never hardcode credentials in source code!
    // These MUST be provided via environment variables
    if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
      throw new Error(
        'S3_ACCESS_KEY and S3_SECRET_KEY environment variables are required. ' +
        'Never hardcode credentials in source code!'
      );
    }

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  // Read a JSON file from S3/MinIO
  async readJSON(key: string): Promise<any> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: `${this.basePath}/${key}`,
      });

      const response = await this.s3Client.send(command);
      const str = await this.streamToString(response.Body as Readable);
      return JSON.parse(str);
    } catch (error) {
      console.error(`Error reading from S3: ${key}`, error);
      throw error;
    }
  }

  // Write a JSON file to S3/MinIO
  async writeJSON(key: string, data: any): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: `${this.basePath}/${key}`,
        Body: JSON.stringify(data, null, 2),
        ContentType: 'application/json',
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error(`Error writing to S3: ${key}`, error);
      throw error;
    }
  }

  // List files in a directory
  async listFiles(prefix: string): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: `${this.basePath}/${prefix}`,
      });

      const response = await this.s3Client.send(command);
      return (response.Contents || [])
        .map(item => item.Key || '')
        .filter(key => key.endsWith('.json'));
    } catch (error) {
      console.error(`Error listing S3 files: ${prefix}`, error);
      throw error;
    }
  }

  // Helper to convert stream to string
  private async streamToString(stream: Readable): Promise<string> {
    const chunks: any[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
  }
}

// Export a singleton instance
export const s3Storage = new S3Storage();