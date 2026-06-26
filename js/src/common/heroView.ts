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
}

/** The default look when nothing is configured. */
export const HERO_DEFAULTS = { icon: 'fas fa-meteor', c1: '#7c3aed', c2: '#ec4899' };

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

  return m('div.HeroBanner', { style }, [
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
      m('div.HeroBanner-badge', m('i', { className: cfg.icon || HERO_DEFAULTS.icon, 'aria-hidden': 'true' })),
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
