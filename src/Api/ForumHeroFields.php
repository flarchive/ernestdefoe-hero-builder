<?php

/*
 * This file is part of ernestdefoe/hero-builder.
 * MIT licensed.
 */

namespace ErnestDefoe\HeroBuilder\Api;

use ErnestDefoe\HeroBuilder\SubtitleHtml;
use Flarum\Api\Context;
use Flarum\Api\Schema\Attribute;
use Flarum\Discussion\Discussion;
use Flarum\Extension\ExtensionManager;
use Flarum\Post\Post;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\Tags\Tag;
use Flarum\User\User;
use Illuminate\Contracts\Cache\Repository as Cache;

/**
 * The hero data the forum needs: the per-context hero map and the live counts.
 */
class ForumHeroFields
{
    public function __construct(
        private readonly SettingsRepositoryInterface $settings,
        private readonly Cache $cache,
        private readonly ExtensionManager $extensions,
    ) {
    }

    /** @return array<Attribute> */
    public function __invoke(): array
    {
        return [
            // The per-context map written by the Hero Studio: { "home": {…}, "tag:<id>": {…} }.
            // Tag heroes are only sent to someone who can see that tag, so a
            // private tag's id, title and cover never reach other visitors.
            Attribute::make('heroBuilder.heroes')
                ->get(fn ($forum, Context $context) => $this->heroesFor($context) ?: (object) []),

            // Live forum counts for the home hero's "real" stats (vs typed ones).
            // Cached 10 min so it's never a per-request COUNT query.
            Attribute::make('heroBuilderStats')
                ->get(fn () => $this->cache->remember('hero-builder.stats', 600, fn () => [
                    'discussions' => Discussion::query()->where('is_private', false)->whereNull('hidden_at')->count(),
                    'posts' => Post::query()->where('type', 'comment')->whereNull('hidden_at')->count(),
                    'users' => User::query()->count(),
                ])),
        ];
    }

    /** @return array<string, mixed> */
    private function heroesFor(Context $context): array
    {
        $heroes = json_decode((string) $this->settings->get('ernestdefoe-hero-builder.heroes'), true);

        if (! is_array($heroes)) {
            return [];
        }

        // A subtitle with HTML in it is sent cleaned, as subtitleHtml, and the
        // raw text is never sent. Plain text stays as it is.
        foreach ($heroes as &$hero) {
            if (is_array($hero) && is_string($hero['subtitle'] ?? null) && SubtitleHtml::looksLikeHtml($hero['subtitle'])) {
                $hero['subtitleHtml'] = SubtitleHtml::clean($hero['subtitle']);
                unset($hero['subtitle']);
            }
        }
        unset($hero);

        $tagIds = [];
        foreach (array_keys($heroes) as $key) {
            if (str_starts_with((string) $key, 'tag:')) {
                $tagIds[] = (int) substr((string) $key, 4);
            }
        }

        if (! $tagIds) {
            return $heroes;
        }

        // One query, only when tag heroes exist. With Tags off no tag page exists.
        $visible = $this->extensions->isEnabled('flarum-tags')
            ? Tag::query()->whereVisibleTo($context->getActor())->whereIn('id', $tagIds)->pluck('id')->all()
            : [];

        return array_filter(
            $heroes,
            fn ($key) => ! str_starts_with((string) $key, 'tag:') || in_array((int) substr((string) $key, 4), $visible, true),
            ARRAY_FILTER_USE_KEY
        );
    }
}
