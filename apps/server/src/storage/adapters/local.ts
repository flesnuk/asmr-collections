import type { BunFile } from 'bun';
import type { LocalStorageConfig } from '@asmr-collections/shared';

import type { FileResult, FileStat, StorageAdapterBase } from '~/types/storage/adapters';

import * as p from 'node:path';
import * as fs from 'node:fs/promises';

import { STORAGE_TYPES, withoutTrailingSlash } from '@asmr-collections/shared';

import { resolveSecurePath } from '../utils';

export class LocalStorageAdapter implements StorageAdapterBase<'local'> {
  readonly id: number;
  readonly name: string;
  readonly type = STORAGE_TYPES.LOCAL;
  readonly baseDir: string;

  constructor(_id: number, _name: string, config: LocalStorageConfig) {
    this.id = _id;
    this.name = _name;
    this.baseDir = config.path;
  }

  resolvePath(path?: string): string {
    if (!path || path === '/') return withoutTrailingSlash(this.baseDir);
    return resolveSecurePath(this.baseDir, path);
  }

  static readonly test = async (config: LocalStorageConfig): Promise<boolean> => {
    try {
      await fs.access(config.path, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch (e) {
      console.error(`本地存储检测连接失败 ${config.path}`, e);
      return false;
    }
  };

  async test(): Promise<boolean> {
    try {
      await fs.access(this.baseDir, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch (e) {
      console.error(`本地存储检测连接失败 ${this.baseDir}`, e);
      return false;
    }
  }

  async findActualRelativePath(userPath: string): Promise<string> {
    const segments = userPath.split('/').filter(Boolean);
    if (segments.length === 0) return '';

    const firstSegment = segments[0];

    if (firstSegment.startsWith('RJ')) {
      try {
        await fs.access(this.resolvePath(userPath));
        return userPath;
      } catch {
        try {
          const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
          const matches = entries.filter((e: any) => e.isDirectory() && e.name.startsWith(firstSegment));
          
          for (const match of matches) {
            const candidateSegments = [...segments];
            candidateSegments[0] = match.name;
            const candidatePath = candidateSegments.join('/');
            
            try {
              await fs.access(this.resolvePath(candidatePath));
              return candidatePath;
            } catch {
              // try next candidate
            }
          }
          
          // Fallback if none completely exists
          if (matches.length > 0) {
            const candidateSegments = [...segments];
            candidateSegments[0] = matches[0].name;
            return candidateSegments.join('/');
          }
        } catch {
          // ignore
        }
      }
    }

    return userPath;
  }

  async exists(path: string): Promise<boolean> {
    try {
      const actualPath = await this.findActualRelativePath(path);
      await fs.access(this.resolvePath(actualPath));
      return true;
    } catch {
      return false;
    }
  }

  async readdir(path?: string): Promise<FileStat[]> {
    const actualPath = path ? await this.findActualRelativePath(path) : '';
    const entries = await fs.readdir(this.resolvePath(actualPath), { withFileTypes: true });

    return entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
      realpath: actualPath
    }));
  }

  file(path: string): FileResult<'local'> {
    console.log("file", path);
    const file = Bun.file(this.resolvePath(path));

    function chunk(begin = 0, end?: number): BunFile {
      if (begin === 0 && end === undefined)
        return file;

      // 206 的 end 要 size - 1，但 slice 如果 -1 会丢失最后一个字节，所以这里 +1
      const _end = typeof end === 'number' ? end + 1 : undefined;
      return file.slice(begin, _end);
    }

    return {
      size: file.size,
      type: file.type,
      name: p.basename(path),
      path: this.resolvePath(path),
      lastModified: file.lastModified,
      raw: file,
      chunk,
      stream: (begin, end) => chunk(begin, end).stream()
    };
  }
}
