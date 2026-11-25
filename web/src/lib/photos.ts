import type { EventItem } from './types';

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80`;

/** Stock photos used when an organizer hasn't set a cover image. Picked by keyword. */
const FALLBACKS: [RegExp, string][] = [
  [/jazz|music|concert|gig|band|dj|live/i, unsplash('1511192336575-5a79af67a629')],
  [/code|typescript|react|dev|tech|hack|data|postgres|ai\b/i, unsplash('1498050108023-c5249f4df085')],
  [/workshop|class|course|bootcamp/i, unsplash('1522202176988-66273c2fd55f')],
  [/breakfast|coffee|brunch/i, unsplash('1495474472287-4d71bcdd2085')],
  [/dinner|food|lunch|tasting/i, unsplash('1414235077428-338989a2e8c0')],
  [/network|mixer|social|party|drinks|rooftop/i, unsplash('1528605248644-14dd04022da1')],
  [/talk|meetup|conference|summit|panel/i, unsplash('1540575467063-178a50c2df87')],
];
const DEFAULTS = [
  unsplash('1505373877841-8d25f7d46678'),
  unsplash('1475721027785-f74eccf877e2'),
  unsplash('1523580494863-6f3031224c94'),
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Resize Unsplash images on their CDN; leave other hosts untouched. */
export function sized(url: string, width: number) {
  if (!url.includes('images.unsplash.com')) return url;
  const u = new URL(url);
  u.searchParams.set('w', String(width));
  return u.toString();
}

export function eventPhoto(event: Pick<EventItem, 'id' | 'title' | 'imageUrl'>, width = 800) {
  const url = event.imageUrl || FALLBACKS.find(([re]) => re.test(event.title))?.[1] || DEFAULTS[hash(event.id) % DEFAULTS.length];
  return sized(url, width);
}

export const AUTH_PHOTO = sized(unsplash('1540575467063-178a50c2df87'), 1200);
