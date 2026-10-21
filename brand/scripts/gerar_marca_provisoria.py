"""
Marca PROVISÓRIA do Império do EPS (só tipografia + o bloco em corte), usada no site
até o logo definitivo ficar pronto. Texto convertido em curvas (não depende de fonte).
Uso: python3 brand/scripts/gerar_marca_provisoria.py <pasta com Archivo_125_900.ttf, Archivo_125_800.ttf, Archivo_100_700.ttf>
Saída: assets/img/marca*.svg e brand/instagram/destaque-*.svg
"""
import os
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FONTES = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(__file__), "..", "..")
GRAFITE, AZUL, CONCRETO, CAL = "#1E2023", "#1F4BD8", "#A8A39A", "#F3F1EC"
_f = {}


def texto(t, nome, tam, x, y, track=0.0):
    f = _f.setdefault(nome, TTFont(os.path.join(FONTES, nome)))
    gs, cmap, esc = f.getGlyphSet(), f.getBestCmap(), tam / f["head"].unitsPerEm
    pen, cx = SVGPathPen(gs), x
    for ch in t:
        g = cmap[ord(ch)]
        gs[g].draw(TransformPen(pen, (esc, 0, 0, -esc, cx, y)))
        cx += f["hmtx"][g][0] * esc + track
    return pen.getCommands(), cx - track - x


def bloco(x, y, w, h, contorno):
    """O Blocão em corte: concreto | EPS | concreto (proporção do bloco de 15 cm)."""
    c = h * 3.5 / 15
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{c:.2f}" rx="1.5" fill="{CONCRETO}"/>'
            f'<rect x="{x}" y="{y + c:.2f}" width="{w}" height="{h - 2 * c:.2f}" fill="#fff" stroke="{contorno}" stroke-width="1.2"/>'
            f'<rect x="{x}" y="{y + h - c:.2f}" width="{w}" height="{c:.2f}" rx="1.5" fill="{CONCRETO}"/>')


def marca(cor, destaque, contorno):
    d1, l1 = texto("IMPÉRIO", "Archivo_125_900.ttf", 46, 62, 46, 0.5)
    d2, l2 = texto("DO EPS", "Archivo_125_800.ttf", 46, 62 + l1 + 12, 46, 0.5)
    d3, _ = texto("FÁBRICA DO BLOCÃO · ITAPETININGA", "Archivo_100_700.ttf", 11.5, 63, 68, 2.2)
    w = 62 + l1 + 12 + l2 + 6
    return w, (f'{bloco(4, 10, 46, 46, contorno)}<path fill="{cor}" d="{d1}"/><path fill="{destaque}" d="{d2}"/>'
               f'<path fill="{cor}" fill-opacity=".62" d="{d3}"/>')


def salvar(rel, svg):
    p = os.path.join(RAIZ, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w").write(svg)
    print("ok", rel)


w, m = marca(GRAFITE, AZUL, "#cfcac0")
salvar("assets/img/marca.svg", f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} 76">{m}</svg>')
w, m = marca("#ffffff", "#8FB0FF", "#ffffff00")
salvar("assets/img/marca-clara.svg", f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} 76">{m}</svg>')
salvar("assets/img/favicon.svg", f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="{CAL}"/>{bloco(10, 10, 44, 44, "#cfcac0")}</svg>')

ICONES = {
    "blocao": bloco(-50, -50, 100, 100, "#cfcac0"),
    "obras": f'<path d="M-52 40V-6L0-44 52-6V40Z" fill="none" stroke="{GRAFITE}" stroke-width="9" stroke-linejoin="round"/><rect x="-16" y="6" width="32" height="34" fill="{AZUL}"/>',
    "fachadas": f'<path d="M-48 42V-18H48V42" fill="none" stroke="{GRAFITE}" stroke-width="9"/><path d="M-60-20H60M-52-34H52" stroke="{AZUL}" stroke-width="9" stroke-linecap="round"/><rect x="-32" y="0" width="24" height="24" fill="{GRAFITE}"/><rect x="8" y="0" width="24" height="24" fill="{GRAFITE}"/>',
    "clientes": f'<circle cx="0" cy="-18" r="20" fill="{GRAFITE}"/><path d="M-40 44C-40 8 40 8 40 44Z" fill="{GRAFITE}"/><circle cx="34" cy="-30" r="14" fill="{AZUL}"/><path d="M27-30l5 5 9-10" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>',
    "promocoes": f'<path d="M-46-10-10-46H42V6L6 42Z" fill="{AZUL}"/><circle cx="22" cy="-26" r="8" fill="{CAL}"/>',
    "como-funciona": f'<circle r="46" fill="none" stroke="{GRAFITE}" stroke-width="9"/><path d="M0-26V2L20 14" stroke="{AZUL}" stroke-width="9" stroke-linecap="round" fill="none"/>',
}
for nome, ico in ICONES.items():
    salvar(f"brand/instagram/destaque-{nome}.svg",
           f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="{CAL}"/>'
           f'<circle cx="540" cy="960" r="330" fill="#E4E0D8"/><g transform="translate(540 960) scale(4)">{ico}</g></svg>')
