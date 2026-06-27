import app from 'flarum/admin/app';
import Component from 'flarum/common/Component';
import { heroView, HeroCfg, HERO_DEFAULTS, forumStats } from '../../common/heroView';

declare const m: import('mithril').Static;

type Ctx = { key: string; label: string; tag?: any };
type Stat = { value?: string; icon?: string; label?: string };
type Entry = { enabled?: boolean; title?: string; subtitle?: string; icon?: string; c1?: string; c2?: string; image?: string; showStats?: boolean; stats?: Stat[]; height?: number; width?: number; iconBg?: boolean; sharpCorners?: boolean };

/** Custom stats → renderable form (drops blank rows, fills an icon default). */
function cleanStats(stats?: Stat[]) {
  return (Array.isArray(stats) ? stats : [])
    .filter((s) => s && (String(s.value ?? '').trim() !== '' || String(s.label ?? '').trim() !== ''))
    .map((s) => ({ value: String(s.value ?? ''), icon: s.icon || 'fas fa-circle-info', label: s.label || '' }));
}

/**
 * The Hero Studio — a live editor. Pick a context (the home page or any tag),
 * edit its hero, and watch the preview update in real time. Everything is stored
 * as a single JSON map (`{ "home": {...}, "tag:<id>": {...} }`) on the bound
 * settings stream; the page's Save button persists it. Mirrors Convoro's Hero
 * Studio, with per-tag heroes.
 */
export default class HeroStudio extends Component<{ valueStream: (v?: string) => string }> {
  value!: (v?: string) => string;
  map: Record<string, Entry> = {};
  ctx = 'home';
  tags: any[] = [];
  loadingTags = true;

  oninit(vnode: any) {
    super.oninit(vnode);
    this.value = this.attrs.valueStream;
    try {
      this.map = JSON.parse(this.value() || '{}') || {};
    } catch {
      this.map = {};
    }

    // Load tags (if flarum/tags is installed) so each can have its own hero.
    if ((app.store as any)?.find) {
      app.store
        .find('tags')
        .then((tags: any) => {
          this.tags = (Array.isArray(tags) ? tags : []).filter((t: any) => !t.isChild || !t.isChild());
          this.loadingTags = false;
          m.redraw();
        })
        .catch(() => {
          this.loadingTags = false;
          m.redraw();
        });
    } else {
      this.loadingTags = false;
    }
  }

  contexts(): Ctx[] {
    const list: Ctx[] = [{ key: 'home', label: app.translator.trans('ernestdefoe-hero-builder.admin.studio.home') as any }];
    this.tags.forEach((t) => list.push({ key: 'tag:' + t.id(), label: t.name(), tag: t }));
    return list;
  }

  entry(key = this.ctx): Entry {
    return this.map[key] || {};
  }

  set(field: keyof Entry, val: any) {
    const e: Entry = { ...this.entry() };
    (e as any)[field] = val;
    this.map[this.ctx] = e;
    this.value(JSON.stringify(this.map));
  }

  /** The config used for the live preview — overrides merged over derived/default. */
  preview(): HeroCfg {
    const e = this.entry();
    const cur = this.contexts().find((c) => c.key === this.ctx);
    const tag = cur?.tag;
    const baseTitle = tag ? tag.name() : (app.forum?.attribute?.('title') as string) || 'Your community';
    const baseIcon = tag?.attribute?.('icon') || HERO_DEFAULTS.icon;
    const baseC1 = tag?.color?.() || HERO_DEFAULTS.c1;

    return {
      title: e.title || baseTitle,
      subtitle: e.subtitle ?? (tag?.attribute?.('description') || ''),
      icon: e.icon || baseIcon,
      c1: e.c1 || baseC1,
      c2: e.c2 || HERO_DEFAULTS.c2,
      image: e.image || undefined,
      showStats: e.showStats !== false,
      stats:
        e.showStats === false
          ? []
          : cleanStats(e.stats).length
            ? cleanStats(e.stats)
            : tag
              ? [{ value: String(tag.discussionCount?.() ?? 0), icon: 'fas fa-comments', label: app.translator.trans('ernestdefoe-hero-builder.forum.discussions') as any }]
              : forumStats(app.forum?.attribute?.('heroBuilderStats') as any, {
                  discussions: app.translator.trans('ernestdefoe-hero-builder.forum.discussions') as any,
                  posts: app.translator.trans('ernestdefoe-hero-builder.forum.posts') as any,
                  members: app.translator.trans('ernestdefoe-hero-builder.forum.members') as any,
                }),
      height: Number(e.height) || undefined,
      width: Number(e.width) || undefined,
      iconBg: e.iconBg !== false,
      sharpCorners: e.sharpCorners === true,
    };
  }

  view() {
    const t = (k: string) => app.translator.trans(`ernestdefoe-hero-builder.admin.studio.${k}`);
    const e = this.entry();
    const off = e.enabled === false;

    return m('div.HeroStudio', [
      m('label.HeroStudio-label', t('context')),
      m(
        'div.HeroStudio-tabs',
        this.loadingTags
          ? m('span.HeroStudio-loading', t('loading_tags'))
          : this.contexts().map((c) =>
              m(
                'button.HeroStudio-tab',
                {
                  className: c.key === this.ctx ? 'active' : '',
                  type: 'button',
                  onclick: () => (this.ctx = c.key),
                },
                [c.tag ? m('i.icon.fas.fa-tag') : m('i.icon.fas.fa-house'), ' ', c.label]
              )
            )
      ),

      m('div.HeroStudio-preview', { 'data-off': off ? 'true' : null }, heroView(this.preview())),

      m('div.HeroStudio-fields', [
        this.toggle('enabled', t('show_hero'), e.enabled !== false),
        this.text('title', t('title'), e.title, this.preview().title),
        this.text('subtitle', t('subtitle'), e.subtitle, ''),
        this.text('icon', t('icon'), e.icon, this.preview().icon, t('icon_help') as any),
        this.toggle('iconBg', t('icon_bg'), e.iconBg !== false),
        m('div.HeroStudio-row', [this.color('c1', t('c1'), e.c1, this.preview().c1), this.color('c2', t('c2'), e.c2, this.preview().c2)]),
        this.text('image', t('image'), e.image, '', t('image_help') as any),
        m('div.HeroStudio-row', [
          this.num('height', t('height'), e.height, '150', t('height_help') as any),
          this.num('width', t('width'), e.width, t('width_ph') as any),
        ]),
        this.toggle('sharpCorners', t('sharp_corners'), e.sharpCorners === true),
        this.toggle('showStats', t('show_stats'), e.showStats !== false),
        e.showStats !== false ? this.statsEditor() : null,
      ]),
    ]);
  }

  num(field: keyof Entry, label: string, val: any, placeholder: any, help?: string) {
    return m('div.Form-group.HeroStudio-field', [
      m('label', label),
      m('input.FormControl', {
        type: 'number',
        min: 0,
        value: val ?? '',
        placeholder: placeholder || '',
        oninput: (ev: any) => this.set(field, ev.target.value === '' ? undefined : Number(ev.target.value)),
      }),
      help ? m('p.helpText', help) : null,
    ]);
  }

  text(field: keyof Entry, label: string, val: any, placeholder: any, help?: string) {
    return m('div.Form-group.HeroStudio-field', [
      m('label', label),
      m('input.FormControl', {
        type: 'text',
        value: val || '',
        placeholder: placeholder || '',
        oninput: (ev: any) => this.set(field, ev.target.value),
      }),
      help ? m('p.helpText', help) : null,
    ]);
  }

  color(field: keyof Entry, label: string, val: any, resolved: string) {
    const hex = val || resolved;
    return m('div.Form-group.HeroStudio-field.HeroStudio-color', [
      m('label', label),
      m('div.HeroStudio-colorRow', [
        m('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#7c3aed', oninput: (ev: any) => this.set(field, ev.target.value) }),
        m('input.FormControl', { type: 'text', value: val || '', placeholder: resolved, oninput: (ev: any) => this.set(field, ev.target.value) }),
      ]),
    ]);
  }

  toggle(field: keyof Entry, label: string, on: boolean) {
    return m('div.Form-group.HeroStudio-field.HeroStudio-toggle', [
      m('label', [
        m('input', { type: 'checkbox', checked: on, onchange: (ev: any) => this.set(field, ev.target.checked) }),
        ' ',
        label,
      ]),
    ]);
  }

  /** Repeatable custom-stat editor (value / FA icon / label). Lets ANY hero —
   *  including the home page, which has no auto stat — show stats in the header. */
  statsEditor() {
    const t = (k: string) => app.translator.trans(`ernestdefoe-hero-builder.admin.studio.${k}`);
    const rows: Stat[] = Array.isArray(this.entry().stats) ? (this.entry().stats as Stat[]) : [];
    return m('div.Form-group.HeroStudio-field.HeroStudio-stats', [
      m('label', t('stats_custom')),
      m('p.helpText', t('stats_custom_help')),
      rows.map((s, i) =>
        m('div.HeroStudio-statRow', [
          m('input.FormControl', { type: 'text', placeholder: t('stat_value'), value: s.value || '', oninput: (ev: any) => this.setStat(i, 'value', ev.target.value) }),
          m('input.FormControl', { type: 'text', placeholder: t('stat_icon'), value: s.icon || '', oninput: (ev: any) => this.setStat(i, 'icon', ev.target.value) }),
          m('input.FormControl', { type: 'text', placeholder: t('stat_label'), value: s.label || '', oninput: (ev: any) => this.setStat(i, 'label', ev.target.value) }),
          m('button.Button.Button--icon.HeroStudio-statDel', { type: 'button', title: t('stat_remove'), onclick: () => this.removeStat(i) }, m('i.fas.fa-times')),
        ])
      ),
      m('button.Button.Button--text.HeroStudio-statAdd', { type: 'button', onclick: () => this.addStat() }, [m('i.fas.fa-plus'), ' ', t('stat_add')]),
    ]);
  }

  addStat() {
    this.set('stats', [...(this.entry().stats || []), { value: '', icon: 'fas fa-comments', label: '' }]);
  }

  setStat(i: number, field: keyof Stat, val: string) {
    const arr: Stat[] = [...(this.entry().stats || [])];
    arr[i] = { ...arr[i], [field]: val };
    this.set('stats', arr);
  }

  removeStat(i: number) {
    this.set('stats', (this.entry().stats || []).filter((_: Stat, j: number) => j !== i));
  }
}
