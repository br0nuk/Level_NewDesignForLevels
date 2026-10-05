/* LEVEL — сторінка об'єкта: галерея, характеристики, менеджер, схожі пропозиції */
(() => {
  const { $, $$ } = LEVEL;
  const D = window.LEVEL_LISTINGS;
  const TYPE = { a: ['apartments', 'Квартири'], c: ['cottages', 'Котеджі'], r: ['commerce', 'Оренда'] };
  const nf = new Intl.NumberFormat('uk-UA');
  const fmt = v => nf.format(v);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pic = (p, size) => D.base + '/pic/' + (size ? `preview_${size}/` : '') + p;
  const mgrImg = m => (m && m.img ? D.base + encodeURI(m.img) : '');
  const ARROW_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15 6l-6 6 6 6"/></svg>';
  const ARROW_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 6l6 6-6 6"/></svg>';
  const PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';

  const root = $('#obj');
  const id = parseInt(new URLSearchParams(location.search).get('id'), 10);
  const x = D.items.find(i => i.id === id);

  if (!x) {
    root.innerHTML = `<div class="crumbs"><a href="index.html">Головна</a><span>✦</span><a href="catalog.html">Каталог</a></div>
      <div class="notfound">
        <h1 class="obj__title">Об’єкт не знайдено</h1>
        <p class="cat-sub">Можливо, його вже продано або знято з продажу. Перегляньте інші пропозиції в каталозі.</p>
        <a class="btn btn--fill" href="catalog.html">До каталогу</a>
      </div>`;
    return;
  }

  const [typeSlug, typeName] = TYPE[x.t];
  const m = D.managers[x.m];
  const ph = x.photos || [];
  const back = /catalog\.html/.test(document.referrer) ? document.referrer : `catalog.html?type=${typeSlug}`;
  const loc = [x.district, x.street ? 'вул. ' + x.street : '', x.complex ? 'ЖК ' + x.complex : ''].filter(Boolean).join(' · ');
  document.title = `${x.title} — ${fmt(x.price)} $ | LEVEL`;

  const specs = (x.t === 'c'
    ? [['К-сть кімнат', x.rooms], ['Поверхів', x.storeys], ['Площа', x.area && fmt(x.area) + ' м²'], ['Ділянка', x.plot && fmt(x.plot) + ' сотих'],
       ['Стан', x.cond], ['Район', x.district], ['Вулиця', x.street], ['Комунікації', (x.comm || []).join(', ')], ['Опалення', x.heat],
       ['Утеплення', x.insul], ['Матеріал стін', x.material], ['ЖК', x.complex]]
    : [['К-сть кімнат', x.rooms], ['Площа', x.area && fmt(x.area) + ' м²'], ['Поверх', x.floor ? `${x.floor} з ${x.floors}` : null], ['Стан', x.cond],
       ['Забудовник', x.dev], ['Район', x.district], ['Вулиця', x.street], ['ЖК', x.complex]]
  ).concat([["ID об'єкта", x.id]]).filter(([, v]) => v != null && v !== '');

  const quick = x.t === 'c'
    ? [['Кімнат', x.rooms], ['Площа', x.area && fmt(x.area) + ' м²'], ['Ділянка', x.plot && fmt(x.plot) + ' сот.'], ['Стан', x.cond]]
    : [['Кімнат', x.rooms], ['Площа', x.area && fmt(x.area) + ' м²'], ['Поверх', x.floor ? `${x.floor}/${x.floors}` : '—'], ['Стан', x.cond]];

  const similar = D.items.filter(i => i.t === x.t && i.id !== x.id)
    .sort((a, b) => Math.abs(a.price - x.price) - Math.abs(b.price - x.price)).slice(0, 3);

  root.innerHTML = `
    <div class="crumbs"><a href="index.html">Головна</a><span>✦</span><a href="catalog.html">Каталог</a><span>✦</span><a href="${esc(back)}">${typeName}</a><span>✦</span><b>ID ${x.id}</b></div>
    <div class="obj__head">
      <div>
        <h1 class="obj__title">${esc(x.title)}</h1>
        ${loc ? `<p class="obj__loc">${PIN}${esc(loc)}</p>` : ''}
      </div>
      <div class="obj__meta">ID <b>${x.id}</b><br>Додано <b>${esc(x.date)}</b></div>
    </div>
    <div class="obj__grid">
      <div class="obj__main">
        <div class="gal">
          <div class="gal__stage" id="stage">
            ${ph.length ? `<img src="${pic(ph[0])}" alt="${esc(x.title)}">` : ''}
            ${ph.length > 1 ? `<button class="gal__nav gal__nav--prev" data-step="-1" aria-label="Попереднє фото">${ARROW_L}</button><button class="gal__nav gal__nav--next" data-step="1" aria-label="Наступне фото">${ARROW_R}</button>` : ''}
            <span class="gal__count">1 / ${ph.length}</span>
            <button class="gal__full" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>На весь екран</button>
          </div>
          <div class="gal__thumbs" id="thumbs" data-lenis-prevent>${ph.map((p, i) => `<button type="button" data-i="${i}" class="${i ? '' : 'is-on'}" aria-label="Фото ${i + 1}"><img src="${pic(p, 400)}" alt="" loading="lazy"></button>`).join('')}</div>
        </div>
        <section class="obj__block">
          <h2 class="obj__h">Характеристики</h2>
          <dl class="specs">${specs.map(([l, v]) => `<div><dt>${l}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        </section>
        ${x.desc ? `<section class="obj__block"><h2 class="obj__h">Опис</h2><div class="obj__desc">${esc(x.desc)}</div></section>` : ''}
      </div>
      <aside class="obj__aside">
        <div class="pricebox">
          <span class="pricebox__label">Ціна</span>
          <div class="pricebox__price">${fmt(x.price)} $</div>
          ${x.area ? `<div class="pricebox__sub">≈ ${fmt(Math.round(x.price / x.area))} $ за м²</div>` : ''}
          <div class="pricebox__quick">${quick.map(([l, v]) => `<div><small>${l}</small><span>${esc(v || '—')}</span></div>`).join('')}</div>
          <button class="btn btn--fill" type="button" id="viewing">Записатись на огляд</button>
          <a class="btn" href="tel:${(m ? m.phone : '+380732612251').replace(/[^\d+]/g, '')}">Зателефонувати</a>
          ${m ? `<div class="mgr"><img src="${mgrImg(m)}" alt="${esc(m.name)}"><div><small>Менеджер</small><b>${esc(m.name)}</b><a href="tel:${m.phone.replace(/[^\d+]/g, '')}">${esc(m.phone)}</a></div></div>` : ''}
          <button class="link-btn share" type="button" id="share">Поділитися об’єктом</button>
        </div>
      </aside>
    </div>
    ${similar.length ? `<section class="similar">
      <span class="eyebrow">Ще варіанти</span>
      <h2 class="h2" style="margin-top:22px"><span class="split-line"><span>Схожі</span></span><span class="split-line"><span><em>пропозиції</em></span></span></h2>
      <div class="sim-grid">${similar.map(s => `<a class="gcard" href="object.html?id=${s.id}">
        <div class="gcard__img">${s.photos?.[0] ? `<img src="${pic(s.photos[0], 400)}" alt="" loading="lazy">` : ''}</div>
        <div class="gcard__body"><b>${fmt(s.price)} $</b><h3>${esc(s.title)}</h3>
        <p>${[s.rooms && s.rooms + ' кімн.', s.area && fmt(s.area) + ' м²', s.district].filter(Boolean).join(' · ')}</p></div></a>`).join('')}</div>
    </section>` : ''}`;

  /* ---------- галерея ---------- */
  const stage = $('#stage'), stageImg = $('img', stage), counter = $('.gal__count', stage), thumbs = $('#thumbs');
  const glb = $('#glb'), glbImg = $('img', glb);
  let cur = 0;
  const preload = i => { if (ph.length) new Image().src = pic(ph[(i + ph.length) % ph.length]); };
  function show(i, dir = 1) {
    if (!ph.length) return;
    cur = (i + ph.length) % ph.length;
    stageImg.src = pic(ph[cur]);
    gsap.fromTo(stageImg, { opacity: 0.35, x: dir * 40 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' });
    counter.textContent = `${cur + 1} / ${ph.length}`;
    $$('button', thumbs).forEach((b, k) => b.classList.toggle('is-on', k === cur));
    const t = thumbs.children[cur];
    if (t) thumbs.scrollTo({ left: t.offsetLeft - thumbs.clientWidth / 2 + t.offsetWidth / 2, behavior: 'smooth' });
    if (glb.classList.contains('is-open')) showFull(dir);
    preload(cur + 1); preload(cur - 1);
  }
  function showFull(dir = 0) {
    glbImg.src = pic(ph[cur]);
    $('.glb__count', glb).textContent = `${cur + 1} / ${ph.length}`;
    if (dir) gsap.fromTo(glbImg, { opacity: 0.3, x: dir * 50 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' });
  }
  const openFull = () => { if (!ph.length) return; showFull(); glb.classList.add('is-open'); LEVEL.lock(true); };
  const closeFull = () => { glb.classList.remove('is-open'); LEVEL.lock(false); };

  stage.addEventListener('click', e => {
    const nav = e.target.closest('[data-step]');
    if (nav) { show(cur + +nav.dataset.step, +nav.dataset.step); return; }
    if (stage.dataset.swiped) { delete stage.dataset.swiped; return; }
    openFull();
  });
  thumbs.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) show(+b.dataset.i, +b.dataset.i >= cur ? 1 : -1); });
  // свайп на телефоні
  const swipe = (el, onDone) => {
    let sx = null;
    el.addEventListener('pointerdown', e => { sx = e.clientX; });
    el.addEventListener('pointerup', e => {
      if (sx == null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) { onDone(dx < 0 ? 1 : -1); return true; }
    });
  };
  swipe(stage, d => { stage.dataset.swiped = '1'; show(cur + d, d); });
  swipe(glb, d => show(cur + d, d));
  glb.addEventListener('click', e => {
    if (e.target.closest('.gal__nav--prev')) show(cur - 1, -1);
    else if (e.target.closest('.gal__nav--next')) show(cur + 1, 1);
    else if (e.target === glb || e.target.closest('.glb__close')) closeFull();
  });
  addEventListener('keydown', e => {
    if (LEVEL.$('#modal.is-open')) return;
    if (e.key === 'ArrowRight') show(cur + 1, 1);
    else if (e.key === 'ArrowLeft') show(cur - 1, -1);
    else if (e.key === 'Escape' && glb.classList.contains('is-open')) closeFull();
  });
  $('.gal__full', stage).addEventListener('click', e => { e.stopPropagation(); openFull(); });
  preload(1);

  /* ---------- дії ---------- */
  $('#viewing').addEventListener('click', () => LEVEL.openModal?.(`${x.title} · ID ${x.id}`, location.href));
  $('#share').addEventListener('click', async e => {
    const btn = e.currentTarget, data = { title: x.title, text: `${x.title} — ${fmt(x.price)} $`, url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(location.href); btn.textContent = 'Посилання скопійовано ✓'; }
    } catch { /* користувач закрив вікно «Поділитися» */ }
  });

  /* ---------- анімації ---------- */
  gsap.timeline({ delay: 0.55 })
    .from(['.obj .crumbs', '.obj__title', '.obj__loc', '.obj__meta'], { opacity: 0, y: 30, duration: 0.9, stagger: 0.08, ease: 'power3.out' })
    .from('.gal__stage', { clipPath: 'inset(0 0 100% 0 round 22px)', duration: 1.2, ease: 'expo.inOut' }, 0.15)
    .from(stageImg || {}, { scale: 1.15, duration: 1.6, ease: 'power3.out' }, 0.15)
    .from('.gal__thumbs button', { opacity: 0, y: 20, duration: 0.6, stagger: 0.03, ease: 'power3.out', clearProps: 'opacity,transform' }, 0.6)
    .from('.pricebox', { opacity: 0, x: 40, duration: 1, ease: 'power3.out', clearProps: 'transform' }, 0.35);
  $$('.obj__block').forEach(b => gsap.from(b, { opacity: 0, y: 50, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: b, start: 'top 88%' } }));
  LEVEL.revealHeadings(root);
  if ($('.sim-grid')) gsap.from('.gcard', { opacity: 0, y: 60, duration: 1, stagger: 0.12, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: '.sim-grid', start: 'top 88%' } });
  requestAnimationFrame(() => ScrollTrigger.refresh());
})();
