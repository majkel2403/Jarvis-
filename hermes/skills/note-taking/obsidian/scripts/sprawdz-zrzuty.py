# -*- coding: utf-8 -*-
"""Tania kontrola zrzutow: mierzy WYCINKIEM SRODKA (poza panelami HUD), czy strona cos rysuje.

Uzycie:
    python sprawdz-zrzuty.py <katalog_ze_zrzutami> [nazwa1 nazwa2 ...]

Progi (sprawdzone): jasne% > 1.2 I kolorow > 400 I std > 14 -> rysuje.
Wyjatek: celowo rzadkie widoki (macierz sasiedztwa, cienkie luki) wypadaja ponizej progu
mimo poprawnego rysunku - taki przypadek rozstrzygaj vision_analyze, nie progiem.
"""
import sys
from pathlib import Path
from PIL import Image, ImageStat


def check(png):
    im = Image.open(png).convert('RGB')
    w, h = im.size
    core = im.crop((int(w * 0.20), 72, int(w * 0.80), h - 52))   # bez panelu lewego/prawego i paskow
    st = ImageStat.Stat(core)
    hist = core.convert('L').histogram()
    lit = 100 * sum(hist[40:]) / sum(hist)
    return {'size': (w, h), 'mean': [round(x, 1) for x in st.mean],
            'std': round(st.stddev[0], 1), 'lit_pct': round(lit, 2),
            'colors': len(core.getcolors(maxcolors=4_000_000) or [])}


def main():
    base = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('shots')
    names = sys.argv[2:]
    files = [base / (n if n.endswith('.png') else n + '.png') for n in names] if names \
        else sorted(p for p in base.glob('*.png') if 'diag' not in p.stem)
    print(f"{'zrzut':<34} {'mean RGB':<20} {'std':<7} {'jasne%':<8} {'kolorow':<8} ocena")
    for f in files:
        if not f.exists():
            print(f'{f.name:<34} BRAK ZRZUTU')
            continue
        m = check(f)
        ok = m['lit_pct'] > 1.2 and m['colors'] > 400 and m['std'] > 14
        print(f"{f.stem:<34} {str(m['mean']):<20} {m['std']:<7} {m['lit_pct']:<8} {m['colors']:<8} "
              + ('rysuje' if ok else 'PUSTO/podejrzane'))


if __name__ == '__main__':
    main()
