document.addEventListener('DOMContentLoaded', () => {
    /* --- Sticky Navbar --- */
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    /* --- Mobile Menu Toggle --- */
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    /* --- Scroll Animations (Intersection Observer) --- */
    const fadeElements = document.querySelectorAll('.fade-in, .fade-in-up, .fade-in-right');
    
    // Set initial styles for elements to animate
    fadeElements.forEach(el => {
        el.style.opacity = '0';
        if (el.classList.contains('fade-in-up')) {
            el.style.transform = 'translateY(30px)';
        } else if (el.classList.contains('fade-in-right')) {
            el.style.transform = 'translateX(30px)';
        }
        el.style.transition = 'opacity 0.8s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)';
    });

    const appearOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const appearOnScroll = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.style.opacity = '1';
                if (entry.target.classList.contains('fade-in-up') || entry.target.classList.contains('fade-in-right')) {
                    entry.target.style.transform = 'translate(0)';
                }
                observer.unobserve(entry.target);
            }
        });
    }, appearOptions);

    fadeElements.forEach(el => {
        appearOnScroll.observe(el);
    });

    /* --- Parallax Mouse Effect on Glow --- */
    const glow1 = document.querySelector('.glow-1');
    const glow2 = document.querySelector('.glow-2');

    document.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        if(glow1) {
            glow1.style.transform = `translate(${x * -50}px, ${y * -50}px)`;
        }
        if(glow2) {
            glow2.style.transform = `translate(${x * 50}px, ${y * 50}px)`;
        }
    });
});
