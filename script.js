/**
 * SaferSky – script.js  (v3)
 * Modules:
 *   1. Sticky-header class on scroll
 *   2. Mobile menu toggle
 *   3. Smooth anchor scroll (respects fixed header)
 *   4. Scroll-reveal (IntersectionObserver + staggered delays)
 *   5. Airspace visualization canvas (radar / live feed)
 *   6. Why-SaferSky video — play on hover/click, pause on leave
 */

document.addEventListener('DOMContentLoaded', () => {

    /* =====================================================================
       0. Anti-Copy Protection
       ===================================================================== */
    document.addEventListener('contextmenu', e => e.preventDefault());

    /* =====================================================================
       1. Sticky Header
       ===================================================================== */
    const header = document.getElementById('site-header');
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });


    /* =====================================================================
       2. Mobile Menu Toggle
       ===================================================================== */
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            const open = navLinks.classList.toggle('active');
            menuToggle.classList.toggle('active', open);
            menuToggle.setAttribute('aria-expanded', open);
        });
    }


    /* =====================================================================
       3. Smooth Anchor Scroll
       ===================================================================== */
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            const id = this.getAttribute('href');
            if (id === '#') return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();

            // Close mobile menu
            navLinks.classList.remove('active');
            menuToggle.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');

            // Dynamically read the current nav height (changes at breakpoints)
            const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 280;
            const top = target.getBoundingClientRect().top + window.scrollY - navH;
            window.scrollTo({ top, behavior: 'smooth' });
        });
    });


    /* =====================================================================
       4. Scroll-Reveal (IntersectionObserver)
       ===================================================================== */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const delay = parseInt(el.dataset.delay || 0, 10);
                setTimeout(() => el.classList.add('is-visible'), delay);
                revealObserver.unobserve(el);
            }
        });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


    /* =====================================================================
       5. Airspace Visualization Canvas (radar style)
       ===================================================================== */
    (() => {
        const canvas = document.getElementById('airspace-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        let W, H, drones = [], redZones = [], safePaths = [], radarAngle = 0, tick = 0;

        function seeded(s) { return (Math.sin(s * 9301 + 49297) + 1) / 2; }

        function init() {
            W = canvas.width = canvas.parentElement.offsetWidth || 400;
            H = canvas.height = canvas.parentElement.clientHeight || 300;

            redZones = [
                { x: W * 0.15, y: H * 0.25, r: Math.min(W, H) * 0.07 },
                { x: W * 0.75, y: H * 0.55, r: Math.min(W, H) * 0.085 },
                { x: W * 0.5, y: H * 0.75, r: Math.min(W, H) * 0.06 },
            ];

            safePaths = [
                { x1: W * 0.05, y1: H * 0.5, x2: W * 0.95, y2: H * 0.4 },
                { x1: W * 0.3, y1: H * 0.05, x2: W * 0.35, y2: H * 0.95 },
            ];

            drones = Array.from({ length: 8 }, (_, i) => ({
                path: Math.floor(seeded(i * 3) * safePaths.length),
                t: seeded(i * 7),
                speed: seeded(i * 11) * 0.0015 + 0.0005,
                col: seeded(i * 5) > 0.5 ? '#3B82F6' : '#22c55e',
            }));
        }

        function drawGrid() {
            const step = Math.min(W, H) / 10;
            ctx.strokeStyle = 'rgba(59,130,246,0.06)';
            ctx.lineWidth = 0.5;
            for (let x = 0; x <= W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
            for (let y = 0; y <= H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        }

        function drawSafePaths() {
            safePaths.forEach(p => {
                ctx.setLineDash([6, 6]);
                ctx.lineWidth = 12;
                ctx.strokeStyle = 'rgba(34,197,94,0.07)';
                ctx.beginPath(); ctx.moveTo(p.x1, p.y1); ctx.lineTo(p.x2, p.y2); ctx.stroke();

                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(34,197,94,0.35)';
                ctx.beginPath(); ctx.moveTo(p.x1, p.y1); ctx.lineTo(p.x2, p.y2); ctx.stroke();
                ctx.setLineDash([]);
            });
        }

        function drawRedZones() {
            redZones.forEach(z => {
                const pulseR = z.r + Math.sin(tick * 0.03) * 5;
                const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, pulseR);
                g.addColorStop(0, 'rgba(239,68,68,0.18)');
                g.addColorStop(0.8, 'rgba(239,68,68,0.05)');
                g.addColorStop(1, 'transparent');
                ctx.beginPath(); ctx.arc(z.x, z.y, pulseR, 0, Math.PI * 2);
                ctx.fillStyle = g; ctx.fill();

                ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(239,68,68,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();

                const s = z.r * 0.32;
                ctx.strokeStyle = 'rgba(239,68,68,0.5)'; ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(z.x - s, z.y - s); ctx.lineTo(z.x + s, z.y + s);
                ctx.moveTo(z.x + s, z.y - s); ctx.lineTo(z.x - s, z.y + s);
                ctx.stroke();
            });
        }

        function drawRadarSweep() {
            ctx.save();
            ctx.translate(W * 0.5, H * 0.5);
            ctx.rotate(radarAngle);
            const rMax = Math.max(W, H);
            const sweep = ctx.createLinearGradient(0, 0, rMax, 0);
            sweep.addColorStop(0, 'rgba(59,130,246,0.2)');
            sweep.addColorStop(0.6, 'rgba(59,130,246,0.04)');
            sweep.addColorStop(1, 'rgba(59,130,246,0)');
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, rMax, -0.3, 0.3);
            ctx.closePath();
            ctx.fillStyle = sweep;
            ctx.fill();
            ctx.restore();
            radarAngle += 0.008;
        }

        function lerpPath(p, t) { return { x: p.x1 + (p.x2 - p.x1) * t, y: p.y1 + (p.y2 - p.y1) * t }; }

        function drawDrones() {
            drones.forEach(d => {
                d.t = (d.t + d.speed) % 1;
                const { x, y } = lerpPath(safePaths[d.path], d.t);

                const grd = ctx.createRadialGradient(x, y, 0, x, y, 12);
                grd.addColorStop(0, d.col + '88');
                grd.addColorStop(1, 'transparent');
                ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2);
                ctx.fillStyle = grd; ctx.fill();

                ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = d.col; ctx.fill();

                if (Math.sin(tick * 0.05 + d.t * 10) > 0.6) {
                    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
                    ctx.strokeStyle = d.col + '55'; ctx.lineWidth = 1; ctx.stroke();
                }
            });
        }

        function drawCompass() {
            const cx = W - 28, cy = H - 28, r = 14;
            ctx.strokeStyle = 'rgba(168,176,192,0.2)'; ctx.lineWidth = 0.8;
            [[0, -r], [r, 0], [0, r], [-r, 0]].forEach(([dx, dy]) => {
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx, cy + dy); ctx.stroke();
            });
            ctx.fillStyle = 'rgba(168,176,192,0.35)';
            ctx.font = '8px Inter, sans-serif';
            ctx.fillText('N', cx - 3, cy - r - 3);
        }

        let animating = false;
        function frame() {
            ctx.clearRect(0, 0, W, H);
            drawGrid();
            drawRadarSweep();
            drawSafePaths();
            drawRedZones();
            drawDrones();
            drawCompass();
            tick++;
            requestAnimationFrame(frame);
        }

        const vizObserver = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !animating) {
                animating = true;
                init();
                frame();
                vizObserver.disconnect();
            }
        }, { threshold: 0.1 });

        vizObserver.observe(canvas);
        window.addEventListener('resize', () => { if (animating) init(); }, { passive: true });
    })();


    /* =====================================================================
       6. Why-SaferSky video — play on hover, click to toggle
       ===================================================================== */
    (() => {
        const card = document.getElementById('why-video-card');
        const video = document.getElementById('why-video');
        const overlay = document.getElementById('play-overlay');
        if (!card || !video) return;

        let hoverPlaying = false;

        // Play on mouse enter
        card.addEventListener('mouseenter', () => {
            if (video.paused) {
                video.play().catch(() => { });
                hoverPlaying = true;
                card.classList.add('playing');
            }
        });

        // Pause on mouse leave (unless user explicitly clicked to keep playing)
        card.addEventListener('mouseleave', () => {
            if (hoverPlaying && !video.dataset.clicked) {
                video.pause();
                video.currentTime = 0;
                hoverPlaying = false;
                card.classList.remove('playing');
            }
        });

        // Click to toggle play/pause (sticky — won't stop on mouse leave)
        card.addEventListener('click', () => {
            if (video.paused) {
                video.play().catch(() => { });
                video.dataset.clicked = '1';
                card.classList.add('playing');
            } else {
                video.pause();
                video.currentTime = 0;
                delete video.dataset.clicked;
                hoverPlaying = false;
                card.classList.remove('playing');
            }
        });

        // Keyboard accessibility — Enter/Space
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    })();

    /* =====================================================================
       11. Contact Us Modal Logic
       ===================================================================== */
    const contactModal = document.getElementById('contact-modal');
    const contactForm = document.getElementById('contact-form');
    const contactStatus = document.getElementById('contact-status');
    const charCurrent = document.getElementById('char-current');
    const contactMessage = document.getElementById('contact-message');

    window.openContactModal = function () {
        if (!contactModal) return;
        contactModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // prevent bg scroll
    };

    window.closeContactModal = function () {
        if (!contactModal) return;
        contactModal.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            if (contactForm) contactForm.reset();
            if (contactStatus) {
                contactStatus.textContent = '';
                contactStatus.className = 'form-status';
            }
            if (charCurrent) charCurrent.textContent = '0';
        }, 300);
    };

    // Close on outside click
    if (contactModal) {
        contactModal.addEventListener('click', (e) => {
            if (e.target === contactModal) {
                closeContactModal();
            }
        });
    }

    // Character count update
    if (contactMessage && charCurrent) {
        contactMessage.addEventListener('input', () => {
            charCurrent.textContent = contactMessage.value.length;
        });
    }

    // Form Submission
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = document.getElementById('contact-submit');
            const originalBtnText = submitBtn.innerHTML;

            submitBtn.innerHTML = 'Sending...';
            submitBtn.disabled = true;
            if (contactStatus) {
                contactStatus.textContent = '';
                contactStatus.className = 'form-status';
            }

            const formData = {
                name: document.getElementById('contact-name').value,
                email: document.getElementById('contact-email').value,
                subject: document.getElementById('contact-subject').value,
                message: document.getElementById('contact-message').value
            };

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    if (contactStatus) {
                        contactStatus.textContent = "Thank you! Your message has been sent.";
                        contactStatus.classList.add('success');
                    }
                    setTimeout(() => {
                        closeContactModal();
                    }, 2500);
                } else {
                    throw new Error(result.error || 'Failed to send');
                }
            } catch (error) {
                console.error("Submission error:", error);
                if (contactStatus) {
                    contactStatus.textContent = "Oops! Something went wrong. Please try again.";
                    contactStatus.classList.add('error');
                }
            } finally {
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

}); // end DOMContentLoaded
