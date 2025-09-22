function toSpotifyEmbed(url) {
    if (!url) return null;
    // support spotify URI: spotify:playlist:<id>
    const uriMatch = url.match(/spotify:playlist:([a-zA-Z0-9]+)/);
    if (uriMatch) return `https://open.spotify.com/embed/playlist/${uriMatch[1]}?utm_source=generator`;

    // web URL like https://open.spotify.com/playlist/<id>?si=...
    const webMatch = url.match(/playlist\/([a-zA-Z0-9]+)(?:[?\/]|$)/);
    if (webMatch) return `https://open.spotify.com/embed/playlist/${webMatch[1]}?utm_source=generator`;

    return null;
}

export function createSpotifyEmbed() {
    const area = document.getElementById('spotify-area');
    const input = document.getElementById('spotify-url');
    if (!area || !input) return;

    const url = input.value.trim();
    const embedUrl = toSpotifyEmbed(url);

    // Try to find existing wrapper or iframe
    const wrapper = document.getElementById('spotify-embed-wrapper');
    const existingEmbed = document.getElementById('spotify-embed');

    // If embedUrl is null/invalid, remove existing elements and return
    if (!embedUrl) {
        if (wrapper) wrapper.remove();
        else if (existingEmbed) existingEmbed.remove();
        return;
    }

    // If a wrapper exists, update its iframe
    if (wrapper) {
        const iframe = wrapper.querySelector('#spotify-embed');
        if (iframe) iframe.src = embedUrl;
        else {
            // create iframe inside wrapper
            const iframeNew = document.createElement('iframe');
            iframeNew.id = 'spotify-embed';
            iframeNew.setAttribute('loading', 'lazy');
            iframeNew.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
            iframeNew.src = embedUrl;
            wrapper.appendChild(iframeNew);
        }
        return;
    }

    // No wrapper exists. If an iframe exists directly, update it but remove fixed sizing so CSS controls it
    if (existingEmbed) {
        existingEmbed.src = embedUrl;
        existingEmbed.removeAttribute('width');
        existingEmbed.removeAttribute('height');
        existingEmbed.style.borderRadius = '';
        existingEmbed.setAttribute('loading', 'lazy');

        // Wrap existing iframe in a responsive wrapper so CSS aspect-ratio works
        const wrap = document.createElement('div');
        wrap.id = 'spotify-embed-wrapper';
        existingEmbed.parentNode.insertBefore(wrap, existingEmbed);
        wrap.appendChild(existingEmbed);
        return;
    }

    // Create wrapper + iframe (preferred)
    const wrap = document.createElement('div');
    wrap.id = 'spotify-embed-wrapper';
    const iframe = document.createElement('iframe');
    iframe.id = 'spotify-embed';
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
    iframe.src = embedUrl;
    wrap.appendChild(iframe);
    area.appendChild(wrap);
}