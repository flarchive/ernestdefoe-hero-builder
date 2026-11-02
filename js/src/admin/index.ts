import app from 'flarum/admin/app';

// Settings are declared via the JS Admin extender in ./extend (the Flarum 2
// pattern that replaced the removed 1.x app.extensionData API). The initializer
// is kept as a hook for any future admin-side preview/dashboard logic.
app.initializers.add('ernestdefoe-hero-builder', () => {});

export { default as extend } from './extend';
