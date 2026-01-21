import type { IFuseOptions } from 'fuse.js';

import type { SubtitleInfo, Tracks } from '../types';

import Fuse from 'fuse.js';

import { millisecondsToHours } from 'date-fns/millisecondsToHours';
import { millisecondsToMinutes } from 'date-fns/millisecondsToMinutes';
import { millisecondsToSeconds } from 'date-fns/millisecondsToSeconds';
import { configure, Uint8ArrayReader, Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js';

import { extname } from '../utils';

export class SubtitleMatcher {
  private readonly fuses: Array<Fuse<SubtitleInfo>>;
  private readonly fallbackFuse: Fuse<SubtitleInfo>;
  private readonly earlyExitScore: number;

  constructor(
    subtitles: SubtitleInfo[][],
    options?: IFuseOptions<SubtitleInfo>,
    earlyExitScore = 0.2
  ) {
    const fuseOptions = {
      keys: ['title'],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
      ...options
    };

    this.earlyExitScore = earlyExitScore;

    this.fuses = subtitles.map(group => new Fuse(group, fuseOptions));
    this.fallbackFuse = new Fuse(subtitles.flat(), { ...fuseOptions, threshold: 1 });
  }

  find(trackTitle: string, scoreThreshold = 0.4): SubtitleInfo | undefined {
    let resultItem: { item: SubtitleInfo, score: number } | undefined;

    for (const fuse of this.fuses) {
      const results = fuse.search(trackTitle);
      const result = results.at(0);

      if (
        result?.score !== undefined
        && result.score <= scoreThreshold
        && (!resultItem || result.score < resultItem.score)
      ) {
        if (result.score <= this.earlyExitScore)
          return result.item;

        resultItem = { item: result.item, score: result.score };
      }
    }

    // fallback
    if (!resultItem) {
      const results = this.fallbackFuse.search(trackTitle);
      const result = results.at(0);
      if (result?.score !== undefined)
        return result.item;
    }

    return resultItem?.item;
  }
}

/**
 * 收集字幕文件
 * @param data - 轨道数据
 * @param recursive - 是否递归收集子目录的字幕文件,默认为 false
 * @returns 字幕信息数组
 */
export function collectSubtitles(data: Tracks | undefined | null, recursive = false): SubtitleInfo[] {
  if (!data) return [];

  const subtitles: SubtitleInfo[] = [];
  const supportedExtensions = new Set(['srt', 'lrc', 'vtt']);

  function processItem(item: Tracks[number]) {
    const ext = extname(item.title).toLowerCase() as 'vtt' | 'srt' | 'lrc';
    const type = ext === 'lrc' ? 'vtt' : ext;

    if (item.type === 'text' && supportedExtensions.has(ext)) {
      const url = item.mediaDownloadUrl;
      if (url) {
        subtitles.push({
          title: item.title,
          type,
          url
        });
      }
    }
  }

  function traverse(items: Tracks) {
    for (const item of items) {
      processItem(item);
      if (recursive && item.children)
        traverse(item.children);
    }
  }

  traverse(data);
  return subtitles;
}

/**
 * 获取数据库中的字幕文件
 */
configure({ useWebWorkers: false });
export async function readerZipFileSubtitles(data: Uint8Array<ArrayBuffer>): Promise<SubtitleInfo[]> {
  const zipReader = new ZipReader(new Uint8ArrayReader(data));

  const subtitles: SubtitleInfo[] = [];
  const supportedExtensions = new Set(['srt', 'lrc', 'vtt']);

  for await (const entry of zipReader.getEntriesGenerator()) {
    if (entry.directory) continue;

    let filename = decodeText(entry.rawFilename);
    const ext = extname(filename) as 'vtt' | 'srt' | 'lrc';
    const type = ext === 'lrc' ? 'vtt' : ext;

    filename = filename.split('/').pop() || filename;

    const content = await entry.getData(new Uint8ArrayWriter());

    if (supportedExtensions.has(ext)) {
      let c = decodeText(content);
      if (ext === 'lrc')
        c = lrcToVtt(c);

      subtitles.push({ title: filename, content: c, type });
    }
  }

  await zipReader.close();
  return subtitles;
}

export function decodeText(data: ArrayBuffer | Uint8Array): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- bun 的类型还没更新 https://github.com/oven-sh/bun/pull/21835
  const encodings = ['utf-8', 'gbk', 'gb18030'/* , 'gb2312' */] as any; // 'gb2312' 未支持

  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: true });
      const text = decoder.decode(data);
      // 检查是否有乱码(包含大量替换字符)
      const replacementCharCount = (text.match(/�/g) || []).length;
      if (replacementCharCount / text.length < 0.1)
        return text;
    } catch {
      continue;
    }
  }

  return new TextDecoder('utf-8').decode(data);
}

function formatDuration(ms: number): string {
  const h = millisecondsToHours(ms);
  const m = millisecondsToMinutes(ms) % 60; // 取模，只保留不满1小时的分钟数
  const s = millisecondsToSeconds(ms) % 60; // 取模，只保留不满1分钟的秒数
  const mill = ms % 1000;

  // WebVTT 标准格式: HH:MM:SS.mmm
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(mill).padStart(3, '0')}`;
}

export function lrcToVtt(text: string): string {
  // LRC 转 VTT
  const lines = text.split('\n');
  const vttLines = ['WEBVTT\n'];

  const matchReg = /\[(\d+):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?]/;

  // 2. 预处理：将 LRC 解析为 { totalMs, content } 结构
  const parsedLines = lines.reduce<Array<{ totalMs: number, content: string }>>((acc, line) => {
    const match = matchReg.exec(line);

    // 如果正则不匹配，直接返回当前累加结果（相当于 filter 掉）
    if (!match) return acc;

    const content = line.replace(match[0], '').trim();

    // 如果没有内容，也跳过
    if (!content) return acc;

    // 两种格式: mm:ss(.ms) 或 hh:mm:ss(.ms)。有第三段时第一段视为小时，否则视为分钟。
    const hasHourSegment = match.at(3) !== undefined;
    const hours = hasHourSegment ? Number.parseInt(match[1], 10) : 0;
    const minutes = hasHourSegment ? Number.parseInt(match[2], 10) : Number.parseInt(match[1], 10);
    const seconds = Number.parseInt(match[hasHourSegment ? 3 : 2], 10);
    const milliseconds = match[4]
      ? Number.parseInt(match[4].padEnd(3, '0'), 10)
      : 0;

    const totalMs = hours * 60 * 60 * 1000 + minutes * 60 * 1000 + seconds * 1000 + milliseconds;

    // 将有效结果推入数组
    acc.push({ totalMs, content });
    return acc;
  }, []);

  // 4. 生成 VTT 内容
  for (let i = 0; i < parsedLines.length; i++) {
    const current = parsedLines.at(i);
    const next = parsedLines.at(i + 1);

    if (!current) continue;

    const startTime = formatDuration(current.totalMs);
    let endTime: string;

    if (next)
      endTime = formatDuration(next.totalMs);
    else
      endTime = formatDuration(current.totalMs + 5000);

    vttLines.push(`${startTime} --> ${endTime}\n${current.content}\n`);
  }

  return vttLines.join('\n');
}
