// Initialize features on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Navbar Elements
    const navbar = document.getElementById('navbar');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const navbarBackdrop = document.getElementById('navbar-backdrop');

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('navbar-scrolled');
            } else {
                navbar.classList.remove('navbar-scrolled');
            }
        }
    });

    // Mobile menu toggle
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', (e) => {
            mobileMenu.classList.toggle('hidden');
        });

        // Close mobile menu when a link is clicked
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                mobileMenu.classList.add('hidden');
            }
        });
    }

    // Navbar backdrop fade effect
    if (navbar && navbarBackdrop) {
        navbar.addEventListener('click', (e) => {
            // Only toggle if we're clicking the navbar itself, not a link inside it
            // unless it's the mobile menu button
            if (e.target.closest('a') && !e.target.closest('#mobile-menu-btn')) {
                navbarBackdrop.classList.remove('backdrop-visible');
                return;
            }
            navbarBackdrop.classList.toggle('backdrop-visible');
        });

        // Close backdrop when clicking on it
        navbarBackdrop.addEventListener('click', () => {
            navbarBackdrop.classList.remove('backdrop-visible');
            if (mobileMenu) mobileMenu.classList.add('hidden');
        });

        // Close backdrop when a nav link is clicked
        document.querySelectorAll('.nav-link, #mobile-menu a').forEach(link => {
            link.addEventListener('click', () => {
                navbarBackdrop.classList.remove('backdrop-visible');
            });
        });
    }

    // AI Agent Modal Logic
    const aiModal = document.getElementById('ai-modal');
    const closeAiModal = document.getElementById('close-ai-modal');
    const tryAiBtn = document.getElementById('try-ai-btn');
    const aiChatForm = document.getElementById('ai-chat-form');
    const aiInput = document.getElementById('ai-input');
    const aiChatBody = document.getElementById('ai-chat-body');

    window.openAiAgent = () => {
        const modal = document.getElementById('ai-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.body.classList.add('overflow-hidden');
        }
    };

    window.closeAiAgent = () => {
        const modal = document.getElementById('ai-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.classList.remove('overflow-hidden');
        }
    };

    if (tryAiBtn) tryAiBtn.addEventListener('click', window.openAiAgent);
    if (closeAiModal) closeAiModal.addEventListener('click', window.closeAiAgent);

    // Event delegation for AI button (as a backup)
    document.addEventListener('click', (e) => {
        if (e.target.closest('#try-ai-btn')) {
            window.openAiAgent();
        }
        if (e.target.closest('#close-ai-modal')) {
            window.closeAiAgent();
        }
    });

    if (aiChatForm) {
        aiChatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = aiInput.value.trim();
            if (!text) return;

            // Add user message
            addChatMessage(text, 'user');
            aiInput.value = '';

            try {
                const token = localStorage.getItem('access_token');
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ message: text }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Failed to connect');
                }

                const result = await response.json();
                addChatMessage(result.response || "I'm sorry, I couldn't process that.", 'ai');
            } catch (error) {
                addChatMessage("Sorry, I'm having trouble connecting to the NAIRA brain right now. Please try again later.", 'ai');
            }
        });
    }

    function addChatMessage(text, sender) {
        if (!aiChatBody) return;
        const div = document.createElement('div');
        div.className = sender === 'user' ? 'flex justify-end' : 'flex items-start gap-3';

        if (sender === 'user') {
            div.innerHTML = `
                <div class="bg-indigo-600 rounded-2xl rounded-tr-none p-3 text-sm text-white max-w-[80%]">
                    ${text}
                </div>
            `;
        } else {
            div.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
                    <i data-feather="cpu" class="w-4 h-4 text-indigo-400"></i>
                </div>
                <div class="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-3 text-sm text-slate-300 max-w-[80%]">
                    ${text}
                </div>
            `;
        }

        aiChatBody.appendChild(div);
        if (window.feather) feather.replace();
        aiChatBody.scrollTop = aiChatBody.scrollHeight;
    }

    // Dark/Light Mode Logic
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleMobile = document.getElementById('theme-toggle-mobile');
    const themeIconDark = document.getElementById('theme-icon-dark');
    const themeIconLight = document.getElementById('theme-icon-light');

    const applyTheme = (theme) => {
        if (theme === 'light') {
            document.documentElement.classList.add('light-mode');
            if (themeIconDark) themeIconDark.classList.add('hidden');
            if (themeIconLight) themeIconLight.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('light-mode');
            if (themeIconDark) themeIconDark.classList.remove('hidden');
            if (themeIconLight) themeIconLight.classList.add('hidden');
        }
    };

    const toggleTheme = () => {
        const currentTheme = document.documentElement.classList.contains('light-mode') ? 'light' : 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    };

    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (themeToggleMobile) themeToggleMobile.addEventListener('click', toggleTheme);

    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    applyTheme(savedTheme);

    // Multilingual Logic
    const translations = {
        'en': {
            'nav-home': 'Home',
            'nav-vision': 'Vision',
            'nav-pillars': 'Pillars',
            'nav-architecture': 'Architecture',
            'nav-revenue': 'Revenue',
            'nav-content': 'Content',
            'nav-immersive': 'Immersive',
            'nav-projects': 'Projects',
            'hero-title': 'NAIRA',
            'hero-badge': "Pioneering Africa's AI Renaissance",
            'hero-subtitle': 'NBU ARTIFICIAL INTELLIGENCE RESEARCH & ADVANCEMENT INSTITUTE',
            'hero-description': 'Transforming education and innovation through immersive XR experiences and agentic AI architectures, embedding African languages, culture, and indigenous knowledge into global technology solutions.',
            'contact-direct-title': 'Direct Email',
            'contact-direct-desc': 'You can also reach us directly at:',
            'nav-auth': 'Login',
            'hero-auth': 'Login',
            'nav-profile': 'Profile',
            'hero-profile': 'Profile'
        },
        'yo': {
            'nav-home': 'Ile',
            'nav-vision': 'Iriran',
            'nav-pillars': 'Awọn Opó',
            'nav-architecture': 'Imọ-iṣelọpọ',
            'nav-revenue': 'Owo-wiwọle',
            'nav-content': 'Àkóónú',
            'nav-immersive': 'Immersive',
            'nav-projects': 'Awọn Ise-Agbeṣe',
            'hero-title': 'NAIRA',
            'hero-badge': "Asiwaju Isọji AI ti Afirika",
            'hero-subtitle': 'ILE-IṢẸ NBU FUN IWADII ATI ILỌSIWAJU AI',
            'hero-description': 'Yiyipada eto ẹkọ ati isọdọtun nipasẹ awọn iriri XR immersive ati awọn faaji AI aṣoju, fifi awọn ede Afirika, aṣa, ati imọ abinibi sinu awọn ojutu imọ-ẹrogbaye.',
            'contact-direct-title': 'Imeeli Taara',
            'contact-direct-desc': 'O tun le kan si wa taara ni:',
            'nav-auth': 'Wọle',
            'hero-auth': 'Wọle',
            'nav-profile': 'Profaili',
            'hero-profile': 'Profaili'
        },
        'sw': {
            'nav-home': 'Nyumbani',
            'nav-vision': 'Maono',
            'nav-pillars': 'Nguzo',
            'nav-architecture': 'Usanifu',
            'nav-revenue': 'Mapato',
            'nav-content': 'Maudhui',
            'nav-immersive': 'Immersive',
            'nav-projects': 'Miradi',
            'hero-title': 'NAIRA',
            'hero-badge': "Uanzilishi wa Renaissance ya AI ya Afrika",
            'hero-subtitle': 'TAASISI YA NBU YA UTAFITI NA MAENDELEO YA AI',
            'hero-description': 'Kubadilisha elimu na uvumbuzi kupitia uzoefu wa XR wa kuzama na usanifu wa AI, kupachika lugha za Kiafrika, utamaduni, na maarifa asilia katika suluhisho za teknolojia ya kimataifa.',
            'contact-direct-title': 'Barua Pepe ya Moja kwa Moja',
            'contact-direct-desc': 'Unaweza pia kuwasiliana nasi moja kwa moja kwa:',
            'nav-auth': 'Ingia',
            'hero-auth': 'Ingia',
            'nav-profile': 'Wasifu',
            'hero-profile': 'Wasifu'
        },
        'ig': {
            'nav-home': 'Ụlọ',
            'nav-vision': 'Ọhụụ',
            'nav-pillars': 'Ogidi',
            'nav-architecture': 'Nhazi',
            'nav-revenue': 'Ego nwetara',
            'nav-content': 'Ọdịnaya',
            'nav-immersive': 'Immersive',
            'nav-projects': 'Ihe omume',
            'hero-title': 'NAIRA',
            'hero-badge': "Ịsụ ụzọ AI Renaissance nke Africa",
            'hero-subtitle': 'NBU ARTIFICIAL INTELLIGENCE RESEARCH & ADVANCEMENT INSTITUTE',
            'hero-description': 'Ịgbanwe agụmakwụkwọ na ihe ọhụrụ site na ahụmịhe XR na-emikpu na usoro AI, na-etinye asụsụ Africa, omenala, na ihe ọmụma obodo n\'ime usoro teknụzụ zuru ụwa ọnụ.',
            'contact-direct-title': 'Ozi email ozugbo',
            'contact-direct-desc': 'Ị nwekwara ike ịkpọtụrụ anyị ozugbo na:',
            'nav-auth': 'Banye',
            'hero-auth': 'Banye',
            'nav-profile': 'Profaịlụ',
            'hero-profile': 'Profaịlụ'
        },
        'ha': {
            'nav-home': 'Gida',
            'nav-vision': 'Hasashe',
            'nav-pillars': 'Shika-shikai',
            'nav-architecture': 'Tsarin Gini',
            'nav-revenue': 'Kudaden Shiga',
            'nav-content': 'Abun Ciki',
            'nav-immersive': 'Immersive',
            'nav-projects': 'Ayyuka',
            'hero-title': 'NAIRA',
            'hero-badge': "Jagorar Farfadowar AI ta Afirka",
            'hero-subtitle': 'CIBIYAR BINCIKE DA CIGABAN AI TA NBU',
            'hero-description': 'Canza ilimi da sabbin abubuwa ta hanyar abubuwan XR masu zurfi da tsarin AI, sanya harsunan Afirka, al\'adu, da ilimin asali cikin hanyoyin fasahar duniya.',
            'contact-direct-title': 'Direct Email',
            'contact-direct-desc': 'Kuna iya tuntuɓar mu kai tsaye a:',
            'nav-auth': 'Shiga',
            'hero-auth': 'Shiga',
            'nav-profile': 'Profile',
            'hero-profile': 'Profile'
        }
    };

    window.switchLang = (lang) => {
        localStorage.setItem('lang', lang);
        applyLang(lang);
        if (window.updateAuthLinks) window.updateAuthLinks();
    };

    const applyLang = (lang) => {
        const langStrings = translations[lang] || translations['en'];
        document.querySelectorAll('[data-key]').forEach(el => {
            const key = el.getAttribute('data-key');
            // Skip auth-link as it's handled by updateAuthLinks
            if (el.classList.contains('auth-link')) return;
            if (langStrings[key]) {
                el.textContent = langStrings[key];
            }
        });

        // Specifically handle hero elements if they exist on the page
        const heroTitle = document.getElementById('hero-title');
        const heroBadge = document.getElementById('hero-badge');
        const heroSubtitle = document.getElementById('hero-subtitle');
        const heroDescription = document.getElementById('hero-description');

        if (heroTitle && langStrings['hero-title']) heroTitle.textContent = langStrings['hero-title'];
        if (heroBadge && langStrings['hero-badge']) heroBadge.textContent = langStrings['hero-badge'];
        if (heroSubtitle && langStrings['hero-subtitle']) heroSubtitle.textContent = langStrings['hero-subtitle'];
        if (heroDescription && langStrings['hero-description']) heroDescription.textContent = langStrings['hero-description'];

        const langDisplay = document.getElementById('current-lang');
        if (langDisplay) langDisplay.textContent = lang.toUpperCase();
    };

    // Initialize language from localStorage
    const savedLang = localStorage.getItem('lang') || 'en';
    applyLang(savedLang);

    // Authentication Link Handling
    window.updateAuthLinks = () => {
        const token = localStorage.getItem('access_token');
        const authLinks = document.querySelectorAll('.auth-link');
        const lang = localStorage.getItem('lang') || 'en';
        const langStrings = translations[lang] || translations['en'];

        authLinks.forEach(link => {
            const textEl = link.querySelector('.auth-text') || link;
            if (token) {
                link.href = '/profile';
                const key = link.getAttribute('data-key');
                if (key === 'nav-auth') textEl.textContent = langStrings['nav-profile'] || 'Profile';
                else if (key === 'hero-auth') textEl.textContent = langStrings['hero-profile'] || 'Profile';
                else textEl.textContent = 'Profile';
            } else {
                link.href = '/login';
                const key = link.getAttribute('data-key');
                if (key === 'nav-auth') textEl.textContent = langStrings['nav-auth'] || 'Login';
                else if (key === 'hero-auth') textEl.textContent = langStrings['hero-auth'] || 'Login';
                else textEl.textContent = 'Login';
            }
        });
    };
    window.updateAuthLinks();

    // Load CAPTCHA
    const loadCaptcha = async () => {
        const captchaQuestion = document.getElementById('captcha-question');
        const captchaToken = document.getElementById('captcha-token');
        if (captchaQuestion && captchaToken) {
            try {
                const response = await fetch('/api/captcha');
                const result = await response.json();
                captchaQuestion.textContent = result.question;
                captchaToken.value = result.captcha_token;
            } catch (error) {
                captchaQuestion.textContent = "Error loading CAPTCHA";
            }
        }
    };
    loadCaptcha();

    // Contact Form Submission
    const contactForm = document.getElementById('contact-form');
    const contactStatus = document.getElementById('contact-status');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(contactForm);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                role: formData.get('role') || '',
                message: formData.get('message'),
                website_url: formData.get('website_url'),
                captcha_token: formData.get('captcha_token'),
                captcha_answer: formData.get('captcha_answer'),
            };
            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await response.json();
                if (contactStatus) {
                    contactStatus.classList.remove('hidden');
                    if (result.success) {
                        contactStatus.className = 'text-center py-3 px-4 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30';
                        contactStatus.textContent = result.message;
                        contactForm.reset();
                        loadCaptcha();
                    } else {
                        contactStatus.className = 'text-center py-3 px-4 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30';
                        contactStatus.textContent = result.message || 'Something went wrong. Please try again.';
                    }
                    setTimeout(() => {
                        contactStatus.classList.add('hidden');
                    }, 5000);
                }
            } catch (error) {
                if (contactStatus) {
                    contactStatus.classList.remove('hidden');
                    contactStatus.className = 'text-center py-3 px-4 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30';
                    contactStatus.textContent = 'Network error. Please try again.';
                }
            }
        });
    }

    // Newsletter Form Submission
    const handleNewsletterSubmit = async (form, statusEl) => {
        const formData = new FormData(form);
        const data = {
            email: formData.get('email'),
            website_url: formData.get('website_url'),
        };
        try {
            const response = await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (statusEl) {
                statusEl.classList.remove('hidden');
                if (result.success) {
                    statusEl.className = 'text-center py-2 px-4 rounded-xl mt-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30';
                    statusEl.textContent = result.message;
                    form.reset();
                } else {
                    statusEl.className = 'text-center py-2 px-4 rounded-xl mt-3 bg-amber-600/20 text-amber-400 border border-amber-500/30';
                    statusEl.textContent = result.message;
                }
                setTimeout(() => {
                    statusEl.classList.add('hidden');
                }, 5000);
            }
        } catch (error) {
            if (statusEl) {
                statusEl.classList.remove('hidden');
                statusEl.className = 'text-center py-2 px-4 rounded-xl mt-3 bg-red-600/20 text-red-400 border border-red-500/30';
                statusEl.textContent = 'Network error. Please try again.';
            }
        }
    };

    const newsletterForm = document.getElementById('newsletter-form');
    const newsletterStatus = document.getElementById('newsletter-status');
    if (newsletterForm && newsletterStatus) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleNewsletterSubmit(newsletterForm, newsletterStatus);
        });
    }

    const newsletterFormHome = document.getElementById('newsletter-form-home');
    const newsletterStatusHome = document.getElementById('newsletter-status-home');
    if (newsletterFormHome && newsletterStatusHome) {
        newsletterFormHome.addEventListener('submit', (e) => {
            e.preventDefault();
            handleNewsletterSubmit(newsletterFormHome, newsletterStatusHome);
        });
    }
});
