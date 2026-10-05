#!/usr/bin/env python3
"""Оновлює listings.js актуальними об'єктами з levelrealestate.com.ua.

Запуск (з папки Level Web):  python3 tools/update_listings.py
Поки немає адмін-панелі, це єдиний спосіб оновити каталог.
"""
import concurrent.futures as cf
import html
import json
import os
import re
import subprocess
import time
from datetime import date

BASE = 'https://levelrealestate.com.ua'
TYPES = ['apartments', 'cottages', 'commerce']
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'listings.js')


def get(path):
    for attempt in range(3):
        r = subprocess.run(['curl', '-sfL', '--max-time', '30', BASE + path], capture_output=True)
        if r.returncode == 0:
            return r.stdout.decode('utf-8', 'replace')
        time.sleep(1 + attempt)
    return ''


def clean(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()


def num(s):
    m = re.search(r'\d+(?:[.,]\d+)?', s or '')
    return float(m.group(0).replace(',', '.')) if m else None


def collect_ids():
    items = []
    for typ in TYPES:
        page, seen = 1, set()
        while True:
            objs = get(f'/catalog/{typ}?page={page}').split('<div class="object">')[1:]
            new = 0
            for o in objs:
                m = re.search(rf'href="/catalog/{typ}/(\d+)"', o)
                if not m or m.group(1) in seen:
                    continue
                seen.add(m.group(1))
                new += 1
                d = re.search(r'<div class="add_time">\s*<div class="">([^<]*)</div>', o)
                items.append({'type': typ, 'id': int(m.group(1)), 'date': d.group(1).strip() if d else ''})
            print(f'{typ}: сторінка {page}, нових {new}', flush=True)
            if not new:
                break
            page += 1
    return items


def detail(it):
    h = get(f"/catalog/{it['type']}/{it['id']}")
    t = re.search(r'<title>([^<]*)</title>', h)
    labels = [clean(x) for x in re.findall(r'<div class="abouts_1">(.*?)</div>', h, re.S)]
    vals = [clean(x) for x in re.findall(r'<div class="abouts_2">(.*?)</div>', h, re.S)]
    params = {l: v for l, v in zip(labels, vals) if l and v and v != '—'}
    p = re.search(r'<div class="parameters_price">(.*?)</div>', h, re.S)
    price_text = clean(p.group(1)) if p else ''
    d = re.search(r'<div class="description_other">(.*?)</div>', h, re.S)
    photos = []
    for ph in re.findall(r'href="/pic/(' + it['type'] + r'/[^"]+\.(?:webp|jpe?g|png))"', h):
        if ph not in photos:
            photos.append(ph)
    mg = {}
    for k in ['manager_surname', 'manager_name', 'manager_phone']:
        m = re.search(rf'<div class="{k}">(.*?)</div>', h, re.S)
        mg[k] = clean(m.group(1)) if m else ''
    im = re.search(r'<img class="img_manager" src="([^"]+)"', h)

    floor = params.get('Поверх', '')
    fl = re.match(r'\s*(\d+)\s*/\s*(\d+)', floor)
    out = {
        'id': it['id'],
        't': {'apartments': 'a', 'cottages': 'c', 'commerce': 'r'}[it['type']],
        'title': clean(t.group(1)) if t else '',
        'price': int(re.sub(r'\D', '', price_text) or 0),
        'date': it['date'],
        'rooms': int(num(params.get('К-сть кімнат')) or 0),
        'area': num(params.get('Площа')),
        'floor': int(fl.group(1)) if fl else None,
        'floors': int(fl.group(2)) if fl else None,
        'storeys': int(num(params.get('Поверхів')) or 0) or None,
        'plot': num(params.get('Ділянка')),
        'cond': params.get('Стан', ''),
        'district': params.get('Район', ''),
        'street': params.get('Вулиця', ''),
        'complex': params.get('ЖК', ''),
        'dev': params.get('Забудовник', ''),
        'comm': [c.strip() for c in params.get('Комунікації', '').split(',') if c.strip()],
        'heat': params.get('Опалення', ''),
        'insul': params.get('Утеплення', ''),
        'material': params.get('Матеріал стін', ''),
        'desc': re.sub(r'\n{3,}', '\n\n', (clean(d.group(1)) if d else '').replace('\r', '')).strip(),
        'photos': photos,
        'mgr': {
            'name': (mg['manager_surname'] + ' ' + mg['manager_name']).strip(),
            'phone': mg['manager_phone'],
            'img': im.group(1) if im else '',
        },
    }
    return {k: v for k, v in out.items() if v not in (None, '', [])}


def main():
    items = collect_ids()
    print('Всього обʼєктів:', len(items))
    with cf.ThreadPoolExecutor(6) as ex:
        rows = [r for r in ex.map(detail, items) if r.get('title')]

    # менеджерів зберігаємо окремо, щоб не дублювати їх у кожному об'єкті
    managers, index = [], {}
    for r in rows:
        m = r.pop('mgr')
        key = (m['name'], m['phone'])
        if key not in index:
            index[key] = len(managers)
            managers.append(m)
        r['m'] = index[key]

    data = {'base': BASE, 'updated': date.today().strftime('%d.%m.%Y'), 'managers': managers, 'items': rows}
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('// Згенеровано tools/update_listings.py — не редагуйте вручну\n')
        f.write('window.LEVEL_LISTINGS = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('Збережено', len(rows), 'обʼєктів у', os.path.normpath(OUT))


if __name__ == '__main__':
    main()
