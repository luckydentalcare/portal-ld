/**
 * LUCKY DENTAL CARE — OFFICIAL CLIENT JAVASCRIPT
 * ESTD 1982 | 44 YEARS OF EXPERIENCE | SMILE FOR LIFE
 * Production vanilla JS for interactive components, gallery lightbox,
 * appointment modal, FAQ accordion, statistics counter, and mobile menu.
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. STICKY NAVBAR & BACK TO TOP
  // --------------------------------------------------------------------------
  const navbar = document.querySelector('.navbar-wrapper');
  const backToTopBtn = document.getElementById('backToTopBtn');

  function handleScroll() {
    const scrollPos = window.scrollY;

    if (navbar) {
      if (scrollPos > 50) {
        navbar.classList.add('navbar-scrolled');
      } else {
        navbar.classList.remove('navbar-scrolled');
      }
    }

    if (backToTopBtn) {
      if (scrollPos > 400) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --------------------------------------------------------------------------
  // 2. MOBILE NAVIGATION DRAWER
  // --------------------------------------------------------------------------
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const drawerLinks = document.querySelectorAll('.drawer-link');

  function openDrawer() {
    if (mobileDrawer && drawerOverlay) {
      mobileDrawer.classList.add('active');
      drawerOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDrawer() {
    if (mobileDrawer && drawerOverlay) {
      mobileDrawer.classList.remove('active');
      drawerOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (mobileToggle) {
    mobileToggle.addEventListener('click', openDrawer);
  }

  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeDrawer);
  }

  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', closeDrawer);
  }

  drawerLinks.forEach(function (link) {
    link.addEventListener('click', closeDrawer);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileDrawer && mobileDrawer.classList.contains('active')) {
      closeDrawer();
    }
  });

  // --------------------------------------------------------------------------
  // 3. STATS NUMBER COUNTER ANIMATION (BENGALI NUMERALS)
  // --------------------------------------------------------------------------
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function toBn(num) {
    return num.toString().replace(/\d/g, function(d) {
      return bnDigits[d];
    });
  }

  const statNumbers = document.querySelectorAll('.stat-number[data-target]');

  if ('IntersectionObserver' in window && statNumbers.length > 0) {
    const statsObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.getAttribute('data-target'), 10);
            const prefix = el.getAttribute('data-prefix') || '';
            const suffix = el.getAttribute('data-suffix') || '';
            const duration = 1600;
            const startTime = performance.now();

            function updateCount(currentTime) {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const ease = 1 - Math.pow(1 - progress, 4);
              const current = Math.floor(ease * target);

              el.textContent = prefix + toBn(current) + suffix;

              if (progress < 1) {
                requestAnimationFrame(updateCount);
              } else {
                el.textContent = prefix + toBn(target) + suffix;
              }
            }

            requestAnimationFrame(updateCount);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.25 }
    );

    statNumbers.forEach(function (stat) {
      statsObserver.observe(stat);
    });
  }

  // --------------------------------------------------------------------------
  // 4. SCROLL REVEAL ANIMATION SYSTEM & SERVICE DIRECTORY FILTER
  // --------------------------------------------------------------------------

  // IntersectionObserver for Scroll Animations
  const revealElements = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealElements.length > 0) {
    const revealObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.1,
      }
    );

    revealElements.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    // Fallback if IntersectionObserver not supported
    revealElements.forEach(function (el) {
      el.classList.add('is-revealed');
    });
  }

  // Bengali Numeral Helper
  function toBengaliDigits(num) {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, d => bnDigits[d]);
  }

  // Heritage 44+ Counter Animation
  const counterElements = document.querySelectorAll('.about-exp-number, .animated-counter-number');
  if ('IntersectionObserver' in window && counterElements.length > 0) {
    const counterObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const targetEl = entry.target;
            observer.unobserve(targetEl);

            let count = 0;
            const target = 44;
            const duration = 1500;
            const stepTime = Math.abs(Math.floor(duration / target));

            const timer = setInterval(function () {
              count += 1;
              targetEl.textContent = `${toBengaliDigits(count)}+`;
              if (count >= target) {
                clearInterval(timer);
                targetEl.textContent = `${toBengaliDigits(target)}+`;
              }
            }, stepTime);
          }
        });
      },
      { threshold: 0.3 }
    );

    counterElements.forEach(function (el) {
      counterObserver.observe(el);
    });
  }

  // Service Directory Category Filter (for service.html)
  const serviceFilterBtns = document.querySelectorAll('.service-filter-btn');
  const serviceCards = document.querySelectorAll('.tdc-service-card-item');

  if (serviceFilterBtns.length > 0 && serviceCards.length > 0) {
    serviceFilterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        serviceFilterBtns.forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');

        const filterVal = btn.getAttribute('data-filter');

        serviceCards.forEach(function (card) {
          const category = card.getAttribute('data-category');
          if (filterVal === 'all' || category === filterVal) {
            card.style.display = '';
            card.style.opacity = '0';
            setTimeout(function () {
              card.style.transition = 'opacity 0.35s ease';
              card.style.opacity = '1';
            }, 30);
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // --------------------------------------------------------------------------
  // 5. FAQ ACCORDION
  // --------------------------------------------------------------------------
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(function (item) {
    const questionBtn = item.querySelector('.faq-question-btn');
    const answer = item.querySelector('.faq-answer');

    if (questionBtn && answer) {
      questionBtn.addEventListener('click', function () {
        const isActive = item.classList.contains('active');

        // Close all other items
        faqItems.forEach(function (otherItem) {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            const otherAnswer = otherItem.querySelector('.faq-answer');
            if (otherAnswer) otherAnswer.style.maxHeight = null;
            const otherBtn = otherItem.querySelector('.faq-question-btn');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        });

        // Toggle clicked item
        if (isActive) {
          item.classList.remove('active');
          answer.style.maxHeight = null;
          questionBtn.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('active');
          answer.style.maxHeight = answer.scrollHeight + 'px';
          questionBtn.setAttribute('aria-expanded', 'true');
        }
      });
    }
  });

  // Open first FAQ item by default
  if (faqItems.length > 0) {
    const firstItem = faqItems[0];
    const firstBtn = firstItem.querySelector('.faq-question-btn');
    const firstAnswer = firstItem.querySelector('.faq-answer');
    if (firstBtn && firstAnswer) {
      firstItem.classList.add('active');
      firstAnswer.style.maxHeight = firstAnswer.scrollHeight + 'px';
      firstBtn.setAttribute('aria-expanded', 'true');
    }
  }

  // --------------------------------------------------------------------------
  // 6. APPOINTMENT MODAL & BOOKING FORM
  // --------------------------------------------------------------------------
  const appointmentModal = document.getElementById('appointmentModal');
  const appointmentOpenBtns = document.querySelectorAll('.open-appointment-modal');
  const appointmentCloseBtn = document.getElementById('appointmentModalClose');
  const appointmentForm = document.getElementById('appointmentForm');
  const serviceSelect = document.getElementById('serviceSelect');

  function openAppointmentModal(serviceName) {
    if (!appointmentModal) return;
    if (serviceSelect && serviceName) {
      for (let i = 0; i < serviceSelect.options.length; i++) {
        if (serviceSelect.options[i].text.includes(serviceName) || serviceSelect.options[i].value === serviceName) {
          serviceSelect.selectedIndex = i;
          break;
        }
      }
    }
    appointmentModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeAppointmentModal() {
    if (!appointmentModal) return;
    appointmentModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  appointmentOpenBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const serviceName = btn.getAttribute('data-service') || '';
      openAppointmentModal(serviceName);
    });
  });

  if (appointmentCloseBtn) {
    appointmentCloseBtn.addEventListener('click', closeAppointmentModal);
  }

  if (appointmentModal) {
    appointmentModal.addEventListener('click', function (e) {
      if (e.target === appointmentModal) {
        closeAppointmentModal();
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && appointmentModal && appointmentModal.classList.contains('active')) {
      closeAppointmentModal();
    }
  });

  // Form submission handler
  if (appointmentForm) {
    appointmentForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = document.getElementById('patientName').value.trim();
      const phone = document.getElementById('patientPhone').value.trim();
      const service = serviceSelect ? serviceSelect.value : '';
      const date = document.getElementById('preferredDate').value;
      const time = document.getElementById('preferredTime').value;
      const note = document.getElementById('patientNote').value.trim();

      if (!name || !phone) {
        alert('অনুগ্রহ করে আপনার নাম এবং মোবাইল নম্বর প্রদান করুন।');
        return;
      }

      // WhatsApp text composition
      let message = `*Lucky Dental Care - অ্যাপয়েন্টমেন্ট অনুরোধ*\n\n`;
      message += `👤 *রোগীর নাম:* ${name}\n`;
      message += `📱 *মোবাইল নম্বর:* ${phone}\n`;
      if (service) message += `🦷 *সেবার ধরন:* ${service}\n`;
      if (date) message += `📅 *পছন্দের তারিখ:* ${date}\n`;
      if (time) message += `⏰ *পছন্দের সময়:* ${time}\n`;
      if (note) message += `📝 *বিবরণ:* ${note}\n`;

      const encodedMsg = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/8801715917834?text=${encodedMsg}`;

      // Confirmation UI
      const modalBox = appointmentForm.closest('.modal-content-box');
      if (modalBox) {
        modalBox.innerHTML = `
          <div style="text-align: center; padding: 25px 10px;">
            <div style="width: 72px; height: 72px; background: #fdf2f4; color: #941324; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; font-size: 2rem;">
              ✓
            </div>
            <h3 style="font-size: 1.6rem; color: #0f172a; margin-bottom: 12px;">ধন্যবাদ, ${name}!</h3>
            <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 25px;">
              আপনার অ্যাপয়েন্টমেন্টের তথ্য প্রস্তুত করা হয়েছে। দ্রুততম কনফার্মেশনের জন্য সরাসরি হোয়াটসঅ্যাপে প্রেরণ করুন অথবা আমাদের নাম্বারে কল করুন।
            </p>
            <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px; margin: 0 auto;">
              <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary-red" style="width: 100%;">
                হোয়াটসঅ্যাপে নিশ্চিত করুন
              </a>
              <a href="tel:01715917834" class="btn-secondary-white" style="width: 100%;">
                সরাসরি কল করুন: ০১৭১৫-৯১৭৮৩৪
              </a>
              <button type="button" id="closeSuccessBtn" class="btn-outline-red" style="margin-top: 10px; width: 100%;">
                বন্ধ করুন
              </button>
            </div>
          </div>
        `;

        const closeSuccess = document.getElementById('closeSuccessBtn');
        if (closeSuccess) {
          closeSuccess.addEventListener('click', closeAppointmentModal);
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 6b. CONTACT PAGE APPOINTMENT FORM & DYNAMIC OPTIONS
  // --------------------------------------------------------------------------
  const contactForm = document.getElementById('contactAppointmentForm');
  const contactServiceSelect = document.getElementById('contactServiceSelect');
  const contactScheduleSelect = document.getElementById('contactPreferredTime');
  const contactOtherWrapper = document.getElementById('contact-other-service-wrapper');
  const contactOtherInput = document.getElementById('contact-other-service-input');
  const contactSuccessBox = document.getElementById('contactSuccessBox');
  const contactWhatsAppBtn = document.getElementById('contactWhatsAppBtn');

  const FALLBACK_SERVICES = [
    'দাঁতের সাধারণ চিকিৎসা ও চেকআপ',
    'রুট ক্যানাল চিকিৎসা (RCT)',
    'দাঁত পরিষ্কার ও স্কেলিং',
    'দাঁতের ফিলিং ও রেস্টোরেশন',
    'দাঁত তোলা ও এক্সট্রাকশন',
    'দাঁতের ক্যাপ ও ক্রাউন',
    'ডেন্টাল ব্রিজ ও দাঁত প্রতিস্থাপন',
    'মাড়ির চিকিৎসা (Gums Care)',
    'শিশুদের দাঁতের যত্ন',
    'ওরাল মাইনর সার্জারি',
    'দাঁতের সৌন্দর্যবর্ধন (Smile Design)',
    'ডিজিটাল এক্স-রে ও ডায়াগনস্টিক',
    'অন্যান্য (Other)'
  ];

  const FALLBACK_SCHEDULES = [
    'সকাল (১০:০০টা - ০১:০০টা)',
    'বিকাল (০৪:০০টা - ০৬:০০টা)',
    'সন্ধ্যা (০৬:০০টা - ০৯:০০টা)'
  ];

  function populateSelect(selectEl, list) {
    if (!selectEl) return;
    const current = selectEl.value;
    selectEl.innerHTML = '';
    const cleanList = (Array.isArray(list) && list.length > 0) ? list : (selectEl === contactServiceSelect ? FALLBACK_SERVICES : FALLBACK_SCHEDULES);
    cleanList.forEach(item => {
      const text = typeof item === 'string' ? item : (item.name || item.title || item.label || item.value);
      if (text && text !== 'undefined' && text !== 'null' && String(text).trim()) {
        const opt = document.createElement('option');
        opt.value = String(text).trim();
        opt.textContent = String(text).trim();
        selectEl.appendChild(opt);
      }
    });
    if (current && Array.from(selectEl.options).some(o => o.value === current)) {
      selectEl.value = current;
    }
  }

  function checkContactOther() {
    if (!contactServiceSelect || !contactOtherWrapper) return;
    const val = contactServiceSelect.value || '';
    const isOther = val.includes('অন্যান্য') || val.toLowerCase().includes('other');
    if (isOther) {
      contactOtherWrapper.style.display = 'block';
      if (contactOtherInput) contactOtherInput.required = true;
    } else {
      contactOtherWrapper.style.display = 'none';
      if (contactOtherInput) {
        contactOtherInput.required = false;
        contactOtherInput.value = '';
      }
    }
  }

  if (contactServiceSelect) {
    contactServiceSelect.addEventListener('change', checkContactOther);
    checkContactOther();
  }

  // Pre-select service from URL query (e.g. ?service=Teeth+Gap+Filling)
  const urlSearchParams = new URLSearchParams(window.location.search);
  const preselectedServiceParam = urlSearchParams.get('service');
  if (preselectedServiceParam) {
    const targetSelects = [contactServiceSelect, serviceSelect, document.getElementById('pageServiceSelect')].filter(Boolean);
    targetSelects.forEach(sel => {
      for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].text.toLowerCase().includes(preselectedServiceParam.toLowerCase()) || 
            sel.options[i].value.toLowerCase().includes(preselectedServiceParam.toLowerCase())) {
          sel.selectedIndex = i;
          break;
        }
      }
    });
    checkContactOther();
  }

  // Fetch appointment options from backend if on contact page
  if (contactServiceSelect && contactScheduleSelect) {
    (async function loadContactOptions() {
      try {
        const apiBase = window.API_BASE_URL || window.LUCKY_API_BASE_URL || 'https://api.luckydentalcare.com';
        const res = await fetch(`${apiBase}/api/appointment-options`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.services) && data.services.length > 0) {
            populateSelect(contactServiceSelect, data.services);
          }
          if (data && Array.isArray(data.schedules) && data.schedules.length > 0) {
            populateSelect(contactScheduleSelect, data.schedules);
          }
        }
      } catch (e) {
        // Fallbacks remain in place
      }
      checkContactOther();
    })();
  }

  // Contact form submission
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = document.getElementById('contactPatientName').value.trim();
      const phone = document.getElementById('contactPatientPhone').value.trim();
      let service = contactServiceSelect ? contactServiceSelect.value : '';
      const date = document.getElementById('contactPreferredDate').value;
      const time = contactScheduleSelect ? contactScheduleSelect.value : '';
      const note = document.getElementById('contactPatientNote').value.trim();

      if (!name || !phone) {
        alert('অনুগ্রহ করে আপনার নাম এবং মোবাইল নম্বর প্রদান করুন।');
        return;
      }

      const isOther = service.includes('অন্যান্য') || service.toLowerCase().includes('other');
      if (isOther && contactOtherInput) {
        const detail = contactOtherInput.value.trim();
        if (!detail) {
          alert('অনুগ্রহ করে আপনার নির্দিষ্ট সমস্যার বিবরণ লিখুন।');
          contactOtherInput.focus();
          return;
        }
        service = `অন্যান্য (${detail})`;
      }

      let message = `*Lucky Dental Care - অ্যাপয়েন্টমেন্ট অনুরোধ*\n\n`;
      message += `👤 *রোগীর নাম:* ${name}\n`;
      message += `📱 *মোবাইল নম্বর:* ${phone}\n`;
      if (service) message += `🦷 *সেবার ধরন:* ${service}\n`;
      if (date) message += `📅 *পছন্দের তারিখ:* ${date}\n`;
      if (time) message += `⏰ *পছন্দের সময়:* ${time}\n`;
      if (note) message += `📝 *বিবরণ:* ${note}\n`;

      const encoded = encodeURIComponent(message);
      if (contactWhatsAppBtn) {
        contactWhatsAppBtn.href = `https://wa.me/8801715917834?text=${encoded}`;
      }

      contactForm.style.display = 'none';
      if (contactSuccessBox) {
        contactSuccessBox.style.display = 'block';
      }
    });
  }

  // --------------------------------------------------------------------------
  // 7. MULTI-PAGE ACTIVE NAVIGATION & PAGE TRANSITION
  // --------------------------------------------------------------------------
  document.body.classList.add('page-fade-in');

  function setActiveNavigation() {
    const pathname = window.location.pathname;
    let filename = pathname.substring(pathname.lastIndexOf('/') + 1) || 'index.html';
    if (!filename.includes('.html')) filename = 'index.html';

    const allNavLinks = document.querySelectorAll('.nav-link, .drawer-link');
    allNavLinks.forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href) return;
      const cleanHref = href.split('?')[0].split('#')[0];
      if (cleanHref === filename || (filename === 'index.html' && (cleanHref === './' || cleanHref === 'index.html' || cleanHref === ''))) {
        link.classList.add('active');
      } else if (cleanHref.endsWith('.html')) {
        link.classList.remove('active');
      }
    });
  }

  setActiveNavigation();

  // Smooth subtle exit transition for internal multi-page links
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    const target = link.getAttribute('target');

    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('javascript:') ||
      href.startsWith('tel:') ||
      href.startsWith('mailto:') ||
      href.startsWith('https://wa.me') ||
      href.includes('google.com/maps') ||
      href.includes('facebook.com') ||
      target === '_blank' ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.button !== 0
    ) {
      return;
    }

    if (href.endsWith('.html') || href === './' || href === '/') {
      e.preventDefault();
      document.body.classList.add('page-fading-out');
      setTimeout(function () {
        window.location.href = href;
      }, 160);
    }
  });

  // --------------------------------------------------------------------------
  // 8. HOMEPAGE HERO CAROUSEL INITIALIZATION (Section 2)
  // --------------------------------------------------------------------------
  const carouselContainer = document.getElementById('heroCarousel');
  if (carouselContainer) {
    const slides = carouselContainer.querySelectorAll('.hero-carousel-slide');
    const dots = carouselContainer.querySelectorAll('.hero-carousel-dot');
    const prevBtn = carouselContainer.querySelector('.hero-carousel-arrow.prev');
    const nextBtn = carouselContainer.querySelector('.hero-carousel-arrow.next');
    let currentIndex = 0;
    let autoPlayTimer = null;
    const intervalTime = 5000;

    function goToSlide(index) {
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;
      currentIndex = index;

      slides.forEach(function (slide, i) {
        slide.classList.toggle('active', i === currentIndex);
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle('active', i === currentIndex);
        dot.setAttribute('aria-current', i === currentIndex ? 'true' : 'false');
      });
    }

    function nextSlide() {
      goToSlide(currentIndex + 1);
    }

    function prevSlide() {
      goToSlide(currentIndex - 1);
    }

    function startAutoPlay() {
      stopAutoPlay();
      autoPlayTimer = setInterval(nextSlide, intervalTime);
    }

    function stopAutoPlay() {
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { prevSlide(); startAutoPlay(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { nextSlide(); startAutoPlay(); });

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        goToSlide(i);
        startAutoPlay();
      });
    });

    carouselContainer.addEventListener('mouseenter', stopAutoPlay);
    carouselContainer.addEventListener('mouseleave', startAutoPlay);
    carouselContainer.addEventListener('touchstart', stopAutoPlay, { passive: true });
    carouselContainer.addEventListener('touchend', startAutoPlay, { passive: true });

    // Keyboard navigation
    carouselContainer.setAttribute('tabindex', '0');
    carouselContainer.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { prevSlide(); startAutoPlay(); }
      else if (e.key === 'ArrowRight') { nextSlide(); startAutoPlay(); }
    });

    startAutoPlay();
  }

  // --------------------------------------------------------------------------
  // 9. HIGH-PERFORMANCE INTERSECTION OBSERVER FOR SCROLL REVEALS (Section 19)
  // --------------------------------------------------------------------------
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.08
    });

    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    // Graceful fallback
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      el.classList.add('is-revealed');
    });
  }
});

