"""
Gera o SVG isométrico do Blokão (concreto | EPS | concreto) usado na hero.
Uso: python3 brand/scripts/gerar_bloco_iso.py > /tmp/bloco.svg  (colar no bloco ===== HERO do index.html)
Cada camada fica num <g class="camada camada--N"> pra animar separando/juntando.
"""
C, S = 0.866, 0.5
L, H = 230, 130
CAMADAS = [("concreto", 0, 16), ("eps", 16, 52), ("concreto", 52, 68)]
OX, OY = 150, 150


def p(x, y, z):
    return f"{OX + C * x - C * y:.1f},{OY + S * x + S * y - z:.1f}"


def poli(pts, classe):
    return f'<polygon class="{classe}" points="{" ".join(p(*q) for q in pts)}"/>'


partes = []
for i, (tipo, y0, y1) in enumerate(CAMADAS):
    topo = [(0, y0, H), (L, y0, H), (L, y1, H), (0, y1, H)]
    fim = [(L, y0, H), (L, y1, H), (L, y1, 0), (L, y0, 0)]
    lado = [(0, y1, H), (L, y1, H), (L, y1, 0), (0, y1, 0)]
    partes.append(
        f'<g class="camada camada--{i}" data-camada="{i}">'
        + poli(lado, f"face face--lado face--{tipo}")
        + poli(topo, f"face face--topo face--{tipo}")
        + poli(fim, f"face face--fim face--{tipo}")
        + "</g>"
    )

print(
    '<svg class="bloco-iso" viewBox="0 0 420 330" role="img" aria-labelledby="bloco-iso-titulo">'
    '<title id="bloco-iso-titulo">Blokão Sanduíche em corte: concreto, miolo de EPS e concreto</title>'
    '<defs>'
    '<pattern id="perolas" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#F6F2E7"/>'
    '<circle cx="2.5" cy="2.5" r="2" fill="#E2DCCB"/><circle cx="7" cy="7" r="2" fill="#E8E2D2"/></pattern>'
    '<pattern id="concreto" width="7" height="7" patternUnits="userSpaceOnUse">'
    '<circle cx="1.5" cy="2" r=".7" fill="#000" fill-opacity=".18"/><circle cx="5" cy="5.5" r=".5" fill="#fff" fill-opacity=".14"/></pattern>'
    '</defs>'
    f'<ellipse class="sombra" cx="{OX + C * L / 2 - C * 34:.0f}" cy="{OY + S * L / 2 + S * 34 + 6:.0f}" rx="190" ry="40"/>'
    + "".join(partes)
    + "</svg>"
)
