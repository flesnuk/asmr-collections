import type { Playlist } from '../playlist';

export type PlaylistResponse = Playlist;

export interface PlaylistsResponse {
  page: number
  limit: number
  total: number
  data: Playlist[]
}
