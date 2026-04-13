/**
 * lrcToVtt.ts
 * -----------
 * Convierte el contenido de un fichero LRC a formato WEBVTT.
 *
 * Modos de conversión:
 *  - "auto"   → detecta automáticamente si el LRC usa el patrón pareado
 *  - "paired" → líneas text + vacía, la vacía marca el end_time
 *  - "simple" → conversión clásica, el end_time es el start del cue siguiente
 */

export type LrcMode = "auto" | "paired" | "simple";

interface LrcMeta {
    ti?: string; // título
    ar?: string; // artista
    by?: string; // creador del fichero
    [key: string]: string | undefined;
}

interface LrcCue {
    timestamp: string; // e.g. "[00:02.45]"
    text: string;      // vacío "" si es línea de fin en modo pareado
}

interface VttCue {
    start: string; // HH:MM:SS.mmm
    end: string;   // HH:MM:SS.mmm
    text: string;
}

// ─── Duración por defecto para el último cue (segundos) ───────────────────────
const DEFAULT_CUE_DURATION_S = 3;

// ─── Regex ────────────────────────────────────────────────────────────────────
const LRC_TS_RE = /^\[(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?)\](.*)/;
const LRC_META_RE = /^\[([a-zA-Z]+):(.+)\]/;

// ─── Utilidades de tiempo ─────────────────────────────────────────────────────

/** Convierte "[MM:SS.xx]" o "[HH:MM:SS.xx]" → "HH:MM:SS.mmm" */
function lrcTsToVtt(lrcTs: string): string {
    const raw = lrcTs.replace(/[\[\]]/g, "");
    const [main, fracRaw = "00"] = raw.split(".");
    const frac = (fracRaw + "000").slice(0, 3);
    const parts = main.split(":");

    let h: number, m: number, s: number;
    if (parts.length === 2) {
        [h, m, s] = [0, parseInt(parts[0]), parseInt(parts[1])];
    } else {
        [h, m, s] = parts.map(Number);
    }
    return `${pad(h)}:${pad(m)}:${pad(s)}.${frac}`;
}

/** Convierte segundos (float) → "HH:MM:SS.mmm" */
function secondsToVtt(total: number): string {
    const ms = Math.round((total % 1) * 1000);
    const tot = Math.floor(total);
    const h = Math.floor(tot / 3600);
    const m = Math.floor((tot % 3600) / 60);
    const s = tot % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}.${String(ms).padStart(3, "0")}`;
}

/** Convierte "HH:MM:SS.mmm" → segundos float */
function vttTsToSeconds(ts: string): number {
    const [hm, rest] = [ts.slice(0, 5), ts.slice(6)];
    const [h, m] = hm.split(":").map(Number);
    const [s, ms = 0] = rest.split(".").map(Number);
    return h * 3600 + m * 60 + s + ms / 1000;
}

function pad(n: number): string {
    return String(n).padStart(2, "0");
}

// ─── Parseo LRC ───────────────────────────────────────────────────────────────

function parseLrc(content: string): { meta: LrcMeta; cues: LrcCue[] } {
    const meta: LrcMeta = {};
    const cues: LrcCue[] = [];

    for (const raw of content.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line) continue;

        const mTs = LRC_TS_RE.exec(line);
        if (mTs) {
            cues.push({ timestamp: `[${mTs[1]}]`, text: mTs[2].trim() });
            continue;
        }

        const mMeta = LRC_META_RE.exec(line);
        if (mMeta) {
            meta[mMeta[1].toLowerCase()] = mMeta[2].trim();
        }
    }

    return { meta, cues };
}

// ─── Detección de modo ────────────────────────────────────────────────────────

function isPaired(cues: LrcCue[]): boolean {
    const emptyCount = cues.filter(c => c.text === "").length;
    const textCount = cues.filter(c => c.text !== "").length;
    if (textCount === 0) return false;
    return emptyCount / textCount >= 0.4;
}

// ─── Construcción del VTT ─────────────────────────────────────────────────────

function buildVtt(cues: VttCue[]): string {
    const lines: string[] = ["WEBVTT", ""];

    for (const { start, end, text } of cues) {
        lines.push(`${start} --> ${end}`, text, "");
    }

    return lines.join("\n");
}

// ─── Conversión pareada ───────────────────────────────────────────────────────

function convertPaired(cues: LrcCue[]): string {
    const vttCues: VttCue[] = [];
    let pendingStart: string | null = null;
    let pendingText: string | null = null;

    for (const { timestamp, text } of cues) {
        if (text) {
            pendingStart = timestamp;
            pendingText = text;
        } else if (pendingText !== null && pendingStart !== null) {
            vttCues.push({
                start: lrcTsToVtt(pendingStart),
                end: lrcTsToVtt(timestamp),
                text: pendingText,
            });
            pendingStart = null;
            pendingText = null;
        }
    }

    // Último cue sin end_time explícito
    if (pendingText !== null && pendingStart !== null) {
        const startSecs = vttTsToSeconds(lrcTsToVtt(pendingStart));
        vttCues.push({
            start: lrcTsToVtt(pendingStart),
            end: secondsToVtt(startSecs + DEFAULT_CUE_DURATION_S),
            text: pendingText,
        });
    }

    return buildVtt(vttCues);
}

// ─── Conversión simple ────────────────────────────────────────────────────────

function convertSimple(cues: LrcCue[]): string {
    const textCues = cues.filter(c => c.text !== "");
    const vttCues: VttCue[] = textCues.map(({ timestamp, text }, i) => {
        const start = lrcTsToVtt(timestamp);
        const end = i + 1 < textCues.length
            ? lrcTsToVtt(textCues[i + 1].timestamp)
            : secondsToVtt(vttTsToSeconds(start) + DEFAULT_CUE_DURATION_S);
        return { start, end, text };
    });

    return buildVtt(vttCues);
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Convierte el contenido de un fichero LRC a formato WEBVTT.
 *
 * @param lrcContent  - Texto completo del fichero .lrc
 * @param mode        - "auto" (default) | "paired" | "simple"
 * @returns Texto WEBVTT listo para guardar como .vtt
 */
export function lrcToVtt(lrcContent: string, mode: LrcMode = "auto"): string {
    const { cues } = parseLrc(lrcContent);

    const resolved: Exclude<LrcMode, "auto"> =
        mode !== "auto"
            ? mode
            : isPaired(cues) ? "paired" : "simple";

    return resolved === "paired"
        ? convertPaired(cues)
        : convertSimple(cues);
}