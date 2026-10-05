import sys, soundfile as sf
from kokoro_onnx import Kokoro
k=Kokoro("kokoro.onnx","voices.bin")
lines=["This is a real science lab.","And it lives in your browser.","Turn the tap. Watch for the pink.","Read the scale yourself.","Doctor Curie guides every step.","Nine practicals. Real marks.","Lab Bridge."]
import numpy as np
for v in sys.argv[1:]:
  out=[]
  for i,l in enumerate(lines):
    a,sr=k.create(l,voice=v,speed=1.0,lang="en-us"); sf.write(f"{v}_{i}.wav",a,sr); out+= [a,np.zeros(int(sr*.35),dtype=a.dtype)]
    print(v,i,round(len(a)/sr,2))
  sf.write(f"{v}_full.wav",np.concatenate(out),sr)
