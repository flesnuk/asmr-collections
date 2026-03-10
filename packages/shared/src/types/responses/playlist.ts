import type { Work } from '../work';
import type { Playlist } from '../playlist';

export interface PlaylistResponse {
  page: number
  limit: number
  total: number
  data: Playlist
}

export interface PlaylistsResponse {
  page: number
  limit: number
  total: number
  data: Array<Playlist & { works: Array<Pick<Work, 'id'>> }>
}
