import type { Tracks } from '../track';
import type { StorageType } from '../../schemas';

export interface TracksResponse {
  storage: {
    type: StorageType | 'asmrone'
    name: string
  }
  tracks: Tracks
}
