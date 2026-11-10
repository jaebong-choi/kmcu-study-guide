# index.html 의 번역(T, DEPTS)을 원어민 검수용 표로 뽑는다.
# 실행: python tools/translations_csv.py  → translations-review.csv (엑셀에서 바로 열림)
# 번역을 고친 뒤 다시 실행하면 표가 새로 만들어진다.
import csv, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGS = ['ko', 'en', 'es', 'vi', 'zh', 'ru']


def js_to_json(src):
    """T 같은 단순한 JS 객체 리터럴(작은따옴표 문자열, 따옴표 없는 키, 끝 쉼표)을 JSON으로 바꾼다."""
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if c == "'":
            j, buf = i + 1, []
            while src[j] != "'":
                if src[j] == '\\':
                    j += 1
                buf.append(src[j])
                j += 1
            out.append(json.dumps(''.join(buf), ensure_ascii=False))
            i = j + 1
        elif c.isalpha() or c == '_':
            m = re.match(r'[A-Za-z_]\w*', src[i:])
            word = m.group(0)
            out.append(json.dumps(word) if re.match(r'\s*:', src[i + len(word):]) else word)
            i += len(word)
        elif c == '/' and src[i:i + 2] == '//':
            i = src.index('\n', i)
        else:
            out.append(c)
            i += 1
    return re.sub(r',(\s*[}\]])', r'\1', ''.join(out))


def flat(v, key, rows):
    if isinstance(v, dict):
        for k, x in v.items():
            flat(x, f'{key}.{k}' if key else k, rows)
    elif isinstance(v, list):
        for k, x in enumerate(v):
            flat(x, f'{key}[{k}]', rows)
    else:
        rows[key] = v


html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
t_src = html[html.index('const T = {') + 10: html.index('\n};\n\n// ===== 도우미') + 2]
T = json.loads(js_to_json(t_src))
d_src = html[html.index('const DEPTS = [') + 14: html.index('];', html.index('const DEPTS = [')) + 1]
DEPTS = json.loads(js_to_json(d_src))

per = {lg: {} for lg in LANGS}
for lg in LANGS:
    flat(T[lg], '', per[lg])
keys = list(per['ko'])

with open(os.path.join(ROOT, 'translations-review.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['키', *LANGS, '검수 메모'])
    for k in keys:
        w.writerow([k, *(per[lg].get(k, '(없음)') for lg in LANGS), ''])
    for gi, (group, depts) in enumerate(DEPTS):
        w.writerow([f'DEPTS[{gi}]', *group, ''])
        for di, d in enumerate(depts):
            w.writerow([f'DEPTS[{gi}][{di}]', *d, ''])

missing = {lg: [k for k in keys if k not in per[lg]] for lg in LANGS}
extra = {lg: [k for k in per[lg] if k not in per['ko']] for lg in LANGS}
print('rows', len(keys) + sum(1 + len(d) for _, d in DEPTS))
print('missing', {k: v for k, v in missing.items() if v})
print('extra', {k: v for k, v in extra.items() if v})
