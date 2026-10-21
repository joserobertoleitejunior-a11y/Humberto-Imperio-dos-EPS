"""
Gera os arquivos da marca Império do EPS (SVG com texto convertido em curvas).
Uso: python3 brand/scripts/gerar_marca.py <pasta-com-fontes-ttf>
Fontes (Google Fonts, OFL): Cinzel 700/800 e Archivo 600/700.
Saída: brand/logo/*.svg e brand/instagram/*.svg
"""
import os
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FONTES = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(__file__), "..")
_cache = {}

OURO = ("#F6E3A1", "#D4AF5A", "#9C7425")
GRAFITE = "#141416"
EPS = "#F5F1E6"


def fonte(nome):
    if nome not in _cache:
        _cache[nome] = TTFont(os.path.join(FONTES, nome))
    return _cache[nome]


def texto(t, nome, tam, x, y, track=0.0, ancora="start"):
    """Converte texto em <path d>. Retorna (d, largura)."""
    f = fonte(nome)
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    upm = f["head"].unitsPerEm
    esc = tam / upm
    larg = 0
    nomes = []
    for ch in t:
        g = cmap.get(ord(ch))
        nomes.append(g)
        larg += (f["hmtx"][g][0] * esc if g else tam * 0.3) + track
    larg -= track
    if ancora == "middle":
        x -= larg / 2
    elif ancora == "end":
        x -= larg
    pen = SVGPathPen(gs)
    cx = x
    for g in nomes:
        if g:
            tp = TransformPen(pen, (esc, 0, 0, -esc, cx, y))
            gs[g].draw(tp)
            cx += f["hmtx"][g][0] * esc + track
        else:
            cx += tam * 0.3 + track
    return pen.getCommands(), larg


def defs(id_="ouro"):
    a, b, c = OURO
    return (
        f'<defs><linearGradient id="{id_}" x1="0" y1="0" x2="0.35" y2="1">'
        f'<stop offset="0" stop-color="{a}"/><stop offset=".5" stop-color="{b}"/>'
        f'<stop offset="1" stop-color="{c}"/></linearGradient></defs>'
    )


def simbolo(ouro="url(#ouro)", eps=EPS, contorno=None):
    """Coroa apoiada no Blokão em corte (concreto | EPS | concreto). viewBox 0 0 120 120."""
    # Pérolas do EPS (textura do isopor) dentro da faixa clara
    pontos = "".join(
        f'<circle cx="{21 + i * 9 + (4.5 if j % 2 else 0)}" cy="{84.5 + j * 3.6}" r="1.5"/>'
        for j in range(3) for i in range(10) if 21 + i * 9 + (4.5 if j % 2 else 0) < 101
    )
    borda = f' stroke="{contorno}" stroke-width="1.5"' if contorno else ""
    return (
        f'<path fill="{ouro}" d="M18 66 L13 27 L38 45 L60 11 L82 45 L107 27 L102 66 Z"/>'
        f'<path fill="{GRAFITE}" fill-opacity=".28" d="M60 24 L72 46 L60 58 L48 46 Z"/>'
        f'<circle cx="13" cy="27" r="5.5" fill="{ouro}"/><circle cx="107" cy="27" r="5.5" fill="{ouro}"/>'
        f'<circle cx="60" cy="10" r="6.5" fill="{ouro}"/>'
        f'<rect x="15" y="71" width="90" height="8" rx="2" fill="{ouro}"/>'
        f'<rect x="15" y="80.5" width="90" height="15" rx="1.5" fill="{eps}"{borda}/>'
        f'<g fill="#BDB5A0" opacity=".6">{pontos}</g>'
        f'<rect x="15" y="97" width="90" height="8" rx="2" fill="{ouro}"/>'
    )


def salvar(caminho, svg):
    caminho = os.path.join(RAIZ, caminho)
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, "w") as arq:
        arq.write(svg)
    print("ok", os.path.relpath(caminho, RAIZ))


def palavra(cor_texto, cor_sub, x, y_imp, larg_alvo=None):
    d1, l1 = texto("IMPÉRIO", "Cinzel_wght_800.ttf", 64, x, y_imp, track=3)
    d2, l2 = texto("DO EPS", "Cinzel_wght_700.ttf", 30, x + l1 / 2, y_imp + 40, track=10, ancora="middle")
    d3, l3 = texto("BLOKÃO SANDUÍCHE", "Archivo_wght_600.ttf", 13, x + l1 / 2, y_imp + 66, track=4.2, ancora="middle")
    meio = x + l1 / 2
    lin = (
        f'<rect x="{x:.1f}" y="{y_imp + 27:.1f}" width="{(l1 - l2) / 2 - 14:.1f}" height="1.6" fill="{cor_sub}"/>'
        f'<rect x="{meio + l2 / 2 + 14:.1f}" y="{y_imp + 27:.1f}" width="{(l1 - l2) / 2 - 14:.1f}" height="1.6" fill="{cor_sub}"/>'
    )
    return (
        f'<path fill="{cor_texto}" d="{d1}"/><path fill="{cor_sub}" d="{d2}"/>{lin}'
        f'<path fill="{cor_texto}" fill-opacity=".72" d="{d3}"/>',
        l1,
    )


def main():
    # Símbolo isolado
    for nome, fundo in [("simbolo.svg", None), ("simbolo-fundo-escuro.svg", GRAFITE)]:
        bg = f'<rect width="120" height="120" rx="24" fill="{fundo}"/>' if fundo else ""
        salvar(f"logo/{nome}", f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">{defs()}{bg}{simbolo()}</svg>')
    salvar("logo/simbolo-mono.svg", f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">{simbolo("#141416", "#fff", "#141416")}</svg>')

    # Horizontal (escuro e claro)
    for nome, fundo, cor, sub, eps, borda in [
        ("logo-horizontal-escuro.svg", GRAFITE, "#F5F1E6", "url(#ouro)", EPS, None),
        ("logo-horizontal-claro.svg", "#FBF8F1", GRAFITE, "#9C7425", "#fff", "#9C7425"),
        ("logo-horizontal-transparente.svg", None, "#F5F1E6", "url(#ouro)", EPS, None),
    ]:
        marca, l1 = palavra(cor, sub, 150, 74)
        w = 150 + l1 + 28
        bg = f'<rect width="{w:.0f}" height="160" fill="{fundo}"/>' if fundo else ""
        salvar(
            f"logo/{nome}",
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} 160">{defs()}{bg}'
            f'<g transform="translate(14 18) scale(1.05)">{simbolo(eps=eps, contorno=borda)}</g>{marca}</svg>',
        )

    # Vertical
    marca, l1 = palavra("#F5F1E6", "url(#ouro)", 0, 0)
    w = max(l1, 200) + 60
    salvar(
        "logo/logo-vertical-escuro.svg",
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} 330">{defs()}'
        f'<rect width="{w:.0f}" height="330" fill="{GRAFITE}"/>'
        f'<g transform="translate({w / 2 - 75:.1f} 24) scale(1.25)">{simbolo()}</g>'
        f'<g transform="translate({(w - l1) / 2:.1f} 236)">{marca}</g></svg>',
    )

    # Instagram: avatar (lê bem em 110 px, área segura circular)
    salvar(
        "instagram/avatar.svg",
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">{defs()}'
        f'<defs><radialGradient id="luz" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="#2A2A2E"/>'
        f'<stop offset="1" stop-color="#0B0B0C"/></radialGradient></defs>'
        f'<rect width="1080" height="1080" fill="url(#luz)"/>'
        f'<circle cx="540" cy="540" r="470" fill="none" stroke="url(#ouro)" stroke-width="10" opacity=".55"/>'
        f'<g transform="translate(540 520) scale(5.4) translate(-60 -58)">{simbolo()}</g></svg>',
    )

    # Capas de destaque
    icones = {
        "blokao": '<rect x="-46" y="-30" width="92" height="14" rx="3" fill="url(#ouro)"/><rect x="-46" y="-12" width="92" height="24" rx="2" fill="#F5F1E6"/><rect x="-46" y="16" width="92" height="14" rx="3" fill="url(#ouro)"/>',
        "obras": '<path d="M-50 34 L-50 -4 L0 -40 L50 -4 L50 34 Z" fill="none" stroke="url(#ouro)" stroke-width="9" stroke-linejoin="round"/><rect x="-14" y="6" width="28" height="28" fill="#F5F1E6"/>',
        "fachadas": '<path d="M-48 40 V-20 H48 V40" fill="none" stroke="url(#ouro)" stroke-width="9"/><path d="M-58 -20 H58 M-52 -32 H52" stroke="#F5F1E6" stroke-width="8" stroke-linecap="round"/><rect x="-30" y="0" width="22" height="22" fill="#F5F1E6"/><rect x="8" y="0" width="22" height="22" fill="#F5F1E6"/>',
        "clientes": '<circle cx="0" cy="-18" r="18" fill="url(#ouro)"/><path d="M-36 40 C-36 8 36 8 36 40 Z" fill="url(#ouro)"/><path d="M-6 -60 L0 -48 L6 -60 L14 -50 L0 -40 L-14 -50 Z" fill="#F5F1E6"/>',
        "promocoes": '<path d="M-44 -10 L-10 -44 H40 V6 L6 40 Z" fill="url(#ouro)"/><circle cx="22" cy="-26" r="8" fill="#141416"/><path d="M-18 6 L8 -20" stroke="#141416" stroke-width="7" stroke-linecap="round"/>',
        "como-funciona": '<circle cx="0" cy="0" r="44" fill="none" stroke="url(#ouro)" stroke-width="9"/><path d="M0 -24 V2 L18 14" stroke="#F5F1E6" stroke-width="9" stroke-linecap="round" fill="none"/>',
    }
    for nome, ico in icones.items():
        salvar(
            f"instagram/destaque-{nome}.svg",
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">{defs()}'
            f'<rect width="1080" height="1920" fill="#141416"/>'
            f'<circle cx="540" cy="960" r="330" fill="#1E1E21" stroke="url(#ouro)" stroke-width="6"/>'
            f'<g transform="translate(540 960) scale(4.1)">{ico}</g></svg>',
        )


main()
