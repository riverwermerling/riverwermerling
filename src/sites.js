/*
 * Sites whose video or music is copy-protected (DRM). Chrome, Edge and
 * Safari give extensions silence instead of sound for protected media, so
 * on these sites we never touch the player directly; Chrome and Edge use
 * tab mode instead. Firefox handles protected media normally.
 *
 * This list is a head start, not the whole story: any site that turns out
 * to use copy protection is remembered automatically (see content.js).
 */
(function (root) {
  'use strict';

  const KNOWN_PROTECTED = [
    // Film and TV
    'netflix.com',
    'disneyplus.com',
    'primevideo.com',
    'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 'amazon.it', 'amazon.es',
    'amazon.ca', 'amazon.com.au', 'amazon.co.jp', 'amazon.in', 'amazon.com.br', 'amazon.nl',
    'max.com', 'hbomax.com',
    'hulu.com',
    'peacocktv.com',
    'paramountplus.com',
    'tv.apple.com',
    'crunchyroll.com',
    'discoveryplus.com',
    'mubi.com',
    'sling.com',
    'fubo.tv',
    'directv.com',
    'tv.youtube.com',
    'play.google.com',
    'vudu.com', 'fandangoathome.com',
    'nowtv.com', 'sky.com', 'skyshowtime.com',
    'itv.com', 'itvx.com',
    'channel4.com',
    'britbox.com', 'britbox.co.uk',
    'stan.com.au', 'binge.com.au',
    'canalplus.com',
    'hotstar.com',
    'viaplay.com',
    // Music
    'spotify.com',
    'music.apple.com',
    'tidal.com',
    'deezer.com',
    'music.amazon.com',
  ];

  function matches(host, domain) {
    return host === domain || host.endsWith('.' + domain);
  }

  function isProtectedHost(host, learned) {
    const h = String(host || '').toLowerCase();
    if (!h) return false;
    return KNOWN_PROTECTED.some((d) => matches(h, d)) || (learned || []).some((d) => matches(h, d));
  }

  root.SteadySites = { isProtectedHost };
})(globalThis);
