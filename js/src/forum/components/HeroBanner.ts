import Component from 'flarum/common/Component';
import { heroView, HeroCfg } from '../../common/heroView';

/**
 * Thin Mithril wrapper around the shared hero renderer. The forum passes a
 * fully-resolved config (see resolve.ts); the markup itself lives in heroView so
 * the admin Hero Studio live preview stays pixel-identical.
 */
export default class HeroBanner extends Component<{ cfg: HeroCfg }> {
  view() {
    return heroView(this.attrs.cfg);
  }
}
