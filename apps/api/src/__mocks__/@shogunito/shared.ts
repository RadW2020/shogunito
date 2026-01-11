export const AssetType = {
  CHARACTER: 'character',
  SUBTITLES: 'subtitles',
  IMAGEN: 'imagen',
  AUDIO: 'audio',
  SCRIPT: 'script',
  TEXT: 'text',
  VIDEO: 'video',
} as const;

export type AssetType = (typeof AssetType)[keyof typeof AssetType];
