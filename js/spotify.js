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

    const existingEmbed = document.getElementById('spotify-embed');
    // If embedUrl is null/invalid, remove existing iframe and return
    if (!embedUrl) {
        if (existingEmbed) existingEmbed.remove();
        return;
    }

    if (existingEmbed) {
        // update src to new playlist (keeps input element intact)
        existingEmbed.src = embedUrl;
    } else {
        const iframe = document.createElement('iframe');
        iframe.id = 'spotify-embed';
        iframe.style.borderRadius = '12px';
        iframe.width = '100%';
        iframe.height = '352';
        iframe.frameBorder = '0';
        iframe.allowFullscreen = true;
        iframe.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
        iframe.src = embedUrl;
        area.appendChild(iframe);
    }
}