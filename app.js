/* ==========================================================================
   STEFANO BOSSOLASCO PORTFOLIO — shared script for all pages
   ========================================================================== */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initNavigation();
    initReveal();
    initToc();
    initYouTubeEmbeds();
    initLightbox();
    hideMissingFileLinks();
    initOrbitalSimulation();
    if (prefersReducedMotion) document.querySelectorAll('video[autoplay]').forEach(v => v.pause());
});

const isLight = () => document.documentElement.getAttribute('data-theme') === 'light';

/* --- Theme (initial value is set inline in <head>) --- */
function initThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    // The label names the action, so screen readers hear what a press will do
    const syncLabel = () => toggle.setAttribute('aria-label', isLight() ? 'Switch to dark theme' : 'Switch to light theme');
    syncLabel();
    toggle.addEventListener('click', () => {
        const next = isLight() ? 'dark' : 'light';
        const root = document.documentElement;
        const apply = () => { root.setAttribute('data-theme', next); syncLabel(); };
        root.classList.add('theme-switching');
        // Crossfade the whole page so every surface changes together, not the background alone
        if (document.startViewTransition && !prefersReducedMotion) document.startViewTransition(apply);
        else apply();
        setTimeout(() => root.classList.remove('theme-switching'), 400);
        try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
    });
}

/* --- Navbar, mobile menu, active section --- */
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const toggle = document.getElementById('nav-toggle');
    const menu = document.getElementById('nav-menu');
    if (!navbar) return;

    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (toggle && menu) {
        const isOpen = () => menu.classList.contains('open');
        const setOpen = (open, { restoreFocus = false } = {}) => {
            menu.classList.toggle('open', open);
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
            // Move focus into the menu when it opens; hand it back to the toggle when dismissed
            if (open) menu.querySelector('a')?.focus({ preventScroll: true });
            else if (restoreFocus) toggle.focus({ preventScroll: true });
        };
        toggle.addEventListener('click', () => setOpen(!isOpen()));
        menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) setOpen(false, { restoreFocus: true }); });
        // Tapping anywhere outside the open menu closes it
        document.addEventListener('pointerdown', e => {
            if (isOpen() && !menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
        });
        // Leaving the mobile layout should never leave the menu stuck open
        window.matchMedia('(min-width: 861px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
    }

    // Highlight the nav link of the section currently in view
    const links = document.querySelectorAll('.nav-link[href^="#"]');
    if (!links.length) return;
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            links.forEach(link => {
                const current = link.getAttribute('href') === `#${id}`;
                link.classList.toggle('active', current);
                // Expose the current section to assistive tech, not just through colour
                if (current) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
            });
        });
    }, { rootMargin: '-35% 0px -60% 0px' });
    links.forEach(link => {
        const section = document.querySelector(link.getAttribute('href'));
        if (section) observer.observe(section);
    });
    // Sections without a nav link (hero, profile) clear the highlight
    document.querySelectorAll('#home, #profile').forEach(s => observer.observe(s));
}

/* --- Fade-in on scroll --- */
function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length || !('IntersectionObserver' in window)) return;
    // Hide-until-revealed only applies once this runs, so content never depends on the script
    document.documentElement.classList.add('js-reveal');
    // Cards in the same grid enter one after another (60 ms apart), never all at once
    document.querySelectorAll('.projects-grid, .tracks-grid, .skills-grid, .exp-list, .life-cards, .beyond').forEach(grid => {
        [...grid.children].filter(el => el.classList.contains('reveal')).forEach((el, i) => el.style.setProperty('--stagger', Math.min(i, 4)));
    });
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                el.classList.add('visible');
                observer.unobserve(el);
                // Once it has arrived, hand the element back its own transitions (e.g. card hover)
                const done = (parseInt(el.style.getPropertyValue('--stagger') || 0, 10) * 60) + 450;
                setTimeout(() => { el.classList.remove('reveal', 'visible'); el.style.removeProperty('--stagger'); }, done);
            }
        });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(el => observer.observe(el));
}

/* --- Photo lightbox for experience galleries --- */
function initLightbox() {
    const zoomable = document.querySelectorAll('.prose-figure img, .project-aside figure img');
    let dialog = document.getElementById('lightbox');
    // Project pages don't ship the dialog markup; create it when there are figures to zoom
    if (!dialog && zoomable.length) {
        dialog = document.createElement('dialog');
        dialog.className = 'lightbox';
        dialog.id = 'lightbox';
        dialog.setAttribute('aria-label', 'Image viewer');
        dialog.innerHTML = '<button class="icon-btn lightbox-close" type="button" aria-label="Close">✕</button><figure><img alt=""><figcaption></figcaption></figure>';
        document.body.appendChild(dialog);
    }
    if (!dialog || typeof dialog.showModal !== 'function') return;
    const img = dialog.querySelector('img');
    const caption = dialog.querySelector('figcaption');

    const open = (src, text) => {
        // Large diagrams get a pannable, larger-than-screen view on small screens
        dialog.classList.toggle('wide', src.naturalWidth >= 1600);
        img.src = src.currentSrc || src.src;
        img.alt = src.alt;
        caption.textContent = text || src.alt;
        dialog.showModal();
    };
    document.querySelectorAll('[data-lightbox]').forEach(btn => {
        btn.addEventListener('click', () => open(btn.querySelector('img')));
    });
    zoomable.forEach(el => {
        el.style.cursor = 'zoom-in';
        el.addEventListener('click', () => {
            const cap = el.closest('figure')?.querySelector('figcaption');
            open(el, cap ? cap.textContent : '');
        });
    });
    dialog.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
}

/* --- Hide links to files that haven't been added yet (e.g. the CV PDF) --- */
function hideMissingFileLinks() {
    const links = document.querySelectorAll('[data-requires-file]');
    const checked = {};
    links.forEach(link => {
        const url = link.getAttribute('href');
        if (!checked[url]) {
            checked[url] = fetch(url, { method: 'HEAD' }).then(r => r.ok).catch(() => false);
        }
        checked[url].then(ok => { if (!ok) link.hidden = true; });
    });
}

/* --- Background orbit animation --- */
function initOrbitalSimulation() {
    const canvas = document.getElementById('orbit-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;

    const resize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 70 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.3,
        a: Math.random() * 0.7 + 0.2,
        v: Math.random() * 0.12 + 0.03
    }));

    const scale = width <= 768 ? 0.55 : 1;
    const orbits = [
        { rx: 230, ry: 95, angle: 0, speed: 0.003, color: '#38bdf8' },
        { rx: 350, ry: 145, angle: Math.PI / 3, speed: 0.002, color: '#a78bfa' },
        { rx: 140, ry: 58, angle: Math.PI * 2 / 3, speed: 0.005, color: '#fb923c' }
    ].map(o => ({ ...o, rx: o.rx * scale, ry: o.ry * scale, trail: [] }));

    function draw(advance) {
        const light = isLight();
        ctx.clearRect(0, 0, width, height);

        const cx = width <= 768 ? width * 0.7 : width * 0.78;
        const cy = width <= 768 ? height * 0.85 : height * 0.42;

        stars.forEach(s => {
            if (advance) { s.y += s.v; if (s.y > height) { s.y = 0; s.x = Math.random() * width; } }
            ctx.fillStyle = light ? `rgba(15, 23, 42, ${s.a * 0.35})` : `rgba(255, 255, 255, ${s.a})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // Central body
        const r = (width <= 768 ? 40 : 58);
        const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 2, cx, cy, r);
        g.addColorStop(0, light ? '#e0f2fe' : '#bae6fd');
        g.addColorStop(0.5, light ? '#38bdf8' : '#0284c7');
        g.addColorStop(1, light ? '#075985' : '#0c1a33');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        orbits.forEach(o => {
            if (advance) o.angle += o.speed;
            const x = cx + Math.cos(o.angle) * o.rx;
            const y = cy + Math.sin(o.angle) * o.ry + Math.cos(o.angle) * o.rx * 0.1;
            o.trail.push({ x, y });
            if (o.trail.length > 40) o.trail.shift();

            ctx.strokeStyle = o.color + (light ? '30' : '22');
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(cx, cy, o.rx, o.ry, Math.PI / 30, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = o.color + '70';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            o.trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
            ctx.stroke();

            ctx.fillStyle = o.color;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Static backdrop: drawn once, redrawn only on resize or theme change (no endless motion)
    const redraw = () => draw(false);
    redraw();
    window.addEventListener('resize', redraw);
    new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

/* --- Highlight the current section in a project page's "On this page" list --- */
function initToc() {
    const links = document.querySelectorAll('.toc a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
        });
    }, { rootMargin: '-30% 0px -60% 0px' });
    links.forEach(a => { const s = document.querySelector(a.getAttribute('href')); if (s) observer.observe(s); });
}

/* --- YouTube demo: muted autoplay at a chosen speed while the player is on screen --- */
function initYouTubeEmbeds() {
    const hosts = document.querySelectorAll('.yt-embed[data-yt]');
    if (!hosts.length) return;
    // YouTube refuses to play without a referrer (error 153), which a file:// page can't send:
    // keep the cover linking to YouTube in that case, and say so on the cover.
    if (location.protocol === 'file:') {
        hosts.forEach(h => h.classList.add('is-offline'));
        return;
    }

    const onScreen = el => {
        const r = el.getBoundingClientRect();
        const shown = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
        return r.height > 0 && shown / r.height >= 0.5;
    };

    // Clicking the cover plays the video here, even before YouTube's player has loaded
    hosts.forEach(host => {
        const cover = host.querySelector('.yt-fallback');
        if (!cover) return;
        cover.addEventListener('click', e => {
            e.preventDefault();
            host.dataset.wantPlay = '1';
            host.classList.add('is-ready');
            if (host.ytPlay) host.ytPlay();
        });
    });

    const build = () => hosts.forEach(host => {
        const rate = parseFloat(host.dataset.rate) || 1;
        // Build the iframe ourselves so it always carries a referrer policy and our origin
        const iframe = document.createElement('iframe');
        const params = new URLSearchParams({ enablejsapi: 1, mute: 1, playsinline: 1, rel: 0, modestbranding: 1, origin: location.origin });
        iframe.src = `https://www.youtube.com/embed/${host.dataset.yt}?${params}`;
        iframe.title = host.dataset.title || 'YouTube video';
        iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.allowFullscreen = true;
        host.appendChild(iframe);

        let playing = false;
        let player = null;
        const sync = () => {
            // The player object exists before its methods do; wait for onReady
            if (!player || typeof player.playVideo !== 'function' || prefersReducedMotion) return;
            const show = onScreen(host);
            if (show && !playing) { player.playVideo(); playing = true; }
            else if (!show && playing) { player.pauseVideo(); playing = false; }
        };
        player = new YT.Player(iframe, {
            events: {
                onReady: e => {
                    host.classList.add('is-ready');
                    e.target.mute();
                    e.target.setPlaybackRate(rate);
                    if (host.dataset.wantPlay) { e.target.playVideo(); playing = true; } else sync();
                },
                onStateChange: e => {
                    // YouTube can reset the speed on (re)start, so re-apply it whenever playback begins
                    if (e.data === YT.PlayerState.PLAYING && e.target.getPlaybackRate() !== rate) e.target.setPlaybackRate(rate);
                    if (e.data === YT.PlayerState.ENDED) { e.target.seekTo(0); e.target.playVideo(); }
                },
                // If YouTube rejects the embed, fall back to the cover linking to the video
                onError: () => { host.classList.remove('is-ready'); iframe.remove(); }
            }
        });
        host.ytPlayer = player;
        host.ytSync = sync;
        host.ytPlay = () => { if (player.playVideo) { player.playVideo(); playing = true; } };
        // Play while at least half the player is on screen, pause when scrolled away
        new IntersectionObserver(sync, { threshold: [0, 0.5, 1] }).observe(host);
        let pending = null;
        window.addEventListener('scroll', () => { clearTimeout(pending); pending = setTimeout(sync, 120); }, { passive: true });
        window.addEventListener('resize', sync);
    });

    if (window.YT && window.YT.Player) return build();
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (previous) previous(); build(); };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    document.head.appendChild(tag);
}
