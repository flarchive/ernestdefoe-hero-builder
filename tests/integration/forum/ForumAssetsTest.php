<?php

namespace ErnestDefoe\HeroBuilder\Tests\integration\forum;

use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use PHPUnit\Framework\Attributes\Test;

/**
 * Hero Builder is mostly front end, so what the server must get right is
 * shipping it: a stylesheet that fails to compile takes the whole forum
 * down, not just the hero.
 */
class ForumAssetsTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('ernestdefoe-hero-builder');
    }

    /**
     * A page, and the compiled assets it links to.
     *
     * @return array<string, string> asset contents, keyed by file name
     */
    private function page(string $path, array $options, string ...$files): array
    {
        $response = $this->send($this->request('GET', $path, $options));

        $this->assertSame(200, $response->getStatusCode(), "$path renders with Hero Builder enabled");

        $disk = $this->app()->getContainer()->make('filesystem')->disk('flarum-assets');
        $assets = [];

        foreach ($files as $file) {
            $this->assertMatchesRegularExpression('~/assets/'.preg_quote($file).'\?v=~', (string) $response->getBody(), "$path links $file");
            $assets[$file] = (string) $disk->get($file);
        }

        return $assets;
    }

    #[Test]
    public function the_stylesheet_compiles_into_the_forum_css()
    {
        $css = $this->page('/', [], 'forum.css')['forum.css'];

        $this->assertStringContainsString('.HeroBanner', $css);
        $this->assertStringContainsString('.HeroBanner-cover', $css);
    }

    #[Test]
    public function the_script_ships_with_the_forum()
    {
        $js = $this->page('/', [], 'forum.js')['forum.js'];

        $this->assertStringContainsString('initializers.add("ernestdefoe-hero-builder"', $js);
    }

    #[Test]
    public function the_settings_script_ships_with_the_admin()
    {
        $js = $this->page('/admin', ['authenticatedAs' => 1], 'admin.js')['admin.js'];

        $this->assertStringContainsString('initializers.add("ernestdefoe-hero-builder"', $js);
    }
}
