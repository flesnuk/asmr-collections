import type { Jsonify } from '../utils';
import type { ServerWork } from './work';

export interface ServerPlaylist {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  cover: string | null
  description: string | null

  /**
   * This works is only valid in the `/:id` endpoint, while the endpoint (`/`) only returns the works -> work id
   */
  works: ServerWork[]
}

export type Playlist = Jsonify<ServerPlaylist>;
