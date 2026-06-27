import app from 'flarum/forum/app';
import { HeroCfg, HERO_DEFAULTS } from '../common/heroView';

declare const m: import('mithril').Static;

/**
 * Work out which hero to show on the current discussion-list page, and merge the
 * three layers that produce it (highest priority first):
 *   1. the per-context overrides saved in the Hero Studio (`heroBuilder.heroes`)
 *   2. for a tag page, values derived from the tag itself (name / colour / icon)
 *   3. the forum-wide defaults
 * Returns null when the matching hero has been switched off.
 */
export function resolveHero(): HeroCfg | null {
  const heroes = (app.forum.attribute('heroBuilder.heroes') as Record<string, any>) || {};

  const tag = currentTag();
  const ctxKey = tag ? 'tag:' + tag.id() : 'home';
  const override = heroes[ctxKey] || {};

  if (override.enabled === false) return null;

  // Base layer — derived from the tag on a tag page, or the forum on the index.
  let base: Partial<HeroCfg>;
  let stats: HeroCfg['stats'] = [];

  if (tag) {
    base = {
      title: tag.name(),
      subtitle: tag.attribute('description') || '',
      icon: tag.attribute<string>('icon') || HERO_DEFAULTS.icon,
      c1: tag.color() || HERO_DEFAULTS.c1,
      c2: HERO_DEFAULTS.c2,
    };
    const count = tag.discussionCount?.();
    if (typeof count === 'number') {
      stats = [{ value: fmt(count), icon: 'fas fa-comments', label: app.translator.trans('ernestdefoe-hero-builder.forum.discussions') as any }];
    }
  } else {
    base = {
      title: app.forum.attribute('title'),
      subtitle: app.forum.attribute('description') || '',
      icon: HERO_DEFAULTS.icon,
      c1: HERO_DEFAULTS.c1,
      c2: HERO_DEFAULTS.c2,
    };
  }

  // Admin-defined custom stats (any context, incl. the home hero which has no
  // auto stat) take priority over the tag-derived count.
  const customStats = (Array.isArray(override.stats) ? override.stats : [])
    .filter((s: any) => s && (String(s.value ?? '').trim() !== '' || String(s.label ?? '').trim() !== ''))
    .map((s: any) => ({ value: String(s.value ?? ''), icon: s.icon || 'fas fa-circle-info', label: s.label || '' }));

  return {
    title: override.title || base.title || '',
    subtitle: override.subtitle ?? base.subtitle,
    icon: override.icon || base.icon || HERO_DEFAULTS.icon,
    c1: override.c1 || base.c1 || HERO_DEFAULTS.c1,
    c2: override.c2 || base.c2 || HERO_DEFAULTS.c2,
    image: override.image || undefined,
    showStats: override.showStats !== false,
    stats: customStats.length ? customStats : stats,
    height: Number(override.height) || undefined,
    width: Number(override.width) || undefined,
    iconBg: override.iconBg !== false,
    sharpCorners: override.sharpCorners === true,
  };
}

/** The tag whose page we're on, or null on the main index (or if tags is off). */
function currentTag(): any | null {
  const param = m.route.param('tags');
  if (!param || !(app.store as any)?.all) return null;
  const slug = String(param).split('/').pop();
  return app.store.all('tags').find((t: any) => t.slug && t.slug() === slug) || null;
}

function fmt(n: number): string {
  return n >= 1000 ? Math.round(n / 100) / 10 + 'k' : String(n);
}
