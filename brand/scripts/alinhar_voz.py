#!/usr/bin/env python3
"""Alinha o texto da narração ao áudio (sem baixar modelo): acha as pausas reais do áudio, casa com a pontuação do
roteiro (programação dinâmica) e reparte as palavras de cada trecho pelo nº de sílabas, ajustando cada fronteira para o
vale de energia mais próximo. Saída: JSON com início/fim de cada palavra e de cada frase.
Uso: alinhar_voz.py <audio.wav 16k mono> <roteiro.txt> <saida.json>"""
import json, math, re, sys
import numpy as np
from scipy.io import wavfile

wav, txt, out = sys.argv[1:4]
sr, x = wavfile.read(wav)
x = x.astype(np.float32) / 32768.0
hop = int(sr * 0.010)
win = int(sr * 0.025)
n = (len(x) - win) // hop
env = np.array([np.sqrt(np.mean(x[i * hop:i * hop + win] ** 2) + 1e-12) for i in range(n)])
db = 20 * np.log10(env + 1e-9)
ref = np.percentile(db, 95)
rel = db - ref                       # dB abaixo do nível de fala
fala = rel > -30
idx = np.where(fala)[0]
t_ini, t_fim = idx[0] * 0.01, idx[-1] * 0.01 + 0.025

# pausas reais (>= 110 ms abaixo de -30 dB)
pausas = []
i = 0
while i < n:
    if not fala[i]:
        j = i
        while j < n and not fala[j]: j += 1
        d = (j - i) * 0.01
        if d >= 0.11 and i * 0.01 > t_ini and j * 0.01 < t_fim: pausas.append((i * 0.01, j * 0.01))
        i = j
    else: i += 1

# roteiro -> tokens (palavra, pontuação que vem depois)
texto = open(txt, encoding="utf-8").read()
tok = []
for m in re.finditer(r"([^\s…\.,:;\?!]+(?:-[^\s…\.,:;\?!]+)*)\s*([…\.,:;\?!]*)", texto):
    w, p = m.group(1), m.group(2)
    tok.append([w, p])

def silabas(w):
    w = w.lower().replace("-", "")
    g = re.findall(r"[aeiouáéíóúâêôãõàü]+", w)
    n = 0
    for gr in g:
        n += 1
        if re.search(r"[aáàãâ][eéêo]|[eéê][aáoó]|[ií][aáoóeé]$|[oóô][eé]", gr) and len(gr) > 2: n += 0
    return max(1, n)
PAUSA = {"…": 0.30, ".": 0.24, ":": 0.20, "?": 0.24, "!": 0.22, ",": 0.12, ";": 0.16}
for t in tok:
    t.append(silabas(t[0]))
    t.append(PAUSA.get(t[1][-1:], 0.0) if t[1] else 0.0)

# fronteiras (depois de cada token com pontuação)
cum = np.cumsum([t[2] + 0.35 for t in tok])
W = cum[-1]
bord = [(k, t[1][-1], cum[k]) for k, t in enumerate(tok) if t[1]]
soma_pausas = sum(t[3] for t in tok)
T = (t_fim - t_ini) - soma_pausas
def prev(k):
    acum = sum(tok[q][3] for q in range(k))
    return t_ini + cum[k] / W * T + acum

SKIP = {"…": 4, ".": 5, ":": 3, "?": 4, "!": 4, ",": 1.2, ";": 1.5}
INF = 1e9
M, P = len(bord), len(pausas)
dp = np.full((M + 1, P + 1), INF); ant = {}
dp[0, 0] = 0
for j in range(M + 1):
    for i in range(P + 1):
        c = dp[j, i]
        if c >= INF: continue
        if j < M:  # pular esta pontuação (sem pausa audível)
            nc = c + SKIP[bord[j][1]]
            if nc < dp[j + 1, i]: dp[j + 1, i] = nc; ant[(j + 1, i)] = (j, i, None)
            if i < P:  # casar pontuação j com pausa i
                mid = (pausas[i][0] + pausas[i][1]) / 2
                d = (mid - prev(bord[j][0])) / 1.0
                nc = c + d * d
                if nc < dp[j + 1, i + 1]: dp[j + 1, i + 1] = nc; ant[(j + 1, i + 1)] = (j, i, i)
        if i < P:  # pausa i sem pontuação (hesitação dentro da frase)
            nc = c + 0.8
            if nc < dp[j, i + 1]: dp[j, i + 1] = nc; ant[(j, i + 1)] = (j, i, -1)
j, i = M, P
par = {}
while (j, i) != (0, 0):
    pj, pi, m = ant[(j, i)]
    if m is not None and m >= 0: par[j - 1] = m
    j, i = pj, pi

# âncoras: tokens que terminam numa pausa casada
ancora_fim = {}   # índice do token -> (fim_fala, inicio_proxima)
for jb, ip in par.items():
    ancora_fim[bord[jb][0]] = pausas[ip]

# reparte palavras por trecho entre âncoras
tempos = [None] * len(tok)
ini_trecho = t_ini
k0 = 0
cortes = sorted(ancora_fim)
for fim_tok in cortes + [len(tok) - 1]:
    fim_t = ancora_fim[fim_tok][0] if fim_tok in ancora_fim else t_fim
    ps = [tok[q][2] + 0.35 for q in range(k0, fim_tok + 1)]
    # pausas curtas (vírgulas sem pausa audível) pesam um pouco
    tot = sum(ps); dur = max(0.05, fim_t - ini_trecho)
    t = ini_trecho
    for q, w in zip(range(k0, fim_tok + 1), ps):
        d = dur * w / tot
        tempos[q] = [t, t + d]
        t += d
    ini_trecho = ancora_fim[fim_tok][1] if fim_tok in ancora_fim else fim_t
    k0 = fim_tok + 1

# refina: cada fronteira entre palavras vai pro vale de energia mais próximo (±90 ms)
def vale(t, raio=0.09):
    a, b = int((t - raio) / 0.01), int((t + raio) / 0.01)
    a, b = max(0, a), min(n - 1, b)
    sm = np.convolve(db, np.ones(3) / 3, mode="same")
    k = a + int(np.argmin(sm[a:b + 1]))
    return k * 0.01 + 0.0125
for q in range(len(tok) - 1):
    if tempos[q][1] - 0 < tempos[q + 1][0] - 0.02: continue  # há pausa entre elas: mantém
    v = vale(tempos[q][1])
    v = min(max(v, tempos[q][0] + 0.06), tempos[q + 1][1] - 0.06)
    tempos[q][1] = tempos[q + 1][0] = v

dados = {"duracao": len(x) / sr, "fala_ini": t_ini, "fala_fim": t_fim, "pausas": pausas, "ancoras": len(par), "pontuacoes": M,
         "palavras": [{"w": t[0], "p": t[1], "ini": round(tempos[q][0], 3), "fim": round(tempos[q][1], 3)} for q, t in enumerate(tok)]}
json.dump(dados, open(out, "w"), ensure_ascii=False, indent=1)
print(f"fala {t_ini:.2f}-{t_fim:.2f}s · {len(tok)} palavras · {len(pausas)} pausas · {len(par)}/{M} pontuações casadas")
