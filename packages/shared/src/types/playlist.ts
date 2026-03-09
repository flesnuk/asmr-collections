import type { Jsonify } from '../utils';
import type { ServerWork } from './work';

export interface ServerPlaylist {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  cover: string | null
  intro: string | null

  /**
   * The work only in `/:id` endpoint
   */
  work: ServerWork
}

export type Playlist = Jsonify<ServerPlaylist>;
