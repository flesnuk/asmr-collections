/* eslint-disable no-await-in-loop -- sequential VTT translation */

import type { SSEStreamingApi } from 'hono/streaming';
import type { BatchSendEventFn, BatchSSEEvent, BatchSSEEvents } from '@asmr-collections/shared';

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

import { z } from 'zod';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

import { getPrisma } from '~/lib/db';
import { fetcher } from '~/lib/fetcher';
import { zValidator } from '~/lib/validator';
import { formatError, formatMessage } from '~/router/utils';
import { lrcToVtt } from './lrc-to-vtt';
import { translateVTT } from '~/ai/vtt-translator';
import type { VTTTranslatorConfig } from '~/ai/vtt-translator';

// ── Types for asmr.one API responses ─────────────────────────────────────────

interface AsmrOneEdition {
  id: number;
  lang: string;
  title: string;
  source_id: string;
  is_original: boolean;
  source_type: string;
}

interface AsmrOneWorkInfo {
  id: number;
  title: string;
  other_language_editions_in_db: AsmrOneEdition[];
}

interface AsmrOneTrackItem {
  type: 'folder' | 'audio' | 'image' | 'text' | 'other';
  title: string;
  children?: AsmrOneTrackItem[];
  mediaStreamUrl?: string;
  mediaDownloadUrl?: string;
  duration?: number;
}

// ── VTT translation config from env vars ───────────────────────────────────

function getVTTConfig(sourceLang: string): VTTTranslatorConfig {
  return {
    apiUrl: process.env.VTT_API_URL || 'https://openrouter.ai/api/v1/chat/completions',
    typeApi: (process.env.VTT_API_TYPE as 'local' | 'openai') || 'openai',
    modelName: process.env.VTT_MODEL_NAME || 'google/gemini-2.0-flash-001',
    apiKey: process.env.OPENAI_API_KEY || '',
    sourceLang,
    targetLang: 'english',
    batchSize: Number(process.env.VTT_BATCH_SIZE) || 30,
    audioContext: process.env.VTT_AUDIO_CONTEXT || undefined,
    initialTemperature: Number(process.env.VTT_INITIAL_TEMPERATURE) || 0.7,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function createSendEvent(stream: SSEStreamingApi): BatchSendEventFn {
  return async <K extends BatchSSEEvent>(
    event: K,
    data: BatchSSEEvents[K]
  ) => {
    try {
      await stream.writeSSE({
        id: randomUUID(),
        event,
        data: JSON.stringify(data)
      });
    } catch (e) {
      console.warn('VTT SSE write failed', e);
    }
  };
}

const ASMR_ONE_API = 'https://api.asmr.one';

function stripRJ(id: string): string {
  return id.replace(/^RJ/i, '');
}

/** Recursively find a folder in the track tree by path segments */
function findFolder(tracks: AsmrOneTrackItem[], folderPath: string[]): AsmrOneTrackItem[] | null {
  if (folderPath.length === 0) return tracks;

  const [head, ...rest] = folderPath;
  const folder = tracks.find(t => t.type === 'folder' && t.title === head);
  if (!folder?.children) return null;

  return findFolder(folder.children, rest);
}

/** Collect all .vtt and .lrc files from a track list (non-recursive, flat in folder) */
function collectSubFiles(items: AsmrOneTrackItem[]): AsmrOneTrackItem[] {
  return items.filter(
    item => item.type === 'text' && (item.title.toLowerCase().endsWith('.vtt') || item.title.toLowerCase().endsWith('.lrc'))
  );
}

/** Download a file from a URL and return its text content */
async function downloadVttContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) throw new Error(`Failed to download VTT: ${res.status} ${res.statusText}`);
  return res.text();
}

// ── Route ────────────────────────────────────────────────────────────────────

export const vttTranslateApp = new Hono();

// ── Step 1: Resolve Chinese edition & fetch tracks ───────────────────────────

const resolveSchema = z.object({
  workId: z.string()
});

vttTranslateApp.post('/vtt-translate/resolve', zValidator('json', resolveSchema), async c => {
  const { workId } = c.req.valid('json');

  try {
    const numericId = stripRJ(workId);

    // Fetch work info from asmr.one
    const workInfo = await fetcher<AsmrOneWorkInfo>(
      `${ASMR_ONE_API}/api/workInfo/${numericId}`
    );

    const editions = workInfo.other_language_editions_in_db || [];

    // Priority: 简体中文 > 繁體中文
    let chosen = editions.find(e => e.lang === '简体中文');
    if (!chosen) chosen = editions.find(e => e.lang === '繁體中文');

    if (!chosen) {
      return c.json(formatMessage('No Chinese edition found in asmr.one'), 404);
    }

    const sourceLang = chosen.lang === '简体中文' ? 'Simplified Chinese' : 'Traditional Chinese';
    const sourceId = chosen.source_id;

    // Write source_lang.txt
    const tmpDir = `/tmp/${sourceId}`;
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, 'source_lang.txt'), sourceLang, 'utf-8');

    // Fetch tracks for the Chinese edition
    const sourceNumericId = stripRJ(sourceId);
    const tracks = await fetcher<AsmrOneTrackItem[]>(
      `${ASMR_ONE_API}/api/tracks/${sourceNumericId}?v=2`
    );

    return c.json({
      sourceId,
      lang: sourceLang,
      title: chosen.title,
      tracks
    });
  } catch (e) {
    console.error('VTT resolve failed:', e);
    return c.json(formatError(e), 500);
  }
});

// ── Step 2: Download + Translate via SSE ─────────────────────────────────────

const translateSchema = z.object({
  sourceId: z.string(),
  folder: z.string(), // JSON-encoded string[] of folder path segments
  workId: z.string()  // original work ID to upload subtitles to
});

vttTranslateApp.get('/vtt-translate/translate', zValidator('query', translateSchema), c => {
  const { sourceId, folder: folderJson, workId } = c.req.valid('query');

  c.req.raw.signal.addEventListener('abort', () => {
    console.warn('VTT translate: client disconnected');
  });

  return streamSSE(c, async stream => {
    const sendEvent = createSendEvent(stream);

    // Keepalive ping to prevent proxy/browser timeout drops during long translations
    const keepaliveInterval = setInterval(() => {
      // @ts-ignore - custom event not in BatchSSEEvents but ignored by frontend client
      stream.writeSSE({ event: 'ping', data: '1' }).catch(() => { });
    }, 15000);

    try {
      // Parse folder path
      let folderPath: string[];
      try {
        folderPath = JSON.parse(folderJson) as string[];
      } catch {
        await sendEvent('error', { message: 'Invalid folder path', details: 'Could not parse folder JSON' });
        return;
      }

      // Read source lang
      const tmpDir = `/tmp/${sourceId}`;
      mkdirSync(tmpDir, { recursive: true });

      const sourceLangFile = join(tmpDir, 'source_lang.txt');
      if (!existsSync(sourceLangFile)) {
        await sendEvent('error', { message: 'Source language not found', details: 'Run resolve first' });
        return;
      }
      const sourceLang = readFileSync(sourceLangFile, 'utf-8').trim().toLowerCase();

      // Fetch tracks for the source edition
      const sourceNumericId = stripRJ(sourceId);
      await sendEvent('log', { type: 'info', message: `Fetching tracks for ${sourceId}...` });

      const allTracks = await fetcher<AsmrOneTrackItem[]>(
        `${ASMR_ONE_API}/api/tracks/${sourceNumericId}?v=2`
      );

      // Navigate to selected folder
      const folderItems = findFolder(allTracks, folderPath);
      if (!folderItems) {
        await sendEvent('error', { message: 'Folder not found', details: `Could not find path: ${folderPath.join('/')}` });
        return;
      }

      // Collect subtitle files
      let vttFiles = collectSubFiles(folderItems);
      const hasVtt = vttFiles.some(f => f.title.toLowerCase().endsWith('.vtt'));
      const hasLrc = vttFiles.some(f => f.title.toLowerCase().endsWith('.lrc'));
      if (hasVtt && hasLrc) {
        vttFiles = vttFiles.filter(f => !f.title.toLowerCase().endsWith('.lrc'));
        await sendEvent('log', { type: 'info', message: 'ℹ️ Found both VTT and LRC files. Ignoring LRC files.' });
      }
      if (vttFiles.length === 0) {
        await sendEvent('error', { message: 'No subtitle files found', details: 'Selected folder contains no .vtt or .lrc files' });
        return;
      }

      const totalFiles = vttFiles.length;
      await sendEvent('start', { total: totalFiles, message: `Found ${totalFiles} subtitle file(s) to process` });

      let processedCount = 0;
      let skippedCount = 0;
      let translatedCount = 0;
      const translatedFiles: string[] = [];

      const prisma = getPrisma();
      const workData = await prisma.work.findUnique({
        where: { id: workId },
        select: { name: true, intro: true }
      });

      for (const vttTrack of vttFiles) {
        if (c.req.raw.signal.aborted) {
          await sendEvent('log', { type: 'warning', message: 'Operation cancelled by user' });
          break;
        }

        const vttName = vttTrack.title;
        const enVttName = vttName.replace(/\.(vtt|lrc)$/i, '.en.vtt');
        const enVttPath = join(tmpDir, enVttName);
        const originalVttPath = join(tmpDir, vttName);

        // Check if already translated
        if (existsSync(enVttPath)) {
          skippedCount++;
          processedCount++;
          translatedFiles.push(enVttPath);
          await sendEvent('log', { type: 'info', message: `⏭️ Skipping ${vttName} (already translated)` });
          await sendEvent('progress', {
            current: processedCount,
            total: totalFiles,
            percent: Math.round((processedCount / totalFiles) * 100)
          });
          continue;
        }

        // Download VTT
        const downloadUrl = vttTrack.mediaDownloadUrl;
        if (!downloadUrl) {
          await sendEvent('log', { type: 'warning', message: `⚠️ No download URL for ${vttName}, skipping` });
          processedCount++;
          await sendEvent('progress', {
            current: processedCount,
            total: totalFiles,
            percent: Math.round((processedCount / totalFiles) * 100)
          });
          continue;
        }

        await sendEvent('log', { type: 'info', message: `📥 Downloading ${vttName}...` });

        let vttContent: string;
        try {
          // The mediaDownloadUrl from asmr.one is relative, prepend the API host
          const fullUrl = downloadUrl.startsWith('http')
            ? downloadUrl
            : `${ASMR_ONE_API}${downloadUrl}`;
          let rawContent = await downloadVttContent(fullUrl);
          writeFileSync(originalVttPath, rawContent, 'utf-8');
          await sendEvent('log', { type: 'info', message: `✅ Downloaded ${vttName}` });

          if (vttName.toLowerCase().endsWith('.lrc')) {
            vttContent = lrcToVtt(rawContent);
            await sendEvent('log', { type: 'info', message: `✅ Converted LRC to VTT format` });
          } else {
            vttContent = rawContent;
          }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          await sendEvent('log', { type: 'error', message: `❌ Failed to download ${vttName}: ${errMsg}` });
          processedCount++;
          await sendEvent('progress', {
            current: processedCount,
            total: totalFiles,
            percent: Math.round((processedCount / totalFiles) * 100)
          });
          continue;
        }

        // Translate VTT
        if (c.req.raw.signal.aborted) break;

        await sendEvent('log', { type: 'info', message: `🔄 Translating ${vttName}...` });

        try {
          const config = getVTTConfig(sourceLang);
          if (workData) {
            const contextParts: string[] = [];
            if (config.audioContext) contextParts.push(config.audioContext);
            if (workData.name) contextParts.push(`Work Title: ${workData.name}`);
            if (workData.intro) {
              // Strip simple HTML tags if there are any
              const cleanIntro = workData.intro.replace(/<[^>]*>?/gm, '');
              contextParts.push(`Work Intro: ${cleanIntro}`);
            }
            if (contextParts.length > 0) {
              config.audioContext = contextParts.join('\n');
            }
          }
          const translated = await translateVTT(vttContent, config, async (msg) => {
            await sendEvent('log', { type: 'info', message: `  [${vttName}] ${msg}` });
          });

          writeFileSync(enVttPath, translated, 'utf-8');
          translatedFiles.push(enVttPath);
          translatedCount++;
          await sendEvent('log', { type: 'info', message: `✅ Translated ${vttName} → ${enVttName}` });
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          await sendEvent('log', { type: 'error', message: `❌ Translation failed for ${vttName}: ${errMsg}` });
        }

        processedCount++;
        await sendEvent('progress', {
          current: processedCount,
          total: totalFiles,
          percent: Math.round((processedCount / totalFiles) * 100)
        });
      }

      if (c.req.raw.signal.aborted) {
        await sendEvent('end', {
          message: `Cancelled. Translated: ${translatedCount}, Skipped: ${skippedCount}`
        });
        return;
      }

      // Zip and upload
      if (translatedFiles.length > 0) {
        await sendEvent('log', { type: 'info', message: '📦 Creating ZIP archive...' });

        const zipPath = join(tmpDir, 'subtitles.zip');
        try {
          // Build zip with only the .en.vtt files
          const fileArgs = translatedFiles
            .map(f => `"${f.replace(tmpDir + '/', '')}"`)
            .join(' ');
          execSync(`cd "${tmpDir}" && zip -j "${zipPath}" ${fileArgs}`, { stdio: 'pipe' });

          await sendEvent('log', { type: 'info', message: '📤 Uploading subtitles...' });

          // Upload to the subtitles API via prisma
          const zipBuffer = readFileSync(zipPath);

          const workExists = await prisma.work.findUnique({
            where: { id: workId },
            select: { id: true }
          });

          if (!workExists) {
            await sendEvent('log', { type: 'warning', message: `⚠️ Work ${workId} not found in database, skipping upload` });
          } else {
            await prisma.work.update({
              where: { id: workId },
              data: {
                subtitles: true,
                subtitlesData: {
                  upsert: {
                    create: { data: zipBuffer },
                    update: { data: zipBuffer }
                  }
                }
              }
            });
            await sendEvent('log', { type: 'info', message: `✅ Subtitles uploaded for ${workId}` });
          }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          await sendEvent('log', { type: 'error', message: `❌ ZIP/Upload failed: ${errMsg}` });
        }
      }

      await sendEvent('end', {
        message: `Done! Translated: ${translatedCount}, Skipped: ${skippedCount}, Total: ${totalFiles}`
      });
    } catch (e) {
      console.error('VTT translate SSE failed:', e);
      const errMsg = e instanceof Error ? e.message : String(e);
      await sendEvent('log', { type: 'error', message: `Fatal error: ${errMsg}` });
      await sendEvent('error', {
        message: 'VTT translation failed',
        details: errMsg
      });
    } finally {
      clearInterval(keepaliveInterval);
    }
  });
});
