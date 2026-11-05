<?php

/*
 * This file is part of ernestdefoe/hero-builder.
 * MIT licensed.
 */

namespace ErnestDefoe\HeroBuilder;

use DOMDocument;
use DOMElement;
use DOMNode;

/**
 * Cleans the HTML an admin types into a hero subtitle down to a small
 * allow-list: p, br, strong, em, and a with an http(s) href. The output is
 * rebuilt from the parsed tree, never copied from the input, so anything not
 * on the list (scripts, styles, event handlers, other attributes) is dropped.
 * The text inside a dropped tag is kept; script and style contents are not.
 */
class SubtitleHtml
{
    private const TAGS = ['p', 'br', 'strong', 'em', 'a'];

    /** Tags whose content is code, not text: dropped whole. */
    private const DROP = ['script', 'style', 'template', 'noscript', 'iframe', 'object', 'textarea', 'title', 'svg', 'math'];

    /** Has a tag in it ("<p", "</", "<!--"), not just a "<" like "<3" or "a < b". */
    public static function looksLikeHtml(string $text): bool
    {
        return (bool) preg_match('~<[a-z/!]~i', $text);
    }

    public static function clean(string $html): string
    {
        $doc = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        // libxml stops reading at a NUL byte on some builds, dropping the rest.
        $html = str_replace("\0", '', $html);
        $doc->loadHTML('<?xml encoding="UTF-8"><body>'.$html.'</body>', LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $body = $doc->getElementsByTagName('body')->item(0);

        return $body ? trim(self::children($body)) : '';
    }

    private static function children(DOMNode $node): string
    {
        $out = '';
        foreach ($node->childNodes as $child) {
            $out .= self::node($child);
        }

        return $out;
    }

    private static function node(DOMNode $node): string
    {
        if ($node->nodeType === XML_TEXT_NODE || $node->nodeType === XML_CDATA_SECTION_NODE) {
            return htmlspecialchars((string) $node->nodeValue, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        if (! $node instanceof DOMElement) {
            return '';
        }

        $tag = strtolower($node->tagName);

        if (in_array($tag, self::DROP, true)) {
            return '';
        }

        if (! in_array($tag, self::TAGS, true)) {
            return self::children($node);
        }

        if ($tag === 'br') {
            return '<br>';
        }

        $open = $tag;
        if ($tag === 'a') {
            $href = self::href($node->getAttribute('href'));
            if ($href === null) {
                return self::children($node);
            }
            $open .= ' href="'.htmlspecialchars($href, ENT_QUOTES | ENT_HTML5, 'UTF-8').'" rel="nofollow noopener"';
        }

        return '<'.$open.'>'.self::children($node).'</'.$tag.'>';
    }

    /** An http(s) URL, or null for anything else (javascript:, data:, relative…). */
    public static function href(string $href): ?string
    {
        // Browsers drop control characters, tabs and newlines inside a URL
        // ("java\tscript:") and trim spaces, so do the same before checking it.
        $href = trim((string) preg_replace('/[\x00-\x1F\x7F]+/', '', $href));

        return preg_match('~^https?://[^/?#]~i', $href) ? $href : null;
    }
}
