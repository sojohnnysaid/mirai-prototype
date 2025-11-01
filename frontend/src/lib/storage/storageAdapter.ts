import fs from 'fs/promises';
import path from 'path';
import { s3Storage } from './s3Storage';

// Storage adapter interface
export interface IStorageAdapter {
  readJSON(filePath: string): Promise<any>;
  writeJSON(filePath: string, data: any): Promise<void>;
  listFiles(directory: string): Promise<string[]>;
  ensureDirectory(directory: string): Promise<void>;
}

// Local filesystem storage adapter
class LocalStorageAdapter implements IStorageAdapter {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async readJSON(filePath: string): Promise<any> {
    const fullPath = path.join(this.basePath, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(content);
  }

  async writeJSON(filePath: string, data: any): Promise<void> {
    const fullPath = path.join(this.basePath, filePath);
    await this.ensureDirectory(path.dirname(fullPath));
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
  }

  async listFiles(directory: string): Promise<string[]> {
    const fullPath = path.join(this.basePath, directory);
    try {
      const files = await fs.readdir(fullPath);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      return [];
    }
  }

  async ensureDirectory(directory: string): Promise<void> {
    const fullPath = path.join(this.basePath, directory);
    await fs.mkdir(fullPath, { recursive: true });
  }
}

// S3/MinIO storage adapter
class S3StorageAdapter implements IStorageAdapter {
  async readJSON(filePath: string): Promise<any> {
    return s3Storage.readJSON(filePath);
  }

  async writeJSON(filePath: string, data: any): Promise<void> {
    return s3Storage.writeJSON(filePath, data);
  }

  async listFiles(directory: string): Promise<string[]> {
    const files = await s3Storage.listFiles(directory);
    return files.map(file => path.basename(file));
  }

  async ensureDirectory(directory: string): Promise<void> {
    // S3 doesn't need explicit directory creation
    return;
  }
}

// Factory function to get the appropriate storage adapter
export function getStorageAdapter(): IStorageAdapter {
  const useS3 = process.env.USE_S3_STORAGE === 'true';

  if (useS3) {
    console.log('Using S3/MinIO storage adapter');
    return new S3StorageAdapter();
  } else {
    console.log('Using local filesystem storage adapter');
    const dataDir = path.join(process.cwd(), 'data');
    return new LocalStorageAdapter(dataDir);
  }
}

// Export singleton instance
export const storageAdapter = getStorageAdapter();