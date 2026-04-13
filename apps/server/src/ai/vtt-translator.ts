import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface VTTTranslatorConfig {
    apiUrl: string;
    typeApi: "local" | "openai";
    modelName: string;
    apiKey?: string;
    sourceLang?: string;
    targetLang?: string;
    batchSize?: number;
    maxTokens?: number;
    maxRetries?: number;
    initialTemperature?: number;
    audioContext?: string;
}

interface Subtitle {
    timestamp: string;
    text: string;
}

interface DeduplicatedEntry {
    text: string;
    originalIndex: number;
}

type RepetitionMap = Record<number, number[]>;

export async function translateVTT(
    vttContent: string,
    config: VTTTranslatorConfig,
    onProgress?: (message: string) => void
): Promise<string> {
    const cfg = {
        sourceLang: "auto",
        targetLang: "en",
        batchSize: 30,
        maxTokens: 1300,
        maxRetries: 3,
        initialTemperature: 0.7,
        audioContext: "",
        ...config,
    };

    const log = (msg: string) => onProgress?.(msg);

    const subtitles = parseVTT(vttContent);
    const batches = prepareBatches(subtitles, cfg.maxTokens, cfg.batchSize);
    const allTranslations: string[] = [];
    const totalBatches = batches.length;

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        log(`Translating batch ${i + 1}/${totalBatches} (${batch.length} subtitles)...`);
        const translations = await translateBatchWithRetry(batch, cfg, log);
        allTranslations.push(...translations);
        if (cfg.typeApi !== "local") {
            await sleep(5000);
        }
    }

    let outputContent = "WEBVTT\n\n";
    for (let i = 0; i < subtitles.length; i++) {
        const subtitle = subtitles[i];
        if (i < allTranslations.length) {
            const line = balanceSubtitleLines(allTranslations[i]);
            outputContent += `${subtitle.timestamp}\n${line}\n\n`;
        } else {
            outputContent += `${subtitle.timestamp}\n${subtitle.text}\n\n`;
        }
    }

    return outputContent;
}

// ── Streaming variant ──────────────────────────────────────────────────────────
// Returns a ReadableStream<string> that emits progress lines and ends with a
// special JSON marker: {"__result__": "<translated vtt content>"}
export function translateVTTStream(
    vttContent: string,
    config: VTTTranslatorConfig
): ReadableStream<string> {
    let controller: ReadableStreamDefaultController<string>;

    const stream = new ReadableStream<string>({
        start(c) {
            controller = c;
        },
    });

    (async () => {
        try {
            const result = await translateVTT(vttContent, config, (msg) => {
                controller.enqueue(msg + "\n");
            });
            controller.enqueue(JSON.stringify({ __result__: result }) + "\n");
        } catch (err) {
            controller.enqueue(`ERROR: ${String(err)}\n`);
        } finally {
            controller.close();
        }
    })();

    return stream;
}

// ── Parsing ────────────────────────────────────────────────────────────────────

function parseVTT(vttContent: string): Subtitle[] {
    let content = vttContent.trim();
    if (content.startsWith("WEBVTT")) {
        content = content.slice(content.indexOf("WEBVTT") + 6).trim();
    }

    const blocks = content.split(/\n\s*\n/);
    const subtitles: Subtitle[] = [];

    for (const block of blocks) {
        const lines = block.trim().split("\n");
        if (!lines.length) continue;

        let timestampLine: string | null = null;
        const contentLines: string[] = [];

        for (const line of lines) {
            if (
                !timestampLine &&
                /\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/.test(line)
            ) {
                timestampLine = line;
            } else if (timestampLine) {
                contentLines.push(line);
            }
        }

        if (timestampLine) {
            subtitles.push({
                timestamp: timestampLine,
                text: contentLines.join("\n").trim(),
            });
        }
    }

    return subtitles;
}

// ── Deduplication ──────────────────────────────────────────────────────────────

function deduplicateBatch(
    batch: Subtitle[]
): [DeduplicatedEntry[], RepetitionMap] {
    if (!batch.length) return [[], {}];

    const deduplicated: DeduplicatedEntry[] = [];
    const repetitionMap: RepetitionMap = {};

    let currentText: string | null = null;
    let currentIndices: number[] = [];

    const flush = () => {
        if (currentText === null) return;
        deduplicated.push({ text: currentText, originalIndex: currentIndices[0] });
        repetitionMap[deduplicated.length - 1] = [...currentIndices];
    };

    for (let i = 0; i < batch.length; i++) {
        const subtitle = batch[i];
        if (subtitle.text === currentText) {
            currentIndices.push(i);
        } else {
            flush();
            currentText = subtitle.text;
            currentIndices = [i];
        }
    }
    flush();

    return [deduplicated, repetitionMap];
}

function restoreRepetitions(
    translatedTexts: string[],
    repetitionMap: RepetitionMap,
    originalBatchSize: number
): string[] {
    if (originalBatchSize === translatedTexts.length) return translatedTexts;

    const restored = new Array<string>(originalBatchSize).fill("");

    for (const [dedupIdx, origIndices] of Object.entries(repetitionMap)) {
        const idx = Number(dedupIdx);
        if (idx < translatedTexts.length) {
            const translated = translatedTexts[idx];
            for (const origIdx of origIndices) {
                if (origIdx < originalBatchSize) {
                    restored[origIdx] = translated;
                }
            }
        }
    }

    return restored;
}

// ── Batching ───────────────────────────────────────────────────────────────────

function prepareBatches(
    subtitles: Subtitle[],
    maxTokens: number,
    batchSize: number
): Subtitle[][] {
    const batches: Subtitle[][] = [];
    let currentBatch: Subtitle[] = [];
    let currentTokenCount = 0;

    for (const subtitle of subtitles) {
        const tokenCount = subtitle.text.split(/\s+/).length;

        if (
            currentTokenCount + tokenCount > maxTokens ||
            currentBatch.length >= batchSize
        ) {
            if (currentBatch.length) batches.push(currentBatch);
            currentBatch = [];
            currentTokenCount = 0;
        }

        currentBatch.push(subtitle);
        currentTokenCount += tokenCount;
    }

    if (currentBatch.length) batches.push(currentBatch);
    return batches;
}

// ── Prompt ─────────────────────────────────────────────────────────────────────

async function createTranslationPrompt(
    batch: DeduplicatedEntry[],
    sourceLang: string,
    targetLang: string,
    audioContext: string
): Promise<string> {
    let prompt = `Translate the following subtitles from ${sourceLang} to ${targetLang}. `;
    if (audioContext) prompt += `### [WORK CONTEXT] \n${audioContext} \n\n`;

    if (process.env.VTT_PROMPT) {
        prompt += process.env.VTT_PROMPT + '\n';
    } else {
        const promptFilePath = join(process.cwd(), 'vtt_prompt.txt');
        if (existsSync(promptFilePath)) {
            prompt += await readFile(promptFilePath, 'utf-8') + '\n';
        } else {
            console.warn(`Translation prompt file not found at ${promptFilePath} and VTT_PROMPT env var not set.`);
        }
    }

    for (const subtitle of batch) {
        prompt += "-->\n";
        prompt += `${subtitle.text.replace(/\n/g, " ")}\n\n`;
    }

    return prompt;
}

// ── API call ───────────────────────────────────────────────────────────────────

async function callTranslationAPI(
    prompt: string,
    config: Required<VTTTranslatorConfig>,
    temperature: number
): Promise<string> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (config.apiKey) {
        headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    const payload = {
        model: config.modelName,
        messages: [{ role: "system", content: process.env.VTT_SYSTEM_PROMPT || "You are Qwen, created by Alibaba Cloud. You are a helpful assistant." }, { role: "user", content: prompt }],
        temperature,
        repeat_penalty: 1,
        max_tokens: config.maxTokens,
    };

    const response = await fetch(config.apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(
            `API call failed with status ${response.status}: ${text}`
        );
    }

    const data = await response.json();
    return data.choices[0].message.content as string;
}

function parseTranslationResult(result: string): string[] {
    const parts = result.split(/-->\s*/);
    return parts
        .map((p) => p.trim().replace(/\n/g, ""))
        .filter((p) => p.length > 0);
}

// ── Retry logic ────────────────────────────────────────────────────────────────

async function translateBatchWithRetry(
    batch: Subtitle[],
    config: Required<VTTTranslatorConfig>,
    log: (msg: string) => void
): Promise<string[]> {
    const originalBatchSize = batch.length;
    const [deduplicatedBatch, repetitionMap] = deduplicateBatch(batch);

    if (deduplicatedBatch.length !== originalBatchSize) {
        log(
            `Batch deduplicated: ${originalBatchSize} entries → ${deduplicatedBatch.length} unique entries`
        );
    }

    const temperatures = [config.initialTemperature, 1.0, 0.1, 0.5, 0.0];

    for (let retry = 0; retry < config.maxRetries; retry++) {
        try {
            const temperature = temperatures[Math.min(retry, temperatures.length - 1)];
            const prompt = await createTranslationPrompt(
                deduplicatedBatch,
                config.sourceLang,
                config.targetLang,
                config.audioContext
            );

            const translationResult = await callTranslationAPI(
                prompt,
                config,
                temperature
            );

            const normalizedPrompt = prompt.toLowerCase().replace(/\s+/g, "");
            const normalizedResult = translationResult
                .toLowerCase()
                .replace(/\s+/g, "");

            if (normalizedPrompt === normalizedResult) {
                log(
                    `API returned the original prompt unchanged (attempt ${retry + 1}). Retrying...`
                );
                continue;
            }

            const translations = parseTranslationResult(translationResult);

            if (translations.length === deduplicatedBatch.length) {
                const restored = restoreRepetitions(
                    translations,
                    repetitionMap,
                    originalBatchSize
                );
                if (restored.length === originalBatchSize) return restored;
                log(
                    `Error restoring repetitions: expected ${originalBatchSize}, got ${restored.length}`
                );
            } else {
                log(
                    `Mismatch in translation count (attempt ${retry + 1}): expected ${deduplicatedBatch.length}, got ${translations.length}. Retrying with temperature=${temperatures[Math.min(retry + 1, temperatures.length - 1)]}`
                );
            }

            if (config.typeApi !== "local") await sleep(4000);
        } catch (err) {
            log(
                `Error during translation (attempt ${retry + 1}): ${String(err)}. Retrying...`
            );
            if (config.typeApi !== "local") await sleep(7000);
        }
    }

    log(
        "Batch translation failed after multiple attempts. Falling back to one-by-one translation."
    );
    return translateOneByOne(batch, config, log);
}

async function translateOneByOne(
    batch: Subtitle[],
    config: Required<VTTTranslatorConfig>,
    log: (msg: string) => void
): Promise<string[]> {
    const translations: string[] = [];

    for (const subtitle of batch) {
        const miniBatch: DeduplicatedEntry[] = [
            { text: subtitle.text, originalIndex: 0 },
        ];
        const prompt = await createTranslationPrompt(
            miniBatch,
            config.sourceLang,
            config.targetLang,
            config.audioContext
        );

        let translated = false;

        for (const temperature of [0.6, 1.0, 0.3]) {
            try {
                const result = await callTranslationAPI(prompt, config, temperature);
                const parsed = parseTranslationResult(result);
                if (parsed.length === 1) {
                    translations.push(parsed[0]);
                    translated = true;
                    break;
                }
            } catch (err) {
                log(
                    `Error translating subtitle: ${String(err)}. Trying different temperature...`
                );
                await sleep(1000);
            }
        }

        if (config.typeApi !== "local") await sleep(2000);

        if (!translated) {
            log(
                `Warning: Failed to translate subtitle: '${subtitle.text}'. Using original text.`
            );
            translations.push(subtitle.text);
        }
    }

    return translations;
}

// ── Line balancing ─────────────────────────────────────────────────────────────

function balanceSubtitleLines(text: string, maxLineLength = 50): string {
    if (text.length <= maxLineLength) return text;

    const words = text.split(/\s+/);
    const totalLength =
        words.reduce((sum, w) => sum + w.length, 0) + words.length - 1;
    const lineCount = Math.max(
        2,
        Math.ceil(totalLength / maxLineLength)
    );
    const targetLength = totalLength / lineCount;

    const lines: string[] = [];
    let currentLine: string[] = [];
    let currentLength = 0;

    for (let wi = 0; wi < words.length; wi++) {
        const word = words[wi];
        const newLength =
            currentLength + word.length + (currentLine.length > 0 ? 1 : 0);

        if (currentLine.length > 0 && newLength > targetLength * 1.1) {
            lines.push(currentLine.join(" "));
            currentLine = [word];
            currentLength = word.length;
        } else {
            if (currentLine.length > 0) currentLength += 1;
            currentLine.push(word);
            currentLength += word.length;
        }

        if (lines.length === lineCount - 1 && wi === words.length - 1) {
            lines.push(currentLine.join(" "));
            break;
        }
    }

    if (currentLine.length > 0 && lines.length < lineCount) {
        lines.push(currentLine.join(" "));
    }

    return lines.join("\n");
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}