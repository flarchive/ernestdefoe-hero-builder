<?php

namespace ErnestDefoe\HeroBuilder\Tests\integration;

use ErnestDefoe\HeroBuilder\SubtitleHtml;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

class SubtitleHtmlTest extends TestCase
{
    public static function cases(): array
    {
        return [
            'allowed tags pass' => ['<p>One <strong>bold</strong> and <em>it</em></p><p>Two<br/>three</p>', '<p>One <strong>bold</strong> and <em>it</em></p><p>Two<br>three</p>'],
            'https link' => ['<a href="https://example.com/a?b=1&amp;c=2">x</a>', '<a href="https://example.com/a?b=1&amp;c=2" rel="nofollow noopener">x</a>'],
            'http link, other attributes dropped' => ['<a href="http://e.com" onclick="alert(1)" target="_blank" style="color:red">x</a>', '<a href="http://e.com" rel="nofollow noopener">x</a>'],
            'event handlers and style dropped' => ['<p onmouseover="alert(1)" style="x" class="y">hi</p>', '<p>hi</p>'],
            'script removed with its content' => ['a<script>alert(1)</script>b', 'ab'],
            'style removed with its content' => ['<style>body{display:none}</style>ok', 'ok'],
            'unknown tag unwrapped, text kept' => ['<div><span>keep</span></div>', 'keep'],
            'img with onerror gone' => ['<img src=x onerror=alert(1)>t', 't'],
            'svg payload gone' => ['<svg onload=alert(1)><a href="https://e.com">x</a></svg>t', 't'],
            'iframe gone' => ['<iframe src="https://evil.example"></iframe>t', 't'],
            'javascript: link unwrapped' => ['<a href="javascript:alert(1)">x</a>', 'x'],
            'JaVaScRiPt with spaces' => ['<a href="  JaVaScRiPt:alert(1)">x</a>', 'x'],
            'tab inside scheme' => ["<a href=\"java\tscript:alert(1)\">x</a>", 'x'],
            'newline inside scheme' => ["<a href=\"java\nscript:alert(1)\">x</a>", 'x'],
            'entity-encoded tab' => ['<a href="java&#x09;script:alert(1)">x</a>', 'x'],
            'entity-encoded scheme' => ['<a href="&#106;avascript:alert(1)">x</a>', 'x'],
            'null byte' => ["<a href=\"java\0script:alert(1)\">x</a>", 'x'],
            'null byte in text keeps what follows' => ["<p>a\0b</p><p>c</p>", '<p>ab</p><p>c</p>'],
            'leading control char' => ["<a href=\"\x01javascript:alert(1)\">x</a>", 'x'],
            'control char inside https is stripped' => ["<a href=\"ht\ttps://e.com\">x</a>", '<a href="https://e.com" rel="nofollow noopener">x</a>'],
            'data: link' => ['<a href="data:text/html,<script>alert(1)</script>">x</a>', 'x'],
            'vbscript: link' => ['<a href="vbscript:msgbox">x</a>', 'x'],
            'protocol-relative link' => ['<a href="//evil.example">x</a>', 'x'],
            'https with no host' => ['<a href="https:///x">x</a>', 'x'],
            'attribute breakout is escaped' => ['<a href=\'https://e.com/"onmouseover="alert(1)\'>x</a>', '<a href="https://e.com/&quot;onmouseover=&quot;alert(1)" rel="nofollow noopener">x</a>'],
            'text is escaped' => ['<p>1 &lt; 2 &amp; "q"</p>', '<p>1 &lt; 2 &amp; &quot;q&quot;</p>'],
            'comments dropped' => ['a<!-- <script>x</script> -->b', 'ab'],
            'unclosed tag' => ['<p><strong>open', '<p><strong>open</strong></p>'],
            'utf-8 kept' => ['<p>Café — 日本</p>', '<p>Café — 日本</p>'],
        ];
    }

    #[Test]
    #[DataProvider('cases')]
    public function it_keeps_only_the_allow_list(string $in, string $out)
    {
        $this->assertSame($out, SubtitleHtml::clean($in));
    }
}
