/* LEVEL — каталог: вкладки, фільтри, сортування, пагінація, стан у URL */
(() => {
  const { $, $$ } = LEVEL;
  const D = window.LEVEL_LISTINGS;
  const PER_PAGE = 10;
  const TYPES = {
    apartments: { code: 'a', name: 'Квартири' },
    cottages: { code: 'c', name: 'Котеджі' },
    commerce: { code: 'r', name: 'Оренда' }
  };
  const SORTS = { date_high: 'Спочатку нові', date_low: 'Спочатку старі', price_low: 'Від дешевших', price_high: 'Від дорожчих' };
  const COND_ORDER = ['Сирець', 'Зданий сирець', 'На етапі ремонту', 'Ремонт'];

  const nf = new Intl.NumberFormat('uk-UA');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pic = (p, size) => D.base + '/pic/' + (size ? `preview_${size}/` : '') + p;
  const mgrImg = m => (m && m.img ? D.base + encodeURI(m.img) : '');
  const dateNum = s => { const [d, m, y] = (s || '').split('.'); return +(y + m + d) || 0; };
  const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9а-яіїєґ]+/g, '');
  const split = s => String(s || '').split(',').map(v => v.trim()).filter(Boolean);
  const plural = (n, f) => f[n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2];
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const ICON = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/></svg>'
  };

  /* ---------- опис фільтрів (як на поточному сайті) ---------- */
  const APARTMENT_FILTERS = [
    { k: 'rooms', label: 'Кількість кімнат', ui: 'chips', get: x => x.rooms },
    { k: 'district', label: 'Район', ui: 'drop', get: x => x.district, ph: 'Виберіть район' },
    { k: 'cond', label: 'Стан', ui: 'chips', get: x => x.cond },
    { k: 'price', label: 'Бюджет, $', ui: 'range', get: x => x.price },
    { k: 'area', label: 'Площа, м²', ui: 'range', get: x => x.area },
    { k: 'dev', label: 'Забудовник', ui: 'drop', get: x => x.dev, ph: 'Виберіть забудовника', adv: true },
    { k: 'complex', label: 'Житловий комплекс', ui: 'drop', get: x => x.complex, ph: 'Виберіть ЖК', adv: true },
    { k: 'street', label: 'Вулиця', ui: 'drop', get: x => x.street, ph: 'Виберіть вулицю', adv: true },
    { k: 'floor', label: 'Поверх', ui: 'range', get: x => x.floor, adv: true }
  ];
  const DEFS = {
    a: APARTMENT_FILTERS,
    r: APARTMENT_FILTERS,
    c: [
      { k: 'district', label: 'Район', ui: 'drop', get: x => x.district, ph: 'Виберіть район' },
      { k: 'area', label: 'Площа котеджу, м²', ui: 'range', get: x => x.area },
      { k: 'cond', label: 'Стан', ui: 'chips', get: x => x.cond },
      { k: 'price', label: 'Бюджет, $', ui: 'range', get: x => x.price },
      { k: 'rooms', label: 'Кількість кімнат', ui: 'chips', get: x => x.rooms },
      { k: 'storeys', label: 'Кількість поверхів', ui: 'chips', get: x => x.storeys },
      { k: 'comm', label: 'Комунікації', ui: 'drop', get: x => x.comm || [], all: true, ph: 'Виберіть комунікації', adv: true },
      { k: 'heat', label: 'Тип опалення', ui: 'drop', get: x => split(x.heat), ph: 'Виберіть опалення', adv: true },
      { k: 'material', label: 'Матеріал стін', ui: 'drop', get: x => x.material, ph: 'Виберіть матеріал', adv: true },
      { k: 'plot', label: 'Площа ділянки, сотих', ui: 'range', get: x => x.plot, adv: true }
    ]
  };

  const S = { type: 'apartments', q: '', sort: 'date_high', page: 1, f: {} };
  const code = () => TYPES[S.type].code;
  const defs = () => DEFS[code()];
  const ofType = () => D.items.filter(x => x.t === code());

  /* ---------- URL ⇄ стан ---------- */
  function readURL() {
    const u = new URLSearchParams(location.search);
    S.type = TYPES[u.get('type')] ? u.get('type') : 'apartments';
    S.q = u.get('q') || '';
    S.sort = SORTS[u.get('sort')] ? u.get('sort') : 'date_high';
    S.page = Math.max(1, parseInt(u.get('page'), 10) || 1);
    S.f = {};
    defs().forEach(d => {
      const v = u.get(d.k);
      if (!v) return;
      if (d.ui === 'range') {
        const [a, b] = v.split('-');
        S.f[d.k] = { min: a ? +a : null, max: b ? +b : null };
      } else S.f[d.k] = new Set(v.split('|'));
    });
  }
  function writeURL(push) {
    const u = new URLSearchParams();
    if (S.type !== 'apartments') u.set('type', S.type);
    if (S.q) u.set('q', S.q);
    Object.entries(S.f).forEach(([k, v]) => {
      if (v instanceof Set) { if (v.size) u.set(k, [...v].join('|')); }
      else if (v.min != null || v.max != null) u.set(k, `${v.min ?? ''}-${v.max ?? ''}`);
    });
    if (S.sort !== 'date_high') u.set('sort', S.sort);
    if (S.page > 1) u.set('page', S.page);
    const qs = u.toString();
    history[push ? 'pushState' : 'replaceState'](null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  /* ---------- фільтрація ---------- */
  function matches(x, d, v) {
    const val = d.get(x);
    if (d.ui === 'range') {
      if (v.min == null && v.max == null) return true;
      if (val == null) return false;
      return (v.min == null || val >= v.min) && (v.max == null || val <= v.max);
    }
    if (!v.size) return true;
    const arr = (Array.isArray(val) ? val : [val]).map(String);
    return d.all ? [...v].every(s => arr.includes(s)) : arr.some(s => v.has(s));
  }
  const SORTERS = {
    date_high: (a, b) => dateNum(b.date) - dateNum(a.date) || b.id - a.id,
    date_low: (a, b) => dateNum(a.date) - dateNum(b.date) || a.id - b.id,
    price_low: (a, b) => a.price - b.price,
    price_high: (a, b) => b.price - a.price
  };
  function filtered() {
    const q = norm(S.q);
    let xs = ofType();
    if (q) xs = xs.filter(x => norm([x.title, x.complex, x.street, x.district, x.dev, x.id].join(' ')).includes(q));
    defs().forEach(d => { const v = S.f[d.k]; if (v) xs = xs.filter(x => matches(x, d, v)); });
    return xs.sort(SORTERS[S.sort]);
  }

  /* ---------- побудова панелі фільтрів ---------- */
  function options(d, items) {
    const counts = new Map();
    items.forEach(x => {
      const v = d.get(x);
      (Array.isArray(v) ? v : [v]).forEach(o => { if (o != null && o !== '') counts.set(String(o), (counts.get(String(o)) || 0) + 1); });
    });
    const opts = [...counts];
    if (d.k === 'cond') opts.sort((a, b) => COND_ORDER.indexOf(a[0]) - COND_ORDER.indexOf(b[0]));
    else if (d.ui === 'chips') opts.sort((a, b) => a[0] - b[0]);
    else opts.sort((a, b) => a[0].localeCompare(b[0], 'uk'));
    return opts;
  }
  function groupHTML(d, items) {
    const head = `<div class="fgroup__label">${d.label}</div>`;
    if (d.ui === 'range') {
      const vals = items.map(d.get).filter(v => v != null);
      if (!vals.length) return '';
      const min = Math.floor(Math.min(...vals)), max = Math.ceil(Math.max(...vals));
      return `<div class="fgroup" data-k="${d.k}">${head}<div class="frange">
        <input inputmode="numeric" data-b="min" placeholder="від ${nf.format(min)}" aria-label="${d.label} від">
        <input inputmode="numeric" data-b="max" placeholder="до ${nf.format(max)}" aria-label="${d.label} до"></div></div>`;
    }
    const opts = options(d, items);
    if (!opts.length) return '';
    if (d.ui === 'chips') {
      return `<div class="fgroup" data-k="${d.k}">${head}<div class="fchips">${opts.map(([v, n]) =>
        `<button class="fchip" type="button" data-v="${esc(v)}">${esc(v)}<em>${n}</em></button>`).join('')}</div></div>`;
    }
    return `<div class="fgroup" data-k="${d.k}">${head}<div class="fdrop">
      <button class="fdrop__btn" type="button" data-ph="${esc(d.ph)}">${esc(d.ph)}</button>
      <div class="fdrop__panel">${opts.length > 7 ? '<input class="fdrop__search" placeholder="Пошук…" aria-label="Пошук">' : ''}
        <div class="fdrop__list" data-lenis-prevent>${opts.map(([v, n]) =>
          `<label class="fcheck"><input type="checkbox" value="${esc(v)}"><span>${esc(v)}</span><em>${n}</em></label>`).join('')}</div>
      </div></div></div>`;
  }
  function buildFilters() {
    const items = ofType(), list = defs();
    const main = list.filter(d => !d.adv).map(d => groupHTML(d, items)).join('');
    const adv = list.filter(d => d.adv).map(d => groupHTML(d, items)).join('');
    const advOpen = list.some(d => d.adv && isActive(S.f[d.k]));
    $('#filters-body').innerHTML =
      `<div class="fgroup fgroup--search"><div class="fgroup__label">Пошук</div><label class="fsearch">${ICON.search}<input type="search" id="fq" placeholder="ЖК, вулиця або ID" aria-label="Пошук"></label></div>` + main +
      (adv ? `<button class="fadv-toggle${advOpen ? ' is-open' : ''}" type="button">Розширений пошук ${ICON.chev}</button><div class="fadv${advOpen ? ' is-open' : ''}">${adv}</div>` : '');
    document.querySelector('.cat').classList.toggle('cat--nofilters', !items.length);
    syncFilters();
  }
  const isActive = v => !!v && (v instanceof Set ? v.size > 0 : v.min != null || v.max != null);

  function dropSummary(drop, set) {
    const btn = $('.fdrop__btn', drop);
    const vals = set ? [...set] : [];
    btn.classList.toggle('has-value', vals.length > 0);
    btn.textContent = vals.length ? (vals.length > 2 ? `${vals.slice(0, 2).join(', ')} +${vals.length - 2}` : vals.join(', ')) : btn.dataset.ph;
  }
  function syncFilters() {
    const fq = $('#fq'); if (fq) fq.value = S.q;
    $$('.fgroup').forEach(g => {
      const v = S.f[g.dataset.k];
      $$('.fchip', g).forEach(c => c.classList.toggle('is-on', !!(v instanceof Set && v.has(c.dataset.v))));
      $$('.fcheck input', g).forEach(c => { c.checked = !!(v instanceof Set && v.has(c.value)); });
      const drop = $('.fdrop', g); if (drop) dropSummary(drop, v);
      $$('.frange input', g).forEach(inp => { const n = v && v[inp.dataset.b]; inp.value = n != null ? nf.format(n) : ''; });
    });
  }

  /* ---------- картка об'єкта ---------- */
  const fmt = v => nf.format(v);
  function card(x) {
    const ph = x.photos || [], m = D.managers[x.m];
    const href = `object.html?id=${x.id}`;
    const many = ph.length >= 4;
    const thumbs = many ? `<div class="lcard__thumbs">${ph.slice(1, 4).map((p, i) =>
      `<span data-src="${pic(p, 400)}"><img src="${pic(p, 400)}" alt="" loading="lazy">${i === 2 && ph.length > 4 ? `<b class="lcard__more">+${ph.length - 4} фото</b>` : ''}</span>`).join('')}</div>` : '';
    const params = x.t === 'c'
      ? [['Кімнат', x.rooms], ['Площа', x.area && fmt(x.area) + ' м²'], ['Ділянка', x.plot && fmt(x.plot) + ' сот.'], ['Поверхів', x.storeys]]
      : [['Кімнат', x.rooms], ['Площа', x.area && fmt(x.area) + ' м²'], ['Поверх', x.floor ? `${x.floor}/${x.floors}` : null], ['Стан', x.cond]];
    const badge = x.t === 'c' ? x.cond : (x.complex ? 'ЖК ' + x.complex : x.cond);
    const loc = [x.district, x.street && (x.t === 'c' || x.street !== x.complex ? 'вул. ' + x.street : ''), x.complex && x.t !== 'c' ? 'ЖК ' + x.complex : ''].filter(Boolean).join(' · ');
    return `<article class="lcard">
      <a class="lcard__media" href="${href}" style="${many ? '' : 'grid-template-columns:1fr'}" aria-label="${esc(x.title)}">
        <div class="lcard__main">${ph[0] ? `<img src="${pic(ph[0], 400)}" alt="${esc(x.title)}" loading="lazy" data-first="${pic(ph[0], 400)}">` : ''}</div>
        ${thumbs}
        ${badge ? `<span class="lcard__badge">${esc(badge)}</span>` : ''}
      </a>
      <div class="lcard__body">
        <div class="lcard__meta"><span>ID ${x.id}</span><span>${esc(x.date)}</span></div>
        <h3><a href="${href}">${esc(x.title)}</a></h3>
        <div class="lcard__price"><b>${fmt(x.price)} $</b>${x.area ? `<small>≈ ${fmt(Math.round(x.price / x.area))} $ за м²</small>` : ''}</div>
        <div class="lcard__params">${params.map(([l, v]) => `<div><small>${l}</small><span>${v ? esc(v) : '—'}</span></div>`).join('')}</div>
        ${loc ? `<div class="lcard__loc">${ICON.pin}<span>${esc(loc)}</span></div>` : ''}
        <div class="lcard__foot">
          ${m ? `<div class="lcard__mgr"><img src="${mgrImg(m)}" alt="" loading="lazy"><div>Менеджер<b>${esc(m.name)}</b></div></div>` : '<span></span>'}
          <div class="lcard__btns"><button class="btn btn--sm" type="button" data-viewing="${x.id}">Записатись на огляд</button><a class="btn btn--sm btn--fill" href="${href}">Детальніше</a></div>
        </div>
      </div>
    </article>`;
  }

  function emptyHTML() {
    if (!ofType().length) {
      return `<div class="empty"><div class="empty__icon">${ICON.key}</div>
        <h3>Зараз немає актуальних пропозицій оренди</h3>
        <p>Пропозиції оренди з’являються й зникають дуже швидко. Залиште заявку — менеджер надішле варіанти, щойно вони з’являться.</p>
        <div class="empty__btns"><button class="btn btn--fill" type="button" data-request="Підбір оренди">Залишити заявку</button><a class="btn" href="tel:+380732612251">Зателефонувати</a></div></div>`;
    }
    return `<div class="empty"><div class="empty__icon">${ICON.search}</div>
      <h3>За вашим запитом нічого не знайдено</h3>
      <p>Спробуйте змінити або скинути фільтри. Або залиште заявку — підберемо варіант, зокрема серед об’єктів, яких ще немає у відкритому продажу.</p>
      <div class="empty__btns"><button class="btn" type="button" data-reset>Скинути фільтри</button><button class="btn btn--fill" type="button" data-request="Підбір нерухомості">Залишити заявку</button></div></div>`;
  }

  /* ---------- результати ---------- */
  const list = $('#list'), pager = $('#pager');
  function render({ scroll = false, animate = true } = {}) {
    const xs = filtered();
    const pages = Math.max(1, Math.ceil(xs.length / PER_PAGE));
    if (S.page > pages) S.page = pages;
    const slice = xs.slice((S.page - 1) * PER_PAGE, S.page * PER_PAGE);

    $('#count').textContent = xs.length;
    $('#pageinfo').textContent = pages > 1 ? `Сторінка ${S.page} з ${pages}` : '';
    $('#filters-apply').textContent = `Показати ${xs.length} ${plural(xs.length, ['обʼєкт', 'обʼєкти', 'обʼєктів'])}`;
    list.innerHTML = slice.length ? slice.map(card).join('') : emptyHTML();
    renderPager(pages);
    renderActive();

    if (animate) gsap.fromTo(list.children, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out', clearProps: 'transform' });
    if (scroll) LEVEL.scrollTo('#results', { offset: -110, duration: 1 });
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }

  function renderPager(pages) {
    if (pages < 2) { pager.innerHTML = ''; return; }
    const nums = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - S.page) <= 1) nums.push(i);
      else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    pager.innerHTML = `<button data-p="${S.page - 1}" ${S.page === 1 ? 'disabled' : ''} aria-label="Попередня">←</button>` +
      nums.map(n => n === '…' ? '<span>…</span>' : `<button data-p="${n}" class="${n === S.page ? 'is-on' : ''}">${n}</button>`).join('') +
      `<button data-p="${S.page + 1}" ${S.page === pages ? 'disabled' : ''} aria-label="Наступна">→</button>`;
  }

  function renderActive() {
    const chips = [];
    if (S.q) chips.push(['q', null, `Пошук: «${S.q}»`]);
    defs().forEach(d => {
      const v = S.f[d.k];
      if (!isActive(v)) return;
      if (v instanceof Set) v.forEach(val => chips.push([d.k, val, `${d.label.replace(/,.*$/, '')}: ${val}`]));
      else {
        const unit = (d.label.match(/,\s*(.+)$/) || [])[1] || '';
        const txt = v.min != null && v.max != null ? `${fmt(v.min)} – ${fmt(v.max)}` : v.min != null ? `від ${fmt(v.min)}` : `до ${fmt(v.max)}`;
        chips.push([d.k, null, `${d.label.replace(/,.*$/, '')}: ${txt} ${unit}`.trim()]);
      }
    });
    $('#active').innerHTML = chips.map(([k, v, t]) => `<button class="achip" type="button" data-k="${k}" data-v="${v == null ? '' : esc(v)}">${esc(t)} <b>✕</b></button>`).join('') +
      (chips.length > 1 ? '<button class="link-btn" type="button" data-reset>Скинути все</button>' : '');
    const n = chips.length;
    $('#fcount').textContent = n || '';
  }

  /* ---------- вкладки ---------- */
  const tabs = $('#tabs'), ink = $('.tabs__ink', tabs);
  $$('button', tabs).forEach(b => { $('i', b).textContent = D.items.filter(x => x.t === TYPES[b.dataset.type].code).length; });
  function moveInk() {
    const on = $(`button[data-type="${S.type}"]`, tabs);
    $$('button', tabs).forEach(b => { b.classList.toggle('is-on', b === on); b.setAttribute('aria-selected', b === on); });
    ink.style.width = on.offsetWidth + 'px';
    ink.style.transform = `translateX(${on.offsetLeft}px)`;
    $('#crumb-type').textContent = TYPES[S.type].name;
    document.title = `${TYPES[S.type].name} — каталог LEVEL Івано-Франківськ`;
  }
  tabs.addEventListener('click', e => {
    const b = e.target.closest('button[data-type]');
    if (!b || b.dataset.type === S.type) return;
    S.type = b.dataset.type; S.f = {}; S.q = ''; S.page = 1;
    moveInk(); buildFilters(); writeURL(true); render();
  });
  addEventListener('resize', moveInk);

  /* ---------- сортування ---------- */
  const sort = $('#sort');
  function syncSort() {
    $('.select__btn', sort).textContent = SORTS[S.sort];
    $$('li', sort).forEach(li => li.classList.toggle('is-on', li.dataset.v === S.sort));
  }
  $('.select__btn', sort).addEventListener('click', () => sort.classList.toggle('is-open'));
  $('.select__list', sort).addEventListener('click', e => {
    const li = e.target.closest('li'); if (!li) return;
    S.sort = li.dataset.v; S.page = 1; sort.classList.remove('is-open');
    syncSort(); writeURL(); render();
  });

  /* ---------- події панелі фільтрів ---------- */
  const apply = () => { S.page = 1; writeURL(); render(); };
  const applySoon = debounce(apply, 350);
  const body = $('#filters-body');
  const toggleValue = (k, v) => {
    const set = S.f[k] instanceof Set ? S.f[k] : (S.f[k] = new Set());
    set.has(v) ? set.delete(v) : set.add(v);
    if (!set.size) delete S.f[k];
  };
  body.addEventListener('click', e => {
    const chip = e.target.closest('.fchip');
    if (chip) { toggleValue(chip.closest('.fgroup').dataset.k, chip.dataset.v); chip.classList.toggle('is-on'); apply(); return; }
    const dbtn = e.target.closest('.fdrop__btn');
    if (dbtn) {
      const drop = dbtn.parentElement, open = !drop.classList.contains('is-open');
      $$('.fdrop.is-open', body).forEach(d => d.classList.remove('is-open'));
      drop.classList.toggle('is-open', open);
      return;
    }
    const adv = e.target.closest('.fadv-toggle');
    if (adv) toggleAdvanced(adv);
  });
  // розширений пошук: плавно розкриваємо і одразу показуємо його на екрані
  function toggleAdvanced(btn) {
    const panel = $('.fadv', body);
    const open = !panel.classList.contains('is-open');
    btn.classList.toggle('is-open', open);
    panel.classList.toggle('is-open', open);
    ScrollTrigger.refresh();
    if (!open) return;
    gsap.fromTo(panel, { height: 0, opacity: 0, overflow: 'hidden' }, {
      height: 'auto', opacity: 1, duration: 0.55, ease: 'power3.out', clearProps: 'height,opacity,overflow',
      onComplete: () => {
        ScrollTrigger.refresh();
        if (matchMedia('(max-width: 1000px)').matches) {
          // мобільна висувна панель гортається сама всередині себе
          body.scrollTo({ top: body.scrollTop + btn.getBoundingClientRect().top - body.getBoundingClientRect().top - 12, behavior: 'smooth' });
        } else if (panel.getBoundingClientRect().bottom > innerHeight - 24) {
          LEVEL.scrollTo(btn, { offset: -110, duration: 0.9 });
        }
      }
    });
  }
  body.addEventListener('change', e => {
    const cb = e.target.closest('.fcheck input'); if (!cb) return;
    const g = cb.closest('.fgroup');
    toggleValue(g.dataset.k, cb.value);
    dropSummary($('.fdrop', g), S.f[g.dataset.k]);
    apply();
  });
  body.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'fq') { S.q = t.value.trim(); applySoon(); return; }
    if (t.classList.contains('fdrop__search')) {
      const q = norm(t.value);
      $$('.fcheck', t.parentElement).forEach(l => l.classList.toggle('is-hidden', !norm(l.textContent).includes(q)));
      return;
    }
    if (t.closest('.frange')) {
      const digits = t.value.replace(/\D/g, '');
      t.value = digits ? nf.format(+digits) : '';
      const k = t.closest('.fgroup').dataset.k;
      const r = S.f[k] || (S.f[k] = { min: null, max: null });
      r[t.dataset.b] = digits ? +digits : null;
      if (r.min == null && r.max == null) delete S.f[k];
      applySoon();
    }
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.fdrop')) $$('.fdrop.is-open').forEach(d => d.classList.remove('is-open'));
    if (!e.target.closest('#sort')) sort.classList.remove('is-open');
  });

  const resetAll = () => { S.f = {}; S.q = ''; S.page = 1; syncFilters(); writeURL(); render(); };
  $('#filters-reset').addEventListener('click', resetAll);
  document.addEventListener('click', e => {
    if (e.target.closest('[data-reset]')) { resetAll(); return; }
    const req = e.target.closest('[data-request]');
    if (req) { LEVEL.openModal?.(req.dataset.request, location.href); return; }
    const ach = e.target.closest('.achip');
    if (ach) {
      const { k, v } = ach.dataset;
      if (k === 'q') S.q = '';
      else if (v) toggleValue(k, v);
      else delete S.f[k];
      syncFilters(); apply();
    }
  });

  /* ---------- список: перегляд фото, запис на огляд, пагінація ---------- */
  list.addEventListener('mouseover', e => {
    const th = e.target.closest('.lcard__thumbs span'); if (!th) return;
    const img = $('.lcard__main img', th.closest('.lcard'));
    if (img && img.src !== th.dataset.src) img.src = th.dataset.src;
  });
  list.addEventListener('mouseout', e => {
    const media = e.target.closest('.lcard__media');
    if (!media || media.contains(e.relatedTarget)) return;
    const img = $('.lcard__main img', media);
    if (img && img.dataset.first) img.src = img.dataset.first;
  });
  list.addEventListener('click', e => {
    const b = e.target.closest('[data-viewing]'); if (!b) return;
    const x = D.items.find(i => i.id === +b.dataset.viewing);
    LEVEL.openModal?.(`${x.title} · ID ${x.id}`, new URL(`object.html?id=${x.id}`, location.href).href);
  });
  pager.addEventListener('click', e => {
    const b = e.target.closest('button[data-p]'); if (!b || b.disabled) return;
    S.page = +b.dataset.p; writeURL(true); render({ scroll: true });
  });

  /* ---------- фільтри на мобільному (висувна панель) ---------- */
  const openDrawer = on => { document.body.classList.toggle('filters-on', on); LEVEL.lock(on); };
  $('#filters-open').addEventListener('click', () => openDrawer(true));
  $('#filters-close').addEventListener('click', () => openDrawer(false));
  $('#filters-scrim').addEventListener('click', () => openDrawer(false));
  $('#filters-apply').addEventListener('click', () => { openDrawer(false); LEVEL.scrollTo('#results', { offset: -110, duration: 1 }); });

  /* ---------- кнопки «Назад/Вперед» у браузері ---------- */
  addEventListener('popstate', () => {
    const prevType = S.type;
    readURL();
    if (prevType !== S.type) buildFilters(); else syncFilters();
    moveInk(); syncSort(); render({ animate: false });
  });

  /* ---------- старт ---------- */
  readURL();
  buildFilters();
  syncSort();
  render({ animate: false });
  requestAnimationFrame(moveInk);
  $('#updated').textContent = `Каталог оновлено ${D.updated}`;

  gsap.timeline({ delay: 0.55 })
    .from('.cat-title .split-line > span', { yPercent: 110, duration: 1.2, stagger: 0.1, ease: 'expo.out' })
    .from(['.cat-hero .crumbs', '.cat-sub', '#tabs'], { opacity: 0, y: 24, duration: 0.9, stagger: 0.1, ease: 'power3.out' }, 0.2)
    .from(matchMedia('(min-width: 1001px)').matches ? ['.filters', '.toolbar'] : '.toolbar', { opacity: 0, y: 30, duration: 0.9, stagger: 0.1, ease: 'power3.out', clearProps: 'transform' }, 0.35)
    .from(list.children, { opacity: 0, y: 50, duration: 0.9, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' }, 0.45);
})();
