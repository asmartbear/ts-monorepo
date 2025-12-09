import fetch from 'node-fetch';
import type { MetadataResult } from 'metascraper';
import metascraperAuthorJsonLd from './metascraper-ldjson';

// Use require for metascraper to avoid the type conflict
const metascraper = require('metascraper');
const metascraperAuthor = require('metascraper-author');
const metascraperDate = require('metascraper-date');
const metascraperDescription = require('metascraper-description');
const metascraperImage = require('metascraper-image');
const metascraperLogo = require('metascraper-logo');
const metascraperPublisher = require('metascraper-publisher');
const metascraperTitle = require('metascraper-title');
const metascraperUrl = require('metascraper-url');

const globalScraper = metascraper([
    metascraperAuthorJsonLd(),
    metascraperAuthor(),
    metascraperDate({ datePublished: true, dateModified: true }),
    metascraperDescription(),
    metascraperImage(),
    metascraperLogo(),
    metascraperPublisher(),
    metascraperTitle(),
    metascraperUrl()
]);

/**
 * Parse data that has already been loaded.
 */
export function parseHtmlForMetadata(url: string, html: string): Promise<MetadataResult> {
    return globalScraper({ html, url })
}

/**
 * Load a URL live and scrape its content, throwing error if unable to load.
 * The `url` field will be the result of any redirection.
 */
export async function scrapeUrl(url: string): Promise<MetadataResult> {

    // Fetch URL
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            // 'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://www.google.com/',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'cross-site',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        },
        timeout: 20000,
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse and override result
    const result = await parseHtmlForMetadata(url, await response.text())
    result.url = response.url           // in case of redirects
    return result
}