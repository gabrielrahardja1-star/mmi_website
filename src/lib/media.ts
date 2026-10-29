// Uploaded photos are processed once into a few web sizes and served from /media/<id>/<size>.webp
// (see the upload pipeline). Pick the smallest size that still looks sharp in the slot.
export const MEDIA_SIZES = [400, 800, 1800] as const;
export type MediaSize = (typeof MEDIA_SIZES)[number];

export const mediaUrl = (id: string, size: MediaSize = 1800) => `/media/${id}/${size}.webp`;
