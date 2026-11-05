<?php

namespace ErnestDefoe\HeroBuilder\Tests\integration\api;

use Carbon\Carbon;
use Flarum\Discussion\Discussion;
use Flarum\Post\Post;
use Flarum\Tags\Tag;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;
use PHPUnit\Framework\Attributes\Test;

class ForumAttributesTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('ernestdefoe-hero-builder');
    }

    private function forum(?int $actorId = null): array
    {
        $response = $this->send($this->request('GET', '/api', $actorId ? ['authenticatedAs' => $actorId] : []));
        $this->assertSame(200, $response->getStatusCode());

        return json_decode((string) $response->getBody(), true)['data']['attributes'];
    }

    #[Test]
    public function the_hero_is_on_with_no_heroes_until_configured()
    {
        $forum = $this->forum();

        $this->assertTrue($forum['heroBuilder.enabled']);
        $this->assertSame([], $forum['heroBuilder.heroes']);
    }

    #[Test]
    public function the_saved_settings_are_served()
    {
        $this->setting('ernestdefoe-hero-builder.enabled', '0');
        $this->setting('ernestdefoe-hero-builder.heroes', json_encode(['index' => ['title' => 'Welcome']]));

        $forum = $this->forum();

        $this->assertFalse($forum['heroBuilder.enabled']);
        $this->assertSame(['index' => ['title' => 'Welcome']], $forum['heroBuilder.heroes']);
    }

    #[Test]
    public function the_stats_count_only_public_visible_content()
    {
        $this->prepareDatabase([
            User::class => [$this->normalUser()],
            Discussion::class => [
                ['id' => 1, 'title' => 'Public', 'created_at' => Carbon::now(), 'user_id' => 2, 'first_post_id' => 1, 'comment_count' => 2],
                ['id' => 2, 'title' => 'Private', 'created_at' => Carbon::now(), 'user_id' => 2, 'comment_count' => 0, 'is_private' => true],
                ['id' => 3, 'title' => 'Hidden', 'created_at' => Carbon::now(), 'user_id' => 2, 'comment_count' => 0, 'hidden_at' => Carbon::now()],
            ],
            Post::class => [
                ['id' => 1, 'discussion_id' => 1, 'number' => 1, 'created_at' => Carbon::now(), 'user_id' => 2, 'type' => 'comment', 'content' => '<t><p>One</p></t>'],
                ['id' => 2, 'discussion_id' => 1, 'number' => 2, 'created_at' => Carbon::now(), 'user_id' => 2, 'type' => 'comment', 'content' => '<t><p>Two</p></t>', 'hidden_at' => Carbon::now()],
                ['id' => 5, 'discussion_id' => 1, 'number' => 3, 'created_at' => Carbon::now(), 'user_id' => 2, 'type' => 'discussionRenamed', 'content' => '[]'],
            ],
        ]);

        $stats = $this->forum()['heroBuilderStats'];

        $this->assertSame(1, $stats['discussions'], 'Private and hidden discussions are not counted');
        $this->assertSame(1, $stats['posts'], 'Hidden posts and event posts are not counted');
        $this->assertSame(2, $stats['users']);
    }

    #[Test]
    public function a_restricted_tags_hero_is_only_sent_to_those_who_can_see_the_tag()
    {
        $this->extension('flarum-tags', 'ernestdefoe-hero-builder');
        $this->prepareDatabase([
            User::class => [$this->normalUser()],
            Tag::class => [
                ['id' => 1, 'name' => 'Open', 'slug' => 'open', 'position' => 0],
                ['id' => 2, 'name' => 'Staff', 'slug' => 'staff', 'position' => 1, 'is_restricted' => true],
            ],
        ]);
        $this->setting('ernestdefoe-hero-builder.heroes', json_encode([
            'home' => ['title' => 'Welcome'],
            'tag:1' => ['title' => 'Open hero'],
            'tag:2' => ['title' => 'Staff only', 'image' => 'https://example.com/secret.jpg'],
        ]));

        $guest = $this->forum()['heroBuilder.heroes'];
        $this->assertSame(['home', 'tag:1'], array_keys($guest));

        $member = $this->forum(2)['heroBuilder.heroes'];
        $this->assertSame(['home', 'tag:1'], array_keys($member));

        $admin = $this->forum(1)['heroBuilder.heroes'];
        $this->assertSame(['home', 'tag:1', 'tag:2'], array_keys($admin));
    }

    #[Test]
    public function tag_heroes_are_dropped_when_tags_is_off()
    {
        $this->setting('ernestdefoe-hero-builder.heroes', json_encode(['home' => ['title' => 'Hi'], 'tag:1' => ['title' => 'T']]));

        $this->assertSame(['home'], array_keys($this->forum()['heroBuilder.heroes']));
    }

    #[Test]
    public function a_subtitle_with_html_is_sent_cleaned_and_plain_text_is_untouched()
    {
        $this->setting('ernestdefoe-hero-builder.heroes', json_encode([
            'home' => ['subtitle' => '<p>Hi <a href="javascript:alert(1)" onclick="x">there</a></p><script>alert(1)</script>'],
            'plain' => ['subtitle' => 'Tips &amp; tricks <3, 1 < 2'],
        ]));

        $heroes = $this->forum()['heroBuilder.heroes'];

        $this->assertSame(['subtitleHtml' => '<p>Hi there</p>'], $heroes['home'], 'The raw subtitle is never sent');
        $this->assertSame(['subtitle' => 'Tips &amp; tricks <3, 1 < 2'], $heroes['plain'], 'A "<" that is not a tag stays plain text');
    }
}
