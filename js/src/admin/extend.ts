import app from 'flarum/admin/app';
import Admin from 'flarum/common/extenders/Admin';
import HeroStudio from './components/HeroStudio';

declare const m: import('mithril').Static;

// Hero Builder settings via Flarum 2's JS Admin extender (the 1.x app.extensionData
// API is removed — using it throws "failed to initialize"). A master on/off switch,
// then the live Hero Studio: per-context (home + every tag) editing with a live
// preview. Each .setting()/.customSetting() takes a FUNCTION.
const K = 'ernestdefoe-hero-builder';
const t = (k: string) => app.translator.trans(`${K}.admin.${k}`);

export default [
  new Admin()
    .setting(() => ({ setting: `${K}.enabled`, type: 'boolean', label: t('enabled'), help: t('enabled_help') }))
    .customSetting(function (this: { setting: (k: string, d?: string) => (v?: string) => string }) {
      return m(HeroStudio, { valueStream: this.setting(`${K}.heroes`, '{}') });
    }),
];
