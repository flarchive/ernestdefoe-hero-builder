<?php

/*
 * Hero Builder for Flarum 2 — a customizable, animated discussion-list hero,
 * per home page AND per tag, configured in a live Hero Studio. MIT licensed.
 * No core files touched: settings drive everything and the hero is rendered
 * client-side over the IndexPage (which Flarum reuses for tag pages).
 */

use Flarum\Api\Resource\ForumResource;
use Flarum\Api\Schema\Attribute;
use Flarum\Discussion\Discussion;
use Flarum\Extend;
use Flarum\Post\Post;
use Flarum\User\User;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less'),

    // The admin loads the same hero CSS so the Hero Studio live preview matches.
    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/less/forum.less'),

    new Extend\Locales(__DIR__ . '/resources/locale'),

    (new Extend\Settings())
        // Master on/off. Defaults to TRUE when unset — Flarum's serializeToForum
        // has no default argument, so the closure supplies it (a plain 'boolval'
        // would turn the unset null into false).
        ->serializeToForum('heroBuilder.enabled', 'ernestdefoe-hero-builder.enabled', fn ($v) => $v === null ? true : (bool) (int) $v)
        // The per-context hero map written by the Hero Studio:
        // { "home": {…}, "tag:<id>": {…} }. Decoded to an object for the forum.
        ->serializeToForum('heroBuilder.heroes', 'ernestdefoe-hero-builder.heroes', fn ($v) => $v ? (json_decode($v, true) ?: (object) []) : (object) []),

    // Live forum counts for the home hero's "real" stats (vs typed ones).
    // Cached 10 min so it's never a per-request COUNT query.
    (new Extend\ApiResource(ForumResource::class))
        ->fields(fn () => [
            Attribute::make('heroBuilderStats')->get(fn () => resolve('cache.store')->remember('hero-builder.stats', 600, fn () => [
                'discussions' => Discussion::query()->where('is_private', false)->whereNull('hidden_at')->count(),
                'posts' => Post::query()->where('type', 'comment')->whereNull('hidden_at')->count(),
                'users' => User::query()->count(),
            ])),
        ]),
];
