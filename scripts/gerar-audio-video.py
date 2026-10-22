"""Áudio dos vídeos Stories do Império do EPS (base: scripts/gerar-audio-video.py da Pizza em Dobro, mesma voz): reggae-sertanejo bem calmo ao fundo (violão com batida no contratempo, baixo redondo, viola em terças, rim click) + locução suave.
Uso: KOKORO_DIR=/tmp/tts/kokoro-multi-lang-v1_0 python3 scripts/gerar-audio-video.py roteiro.json video/trilha-como-orcar.mp3
  roteiro.json = {"tempos": "tempos-X.json", "cenas": [{"id":..., "fala":..., "min": s, "fim": bool}, ...]}   (gerado por scripts/exportar-roteiro.js)
  Cada cena dura o tempo da fala + folga (nenhuma frase é cortada). Grava também video/tempos-X.json, que o vídeo usa pra montar a linha do tempo.
Precisa de: numpy, scipy, imageio-ffmpeg, sherpa-onnx (pip) e o modelo Kokoro multilíngue (KOKORO_DIR = pasta de
https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_0.tar.bz2). Voz pt-BR masculina "pm_santa" (VOZ_SID=44), a mesma da Pizza em Dobro (conferida na gravação).
ESTILO=animado → locução mais rápida/aguda/brilhante e música a 100 bpm com bumbo (vídeo de produto).
A música é sintetizada (Karplus-Strong), sem direitos autorais; a voz é neural (Kokoro) tratada com EQ leve, compressão e sala curta."""
import sys, os, json, wave, subprocess, tempfile, numpy as np
from scipy.signal import lfilter, fftconvolve
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
SR = 44100
rot = json.load(open(sys.argv[1])); saida = sys.argv[2]
KOKORO = os.environ.get('KOKORO_DIR', '/tmp/tts/kokoro-multi-lang-v1_0')
VOZ_SID = int(os.environ.get('VOZ_SID', '44'))             # 42 = pf_dora (feminina), 43 = pm_alex, 44 = pm_santa (masculinas)
# ESTILO=animado: mesma voz, mais rápida, um tico mais aguda, com mais brilho/punch, e música mais agitada (vídeo de produto)
ANIMADO = os.environ.get('ESTILO', '') == 'animado'
VOZ_VEL = float(os.environ.get('VOZ_VEL', '1.24' if ANIMADO else '1.15'))   # >1 = fala mais rápida (locutor animado)
VOZ_TOM = float(os.environ.get('VOZ_TOM', '1.04' if ANIMADO else '1.0'))    # >1 = voz um pouco mais aguda (mesma duração)
import sherpa_onnx
_tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
    model=f'{KOKORO}/model.onnx', voices=f'{KOKORO}/voices.bin', tokens=f'{KOKORO}/tokens.txt', data_dir=f'{KOKORO}/espeak-ng-data',
    dict_dir=f'{KOKORO}/dict', lexicon=f'{KOKORO}/lexicon-us-en.txt', lang='pt-br'), num_threads=4, provider='cpu')))
# ───────────── locução (primeiro: a duração de cada cena vem da fala) ─────────────
def ler(p):
    w = wave.open(p); d = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768; return d, w.getframerate()
cache = tempfile.mkdtemp()
FILTRO = ('aresample=44100,highpass=f=60,equalizer=f=120:t=q:w=1:g=2.5,equalizer=f=3000:t=q:w=1.5:g=-2.5,equalizer=f=5500:t=q:w=1:g=-3,lowpass=f=9500,'
          'acompressor=threshold=0.14:ratio=2:attack=12:release=200:makeup=2,aecho=0.8:0.35:60:0.10,alimiter=limit=0.9')
if ANIMADO:  # presença na frente (2–4 kHz), compressão mais firme: soa "pra cima" sem gritar
    FILTRO = ('aresample=44100,highpass=f=80,equalizer=f=150:t=q:w=1:g=1.5,equalizer=f=2800:t=q:w=1.2:g=3,equalizer=f=6000:t=q:w=1:g=1,lowpass=f=12000,'
              'acompressor=threshold=0.1:ratio=3.2:attack=6:release=120:makeup=2.6,aecho=0.8:0.3:45:0.07,alimiter=limit=0.93')
if VOZ_TOM != 1.0:
    FILTRO = f'asetrate={int(24000 * VOZ_TOM)},atempo={1 / VOZ_TOM:.5f},' + FILTRO
clipes = []
for i, c in enumerate(rot['cenas']):
    bruto, tratado = f'{cache}/{i}.wav', f'{cache}/{i}t.wav'
    g = _tts.generate(c['fala'], sid=VOZ_SID, speed=VOZ_VEL)
    with wave.open(bruto, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(g.sample_rate); w.writeframes((np.clip(np.array(g.samples), -1, 1) * 32767).astype('<i2').tobytes())
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', bruto, '-af', FILTRO, '-ar', str(SR), tratado], check=True)
    d, _ = ler(tratado); clipes.append(d / (np.abs(d).max() + 1e-9) * .92)
# linha do tempo: cada cena = fala + folga; a fala começa 0,3 s depois da legenda
t = 0.0; tempos = {}; inicios = []
# TEMPOS_FIXOS=arquivo.json: mantém a linha do tempo de um vídeo já renderizado (troca só o áudio, sem renderizar de novo)
FIXOS = json.load(open(os.environ['TEMPOS_FIXOS']))['cenas'] if os.environ.get('TEMPOS_FIXOS') else None
for c, d in zip(rot['cenas'], clipes):
    if FIXOS:
        f = FIXOS[c['id']]; atraso = .8 if c.get('fim') else .2
        tempos[c['id']] = f; inicios.append(f['t0'] + atraso)
        if f['t0'] + atraso + len(d) / SR > f['t1'] + .2: print('  ⚠ fala passa da cena:', c['id'])
        t = f['t1']; continue
    dv = len(d) / SR
    atraso = .8 if c.get('fim') else .2
    fim_cena = t + max(c.get('min') or 0, atraso + dv + (1.3 if c.get('fim') else .45))
    tempos[c['id']] = {'t0': round(t, 2), 't1': round(fim_cena, 2)}; inicios.append(t + atraso)
    print(f"  {c['id']:9s} {t:6.2f} → {fim_cena:6.2f}s  fala {dv:.2f}s  {c['fala'][:55]}")
    t = fim_cena
DUR = round(t, 2)
os.makedirs('video', exist_ok=True)
json.dump({'dur': DUR, 'cenas': tempos}, open(os.path.join(os.path.dirname(os.path.abspath(saida)), rot['tempos']), 'w'), indent=1)
N = int(SR * (DUR + 3))
voz = np.zeros(N)
for ini, d in zip(inicios, clipes):
    i0 = int(ini * SR); voz[i0:i0 + len(d)] += d[: N - i0]
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
BPM = 100 if ANIMADO else 72; BEAT = 60 / BPM; BAR = BEAT * 4
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
    if ANIMADO:  # bumbo no 1 e no 3: dá o pulso de vídeo de produto
        for k in (0, 2):
            i = int((t0 + k * BEAT) * SR); tt = np.arange(int(.25 * SR)) / SR
            if i + len(tt) < N: perc[i:i + len(tt)] += np.sin(2 * np.pi * (55 + 90 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 14) * 1.1
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
MUSICA = os.environ.get('MUSICA', '')   # sem trilha escolhida: usa a música sintetizada (sem direitos autorais)
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
duck = 1 - (.42 if ANIMADO else .5) * mask
fade = np.clip(np.arange(N) / SR / 1.2, 0, 1) * np.clip((DUR - np.arange(N) / SR) / 2.2, 0, 1)
mix = musica * (.22 if ANIMADO else .17) * duck * fade + voz * .95
mix = np.tanh(mix * 1.1) / np.tanh(1.1); mix = mix / np.abs(mix).max() * .93
pcm = (mix[: int(DUR * SR)] * 32767).astype('<i2')
tmp = tempfile.mktemp(suffix='.wav')
with wave.open(tmp, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
subprocess.run([FF, '-y', '-loglevel', 'error', '-i', tmp, '-ac', '2', '-b:a', '192k', saida], check=True)
os.remove(tmp); print('ok', saida, DUR)
