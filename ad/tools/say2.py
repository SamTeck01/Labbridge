import sys, soundfile as sf, numpy as np
from kokoro_onnx import Kokoro
k=Kokoro("kokoro.onnx","voices.bin")
lines=["Science is meant to be done. Not just read about.",
"LabBridge is a real science lab, right in your browser.",
"In biology, focus a microscope on living cells.",
"In physics, build a circuit and test Ohm's law.",
"Time a pendulum, and measure gravity yourself.",
"In chemistry, turn the tap and titrate to the first pink.",
"Run flame tests, race a disappearing cross, and watch inks separate.",
"Doctor Curie, your lab manager, guides you through every step.",
"Nine real practicals. Marked like the real exam.",
"Lab Bridge. Practical science, anywhere."]
out=sys.argv[1]
for v in sys.argv[2:]:
  import os; os.makedirs(f"{out}/{v}",exist_ok=True)
  for i,l in enumerate(lines):
    a,sr=k.create(l,voice=v,speed=1.0,lang="en-us"); sf.write(f"{out}/{v}/{i}.wav",a,sr); print(v,i,round(len(a)/sr,2))
