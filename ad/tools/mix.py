"""Music + SFX made in code, VO from Kokoro. Writes public/mix.wav (mastered -14 LUFS / -1 dBTP)."""
import json, sys, subprocess, numpy as np, soundfile as sf
SR=48000; T=json.load(open('src/timeline.json')); N=int(T['total']*SR)+SR
voice=sys.argv[1] if len(sys.argv)>1 else T['voice']
rng=np.random.default_rng(7); t=np.arange(N)/SR
def env(n,a,d): x=np.arange(n)/SR; return np.minimum(1,x/max(a,1e-4))*np.exp(-x/d)
def lp(x,a): # one-pole lowpass
  y=np.empty_like(x); s=0.; a=np.broadcast_to(a,x.shape)
  for i in range(len(x)): s+=a[i]*(x[i]-s); y[i]=s
  return y
def put(buf,x,at,g=1.):
  i=int(at*SR); j=min(len(buf),i+len(x)); buf[i:j]+=x[:j-i]*g
# --- music: 100 BPM, Dm - Bb - F - C, resolves to F on the logo
bpm=100; beat=60/bpm; mus=np.zeros(N)
f=lambda m: 440*2**((m-69)/12)
prog=[[50,57,62,65],[46,53,58,62],[53,60,65,69],[48,55,60,64]]
for bar in range(8):
  ch=prog[bar%4] if bar<6 else prog[2]
  st=bar*4*beat
  # pad
  n=int(4*beat*SR)+SR; x=np.arange(n)/SR; e=np.minimum(1,x/0.6)*np.exp(-x/3.5)
  pad=sum(np.sin(2*np.pi*f(m)*x*(1+d))*0.05 for m in ch for d in (-0.002,0.002))
  put(mus,pad*e,st)
  # felt piano ostinato (8ths)
  for k in range(8):
    m=ch[[0,2,1,3,2,1,3,2][k]]+12; n=int(1.2*SR); x=np.arange(n)/SR
    p=(np.sin(2*np.pi*f(m)*x)+0.3*np.sin(4*np.pi*f(m)*x))*env(n,0.004,0.35)*0.07
    put(mus,p,st+k*beat/2)
  # sub pulse on beats
  for k in range(4):
    n=int(0.5*SR); x=np.arange(n)/SR
    put(mus,np.sin(2*np.pi*f(ch[0]-12)*x)*env(n,0.01,0.18)*0.18,st+k*beat)
# last chord rings to the end
st=T['scenes'][-1]-0.2; n=N-int(st*SR); x=np.arange(n)/SR
put(mus,sum(np.sin(2*np.pi*f(m)*x)*0.06 for m in [53,60,65,69,72])*np.minimum(1,x/0.05)*np.exp(-x/2.2),st)
mus[:int(0.6*SR)]*=np.linspace(0,1,int(0.6*SR))
# --- VO
vo=np.zeros(N)
for i,l in enumerate(T['vo']):
  a,sr=sf.read(f'tools/vo/{voice}/{voice}_{i}.wav'); assert sr==24000
  a=np.interp(np.arange(int(len(a)*2))/2,np.arange(len(a)),a)  # 24k -> 48k
  put(vo,a,l['t'])
# duck music >=15 dB under VO
act=lp((np.abs(vo)>0.01).astype(float),0.0015); act=np.clip(act*4,0,1)
mus*=10**(-17*act/20)
# --- SFX (synthesized)
sfx=np.zeros(N)
def whoosh(dur=0.45):
  n=int(dur*SR); x=np.linspace(0,1,n); w=rng.standard_normal(n)
  y=lp(w,0.02+0.25*x**2)*np.sin(np.pi*x)**2; return y/np.abs(y).max()
def hit():
  n=int(0.6*SR); x=np.arange(n)/SR
  return (np.sin(2*np.pi*(48+80*np.exp(-x*30))*x)*env(n,0.002,0.18)+lp(rng.standard_normal(n),0.3)*env(n,0.001,0.02)*0.5)
def tick():
  n=int(0.05*SR); x=np.arange(n)/SR; return np.sin(2*np.pi*2400*x)*env(n,0.0005,0.008)
for h in T['hits']:
  put(sfx,whoosh(),h-0.42,0.22); put(sfx,hit(),h,0.35)
for k in T['ticks']: put(sfx,tick(),k,0.12)
# drips + riser into pink
for d in [5.6,5.9,6.15]:
  n=int(0.12*SR); x=np.arange(n)/SR; put(sfx,np.sin(2*np.pi*(900+1400*x/0.12)*x)*env(n,0.001,0.03),d,0.18)
n=int(1.1*SR); x=np.linspace(0,1,n); put(sfx,lp(rng.standard_normal(n),0.05+0.3*x)*x**2,6.25-1.1,0.12)
# logo shimmer
n=int(2*SR); x=np.arange(n)/SR; put(sfx,sum(np.sin(2*np.pi*fr*x) for fr in (2093,2637,3136))*env(n,0.02,0.6)*0.04,15.0)
sfx*=10**(-6*act/20)  # keep SFX out of the words' way
mix=mus+sfx+vo*1.0
sf.write('/tmp/premix.wav',np.stack([mix,mix],1)/np.abs(mix).max()*0.7,SR,subtype='FLOAT')
for name,x in (('vo',vo),('music',mus),('sfx',sfx)): sf.write(f'out/stem_{name}.wav',x.astype(np.float32),SR)
FF='/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2'
subprocess.run([FF,'-y','-loglevel','error','-i','/tmp/premix.wav','-af','loudnorm=I=-14:TP=-1:LRA=11','-ar','48000','public/mix.wav'],check=True)
print(subprocess.run([FF,'-i','public/mix.wav','-af','loudnorm=print_format=summary','-f','null','-'],capture_output=True,text=True).stderr.split('Input Integrated')[1][:120])
