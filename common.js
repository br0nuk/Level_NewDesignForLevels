/* LEVEL — спільний код для всіх сторінок (головна, каталог, об'єкт) */
(() => {
  gsap.registerPlugin(ScrollTrigger);

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFile = location.protocol === 'file:';
  const L = window.LEVEL = { $, $$, reduce, lenis: null };

  /* ---------- плавний скрол ---------- */
  if (window.Lenis && !reduce) {
    L.lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    L.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => L.lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  L.scrollTo = (target, opts = {}) => {
    if (L.lenis) L.lenis.scrollTo(target, { duration: 1.4, ...opts });
    else (typeof target === 'string' ? $(target) : target)?.scrollIntoView?.({ behavior: 'smooth' });
  };
  L.lock = on => { on ? L.lenis?.stop() : L.lenis?.start(); document.documentElement.style.overflow = on ? 'hidden' : ''; };

  /* ---------- шторка переходу між сторінками ---------- */
  let curtain = $('.curtain');
  if (!curtain) {
    curtain = document.createElement('div');
    curtain.className = 'curtain';
    curtain.innerHTML = '<img src="img/logo.png" alt="">';
    document.body.appendChild(curtain);
  }
  L.go = url => {
    gsap.timeline()
      .set(curtain, { display: 'grid' })
      .fromTo(curtain, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.7, ease: 'expo.inOut' })
      .add(() => { location.href = url; });
  };
  if (curtain.classList.contains('is-on')) {
    gsap.to(curtain, {
      clipPath: 'inset(0 0 100% 0)', duration: 0.9, delay: 0.15, ease: 'expo.inOut',
      onComplete: () => { curtain.classList.remove('is-on'); gsap.set(curtain, { display: 'none', clearProps: 'clipPath' }); }
    });
  }
  // повернення кнопкою «Назад» відновлює сторінку з кешу разом із закритою шторкою
  addEventListener('pageshow', e => { if (e.persisted) { curtain.classList.remove('is-on'); gsap.set(curtain, { display: 'none' }); } });

  /* ---------- меню ---------- */
  const closeMenu = () => { if (document.body.classList.contains('menu-open')) { document.body.classList.remove('menu-open'); L.lock(false); } };
  $('.burger')?.addEventListener('click', () => L.lock(document.body.classList.toggle('menu-open')));

  let lastY = 0;
  const nav = $('.nav');
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    if (Math.abs(y - lastY) < 4) return; // ScrollTrigger.refresh() шле «порожні» події скролу
    nav.classList.toggle('is-hidden', y > 400 && y > lastY && !document.body.classList.contains('menu-open'));
    lastY = y;
  };
  if (nav) { addEventListener('scroll', onScroll, { passive: true }); onScroll(); }

  /* ---------- посилання: якорі плавно, інші сторінки через шторку ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0) return;
    const href = a.getAttribute('href');
    if (href.startsWith('#')) {
      if (href.length < 2 || !$(href)) return;
      e.preventDefault(); closeMenu(); L.scrollTo(href);
      return;
    }
    if (a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || /^(tel:|mailto:|https?:)/.test(href) || !/\.html([?#]|$)/.test(href)) return;
    const url = new URL(href, location.href);
    e.preventDefault();
    closeMenu();
    if (url.pathname === location.pathname && url.search === location.search && url.hash && $(url.hash)) L.scrollTo(url.hash);
    else L.go(url.href);
  });

  /* ---------- телефон і форми ---------- */
  L.maskPhone = input => {
    input.addEventListener('focus', () => { if (!input.value) input.value = '+380 '; });
    input.addEventListener('blur', () => { if (input.value.trim() === '+380') input.value = ''; });
    input.addEventListener('input', () => {
      let raw = input.value;
      raw = raw.startsWith('+380') ? raw.slice(4) : raw.startsWith('+38') ? '' : raw;
      let d = raw.replace(/\D/g, '');
      if (d.startsWith('380')) d = d.slice(3); else if (d.startsWith('0')) d = d.slice(1);
      d = d.slice(0, 9);
      let out = '+380 ';
      if (d.length) out += '(' + d.slice(0, 2);
      if (d.length > 2) out += ') ' + d.slice(2, 5);
      if (d.length > 5) out += ' ' + d.slice(5, 7);
      if (d.length > 7) out += ' ' + d.slice(7, 9);
      input.value = out;
    });
  };

  // endpoint — той самий PHP-обробник, що й на поточному сайті; з диска (file://) заявка лише імітується
  L.bindForm = (form, endpoint, extra = () => ({})) => {
    const fName = $('[name=name]', form), fPhone = $('[name=phone_number]', form), fErr = $('.form__err', form);
    L.maskPhone(fPhone);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name = fName.value.trim(), digits = fPhone.value.replace(/\D/g, '');
      fName.parentElement.classList.toggle('is-error', name.length < 3);
      fPhone.parentElement.classList.toggle('is-error', digits.length !== 12);
      if (name.length < 3) return void (fErr.textContent = 'Будь ласка, введіть ім’я не коротше 3 символів.');
      if (digits.length !== 12) return void (fErr.textContent = 'Будь ласка, введіть повний номер телефону.');
      fErr.textContent = '';
      const btn = $('button[type=submit]', form);
      btn.disabled = true;
      if (!isFile) {
        try {
          const r = await fetch(endpoint, { method: 'POST', body: new URLSearchParams({ name, phone_number: fPhone.value, ...extra() }) });
          if (!r.ok) throw new Error(r.status);
        } catch {
          btn.disabled = false;
          return void (fErr.textContent = 'Не вдалося надіслати заявку. Зателефонуйте нам: +380 (73) 261 22 51');
        }
      }
      form.classList.add('is-sent');
      gsap.from($('.form__ok', form), { opacity: 0, y: 20, duration: 0.8, ease: 'power3.out' });
    });
  };
  $$('form[data-endpoint]').forEach(f => L.bindForm(f, f.dataset.endpoint));

  /* ---------- модалка «Записатись на огляд» ---------- */
  const modal = $('#modal');
  if (modal) {
    const mForm = $('form', modal);
    let link = location.href;
    L.bindForm(mForm, '/leave_form.php', () => ({ link }));
    L.openModal = (title, url) => {
      link = url || location.href;
      $('.modal__obj', modal).textContent = title || '';
      mForm.classList.remove('is-sent');
      $('button[type=submit]', mForm).disabled = false;
      modal.classList.add('is-open');
      L.lock(true);
      setTimeout(() => $('[name=name]', mForm).focus(), 300);
    };
    const close = () => { modal.classList.remove('is-open'); L.lock(false); };
    modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('.modal__close')) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('is-open')) close(); });
  }

  /* ---------- анімації появи ---------- */
  L.revealHeadings = (root = document) => $$('.h2', root).forEach(h => {
    gsap.from($$('.split-line > span', h), {
      yPercent: 110, rotate: 3, duration: 1.2, stagger: 0.1, ease: 'expo.out',
      scrollTrigger: { trigger: h, start: 'top 88%' }
    });
  });
  L.revealHeadings();
  ScrollTrigger.batch('.reveal', {
    start: 'top 92%',
    onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1.1, stagger: 0.1, ease: 'power3.out' })
  });
})();
