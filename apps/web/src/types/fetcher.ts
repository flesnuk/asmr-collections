export type Base = '/api';
export type WorkAPI =
  | 'work/create/:id'
  | 'work/update/:id'
  | 'work/delete/:id'
  | 'work/info/:id'
  | 'work/:id' | 'work/:id/playlists'
  | 'work/similar/:id'
  | 'work/batch/create' | 'work/batch/update';

export type WorksAPI = 'works';
export type FieldAPI = 'field/:field';
export type GenresAPI = 'genres/sync';
export type TracksAPI =
  | 'tracks/:id'
  | 'tracks/:id/cache/clear';
export type LibraryAPI =
  | 'library/exists/:id'
  | 'library/ffmpeg';
export type SubtitlesAPI =
  | 'subtitles/:id';
export type PlaylistAPI =
  | 'playlist/:id';

export type FetcherKey =
  | `${Base}/${WorkAPI}`
  | `${Base}/${WorksAPI}`
  | `${Base}/${FieldAPI}`
  | `${Base}/${GenresAPI}`
  | `${Base}/${TracksAPI}`
  | `${Base}/${LibraryAPI}`
  | `${Base}/${PlaylistAPI}`
  | (string & {});
