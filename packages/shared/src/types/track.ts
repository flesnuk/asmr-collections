export type Tracks = Track[];

export interface Track {
  type: 'folder' | 'audio' | 'image' | 'text' | 'other'
  hash?: string
  size?: number
  title: string
  children?: Tracks
  mediaStreamUrl?: string
  mediaDownloadUrl?: string
  streamLowQualityUrl?: string
  duration?: number
  subtitles?: SubtitleInfo
  position?: number
}

export interface SubtitleInfo {
  title: string
  url?: string
  content?: string
  type: 'vtt' | 'srt'
}
