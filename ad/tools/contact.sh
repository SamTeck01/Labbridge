#!/bin/bash
# usage: tools/contact.sh <Comp> <tag>
cd "$(dirname "$0")/.." && mkdir -p out/stills
for s in 1.6 4.2 5.9 6.9 8.9 10.9 11.9 13.9 16.2 18.6; do f=$(python3 -c "print(round($s*60))"); npx remotion still $1 out/stills/$2_$s.jpg --frame=$f --log=error >/dev/null 2>&1 & done; wait
python3 - "$2" <<'P'
import sys,glob;from PIL import Image
fs=sorted(glob.glob(f'out/stills/{sys.argv[1]}_*.jpg'),key=lambda f:float(f.split('_')[-1][:-4]))
a=Image.open(fs[0]);w,h=(480,270) if a.width>a.height else (216,384)
s=Image.new('RGB',(w*5,h*2))
for i,f in enumerate(fs): s.paste(Image.open(f).resize((w,h)),((i%5)*w,(i//5)*h))
s.save(f'out/contact_{sys.argv[1]}.jpg',quality=88)
P
