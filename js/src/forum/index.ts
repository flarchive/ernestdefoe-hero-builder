import app from 'flarum/forum/app';
import { override } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import HeroBanner from './components/HeroBanner';
import { resolveHero } from './resolve';

// Replace the default welcome hero on the discussion list — and on every tag
// page — with the customizable animated hero banner. The hero shown is resolved
// per context (home vs. the specific tag) from the Hero Studio config.
app.initializers.add('ernestdefoe-hero-builder', () => {
  override(IndexPage.prototype, 'hero', function (this: any, original: () => any) {
    if (app.forum.attribute('heroBuilder.enabled') === false) {
      return original();
    }
    const cfg = resolveHero();
    if (!cfg) return original();
    return HeroBanner.component({ cfg });
  });
});
