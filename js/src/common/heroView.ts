declare const m: import('mithril').Static;

/** A fully-resolved hero config — everything needed to render one banner. */
export interface HeroCfg {
  title: string;
  subtitle?: string;
  icon: string;
  c1: string;
  c2: string;
  image?: string;
  showStats?: boolean;
  stats?: Array<{ value: string; icon: string; label: string }>;
  /** Banner min-height in px (falls back to the CSS default when unset). */
  height?: number;
  /** Max banner width in px, centered (full width when unset). */
  width?: number;
  /** Show the icon + its rounded background square. Off → no icon at all. Default on. */
  iconBg?: boolean;
  /** Use square (sharp) corners instead of the default rounded ones. */
  sharpCorners?: boolean;
  /** Border thickness in px (0 = no border). Unset → the CSS default. */
  borderWidth?: number;
  /** Border colour (any CSS colour). */
  borderColor?: string;
  /** Drop-shadow strength. Unset → the CSS default. */
  shadow?: 'none' | 'soft' | 'medium' | 'strong';
  /** Space above the banner in px (also lets you close/adjust the header gap). */
  marginTop?: number;
  /** Space below the banner in px (falls back to the CSS default when unset). */
  marginBottom?: number;
}

/** Drop-shadow presets keyed by `HeroCfg.shadow`. */
export const HERO_SHADOWS: Record<string, string> = {
  none: 'none',
  soft: '0 6px 20px -10px rgba(0, 0, 0, 0.35)',
  medium: '0 16px 44px -16px rgba(0, 0, 0, 0.5)',
  strong: '0 24px 64px -18px rgba(0, 0, 0, 0.66)',
};

/** The default look when nothing is configured. */
export const HERO_DEFAULTS = { icon: 'fas fa-meteor', c1: '#7c3aed', c2: '#ec4899' };

/** Parse #rgb / #rrggbb → [r, g, b] (0–255); null if unparseable. */
function parseHex(hex: string): [number, number, number] | null {
  let h = (hex || '').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * The badge is a white chip, so the icon/logo shows in this colour. Team primary
 * colours can be light (Iowa gold, Carolina blue) and would wash out on white, so
 * darken just those enough to stay legible while keeping the hue. Dark colours pass
 * through untouched.
 */
export function badgeIconColor(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex || '#204805';
  const [r, g, b] = rgb;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b; // 0–255
  const MAX = 150;
  if (lum <= MAX) return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
  const f = MAX / lum;
  return '#' + [r, g, b].map((c) => Math.round(c * f).toString(16).padStart(2, '0')).join('');
}

/** Compact a number: 1234 → "1.2k". */
export function fmtCount(n?: number): string {
  const v = n ?? 0;
  return v >= 1000 ? Math.round(v / 100) / 10 + 'k' : String(v);
}

/**
 * Build the home hero's default LIVE stats from the forum counts attribute
 * (`heroBuilderStats`, exposed by the backend) — real numbers, not typed ones.
 */
export function forumStats(
  s: { discussions?: number; posts?: number; users?: number } | null | undefined,
  labels: { discussions: string; posts: string; members: string }
): HeroCfg['stats'] {
  if (!s) return [];
  return [
    { value: fmtCount(s.discussions), icon: 'fas fa-comments', label: labels.discussions },
    { value: fmtCount(s.posts), icon: 'fas fa-pen-to-square', label: labels.posts },
    { value: fmtCount(s.users), icon: 'fas fa-users', label: labels.members },
  ];
}

/**
 * Render the hero as a Mithril vnode tree. Pure — given a resolved config it
 * returns identical markup whether called from the forum (the real hero) or the
 * admin Hero Studio (the live preview), so the two never drift.
 */
export function heroView(cfg: HeroCfg) {
  const grad = `linear-gradient(135deg, ${cfg.c1}, ${cfg.c2})`;
  const style: Record<string, string> = { background: cfg.image ? '#0b0a14' : grad };
  if (cfg.height) style.minHeight = cfg.height + 'px';
  if (cfg.width) {
    style.maxWidth = cfg.width + 'px';
    style.marginLeft = 'auto';
    style.marginRight = 'auto';
  }
  if (cfg.borderWidth != null) {
    style.border = cfg.borderWidth > 0 ? `${cfg.borderWidth}px solid ${cfg.borderColor || 'rgba(255,255,255,0.1)'}` : 'none';
  } else if (cfg.borderColor) {
    style.borderColor = cfg.borderColor;
  }
  if (cfg.shadow && HERO_SHADOWS[cfg.shadow]) style.boxShadow = HERO_SHADOWS[cfg.shadow];
  if (cfg.marginTop != null) style.marginTop = cfg.marginTop + 'px';
  if (cfg.marginBottom != null) style.marginBottom = cfg.marginBottom + 'px';

  return m('div.HeroBanner', { className: cfg.sharpCorners ? 'HeroBanner--sharp' : '', style }, [
    cfg.image ? m('img.HeroBanner-cover', { src: cfg.image, alt: '' }) : null,
    m('span.HeroBanner-blob', {
      style: { background: `radial-gradient(circle, ${cfg.c1}, transparent 70%)`, left: '-50px', top: '-80px' },
      'aria-hidden': 'true',
    }),
    m('span.HeroBanner-blob', {
      style: {
        background: `radial-gradient(circle, ${cfg.c2}, transparent 70%)`,
        right: '-40px',
        top: '-50px',
        animationDuration: '11s',
        animationDelay: '-3s',
      },
      'aria-hidden': 'true',
    }),
    m('span.HeroBanner-sheen', { 'aria-hidden': 'true' }),
    m('span.HeroBanner-wash', { 'aria-hidden': 'true' }),
    m('div.HeroBanner-body', [
      cfg.iconBg !== false
        ? m(
            'div.HeroBanner-badge',
            m('i', {
              className: cfg.icon || HERO_DEFAULTS.icon,
              style: { color: badgeIconColor(cfg.c1 || HERO_DEFAULTS.c1) },
              'aria-hidden': 'true',
            })
          )
        : null,
      m('div.HeroBanner-text', [
        m('h1.HeroBanner-title', cfg.title),
        cfg.subtitle ? m('p.HeroBanner-subtitle', cfg.subtitle) : null,
      ]),
      cfg.showStats !== false && cfg.stats && cfg.stats.length
        ? m(
            'div.HeroBanner-stats',
            cfg.stats.map((s) =>
              m('div.HeroBanner-stat', [
                m('span.HeroBanner-stat-ico', m('i', { className: s.icon, title: s.label, 'aria-label': s.label })),
                m('span.HeroBanner-stat-num', s.value),
              ])
            )
          )
        : null,
    ]),
  ]);
}
