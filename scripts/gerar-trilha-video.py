"""Trilha dos vídeos Stories do Império do EPS (base: scripts/gerar-audio-video.py da Pizza em Dobro, SEM locução).
Música sintetizada sem direitos autorais: violão no contratempo, baixo redondo, viola em terças, rim click.
Uso: python3 scripts/gerar-trilha-video.py roteiro.json saida.mp3   (MUSICA=arquivo.mp3 troca pela trilha escolhida)
  roteiro.json = {"tempos": "tempos-X.json", "cenas": [{"id":..., "fala":..., "min": s, "fim": bool}, ...]}   (gerado por scripts/exportar-roteiro.js)
  Cada cena dura o "min" dela. Grava também video/tempos-X.json, que o vídeo usa pra montar a linha do tempo.
Precisa de: numpy, scipy, imageio-ffmpeg (pip)."""
import sys, os, json, wave, subprocess, tempfile, numpy as np
from scipy.signal import lfilter, fftconvolve
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
SR = 44100
rot = json.load(open(sys.argv[1])); saida = sys.argv[2]
# ───────────── linha do tempo (sem locução: cada cena dura o "min" dela) ─────────────
# A voz neural (Kokoro) da Pizza em Dobro precisa baixar o modelo do GitHub/HuggingFace; quando houver
# acesso (ou a gravação da voz do Vinicius), dá pra voltar a usar scripts da Pizza como base.
t = 0.0; tempos = {}
for c in rot['cenas']:
    d = c.get('min') or (3.2 if c.get('fim') else 3.0)
    tempos[c['id']] = {'t0': round(t, 2), 't1': round(t + d, 2)}
    print(f"  {c['id']:11s} {t:6.2f} → {t + d:6.2f}s  {c['fala'][:55]}")
    t += d
DUR = round(t, 2)
os.makedirs('video', exist_ok=True)
json.dump({'dur': DUR, 'cenas': tempos}, open(os.path.join(os.path.dirname(os.path.abspath(saida)), rot['tempos']), 'w'), indent=1)
N = int(SR * (DUR + 3))
voz = np.zeros(N)
rng = np.random.default_rng(5)
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

# ───────────── violão (Karplus-Strong + corpo) ─────────────
def corda(f, dur, brilho=.5, decaimento=.9965, pos=.18):
    n0 = int(SR / f); g = decaimento
    a = np.zeros(n0 + 2); a[0] = 1; a[n0] = -g / 2; a[n0 + 1] = -g / 2
    ex = rng.standard_normal(n0 + 2)
    for _ in range(int(3 + (1 - brilho) * 5)): ex = (ex + np.roll(ex, 1)) / 2           # ponta do dedo: som mais macio
    p = max(1, int(n0 * pos)); ex = ex - np.roll(ex, p)                                    # posição do toque
    x = np.zeros(int(SR * dur)); x[:len(ex)] = ex
    y = lfilter([1.0], a, x)
    r = (SR / n0) / f                                                                      # acerta a afinação (inteiro do atraso)
    y = np.interp(np.arange(int(len(y) / r)) * r, np.arange(len(y)), y)
    return y / (np.abs(y).max() + 1e-9) * np.minimum(1, np.arange(len(y)) / 40.0)
def nota(bus, t, m, vel=.7, dur=2.2, **k):
    y = corda(hz(m), dur, **k) * vel; i = max(0, int(t * SR))
    if i < len(bus): y = y[: len(bus) - i]; bus[i:i + len(y)] += y
violao = np.zeros(N); viola = np.zeros(N); baixo = np.zeros(N); perc = np.zeros(N)
# reggae lento (72 bpm), tom de Sol maior, I–IV–V como no sertanejo. Acordes: (baixo, notas do violão)
AC = {'G': (43, [55, 59, 62, 67]), 'C': (48, [55, 60, 64, 67]), 'D': (50, [57, 62, 66, 69]), 'Em': (40, [55, 59, 64, 67])}
TERCAS = {'G': [(71, 74), (69, 72), (67, 71)], 'C': [(72, 76), (71, 74), (69, 72)], 'D': [(74, 78), (73, 76), (71, 74)], 'Em': [(71, 74), (69, 72), (67, 71)]}
PROG = ['G', 'G', 'C', 'G', 'Em', 'C', 'D', 'G'] * 8
BPM = 72; BEAT = 60 / BPM; BAR = BEAT * 4
nbar = int((DUR + 2) / BAR) + 1
def cl(n): return corda(hz(n), .22, brilho=.35, decaimento=.93)          # acorde "abafado" (skank)
for b in range(nbar):
    ch = PROG[b % len(PROG)]; raiz, ac = AC[ch]; t0 = b * BAR; jit = lambda: rng.normal(0, .007)
    # violão: batida de reggae só nos contratempos (&2 e &4), curta e abafada
    for k in (1.5, 3.5):
        for j, n in enumerate(ac): nota(violao, t0 + k * BEAT + j * .008 + jit(), n, .5 if k == 1.5 else .42, .25, brilho=.35, decaimento=.93)
    # baixo redondo: "one drop" (sem o 1, forte no 3) com notinha de passagem
    nota(baixo, t0 + 2 * BEAT, raiz, .9, 1.0, brilho=.1, decaimento=.9985)
    nota(baixo, t0 + 3 * BEAT, raiz + 7, .6, .7, brilho=.1, decaimento=.9985)
    nota(baixo, t0 + 3.5 * BEAT, raiz + 12, .45, .5, brilho=.1, decaimento=.9985)
    # percussão bem suave: rim click no 3 e shaker nos contratempos
    perc_i = int((t0 + 2 * BEAT) * SR)
    if perc_i + 2000 < N:
        tt = np.arange(1500) / SR; perc[perc_i:perc_i + 1500] += np.sin(2 * np.pi * 1700 * tt) * np.exp(-tt * 120) * .5
    for k in range(8):
        i = int((t0 + k * BEAT / 2) * SR)
        if i + 900 < N: perc[i:i + 900] += np.diff(rng.standard_normal(901)) * np.exp(-np.arange(900) / SR * 150) * (.22 if k % 2 else .12)
    # viola em terças (sertanejo): frase curta a cada 4 compassos, notas longas e doces
    if b % 4 in (1, 3) and b >= 2:
        for j, (n1, n2) in enumerate(TERCAS[ch]):
            tt = t0 + (j * 1.25 + .5) * BEAT
            nota(viola, tt, n1, .5, 1.6, brilho=.6, decaimento=.9975); nota(viola, tt + .01, n2, .42, 1.6, brilho=.6, decaimento=.9975)
t = np.arange(int(.9 * SR)) / SR
ir = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in ((98, 1, 22), (196, .8, 30), (392, .5, 45), (780, .25, 70))) + rng.standard_normal(len(t)) * np.exp(-t * 90) * .15
ir /= np.abs(ir).sum() * .12
corpo = lambda x: fftconvolve(x, ir)[: len(x)]
musica = corpo(violao) * .75 + corpo(viola) * .8 + corpo(baixo) * 1.0 + perc * .5
tr = np.arange(int(1.4 * SR)) / SR; rv = rng.standard_normal(len(tr)) * np.exp(-tr * 3.2); rv = lfilter([1 - .55], [1, -.55], rv)
musica = musica + fftconvolve(musica, rv)[: len(musica)] * .035
musica = musica[:N]; musica /= np.abs(musica).max()
# trilha escolhida pelo cliente (MP3 de banco de músicas livres, ex.: Pixabay) substitui a sintetizada
MUSICA = os.environ.get('MUSICA', '')
if MUSICA and os.path.exists(MUSICA):
    bruto = subprocess.run([FF, '-loglevel', 'error', '-i', MUSICA, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    m = np.frombuffer(bruto, '<f4').astype(float)
    m = np.tile(m, int(np.ceil(N / len(m))))[:N]
    musica = m / (np.sqrt((m[: int(SR * 20)] ** 2).mean()) + 1e-9) * 0.30   # bem no fundo: ~0,05 de RMS depois do ganho da mixagem
    print('  trilha:', os.path.basename(MUSICA))

# abaixa o violão quando a voz fala (sidechain suave)
e = lfilter([1 - .998], [1, -.998], np.abs(voz)); mask = (e > .02).astype(float)
jan = np.ones(int(.55 * SR)); mask = np.clip(np.convolve(mask, jan, 'full')[int(.2 * SR): int(.2 * SR) + N], 0, 1)   # começa a abaixar antes da voz, solta devagar
mask = lfilter([1 - .9992], [1, -.9992], mask)
duck = 1 - .5 * mask
fade = np.clip(np.arange(N) / SR / 1.2, 0, 1) * np.clip((DUR - np.arange(N) / SR) / 2.2, 0, 1)
mix = musica * .5 * fade
mix = np.tanh(mix * 1.1) / np.tanh(1.1); mix = mix / np.abs(mix).max() * .93
pcm = (mix[: int(DUR * SR)] * 32767).astype('<i2')
tmp = tempfile.mktemp(suffix='.wav')
with wave.open(tmp, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
subprocess.run([FF, '-y', '-loglevel', 'error', '-i', tmp, '-ac', '2', '-b:a', '192k', saida], check=True)
os.remove(tmp); print('ok', saida, DUR)
