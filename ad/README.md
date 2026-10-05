# LabBridge ad (Remotion)

An ~18 s ad with an end card, at 60 fps, in 16:9 and 9:16. Everything is made in code:
- **Picture:** Remotion (`src/Ad.tsx`). The timings live in `src/timeline.json`.
- **Voice:** [Kokoro](https://github.com/thewh1teagle/kokoro-onnx), a free, open-source text-to-speech model that runs locally. Three takes are in `tools/vo/` (`af_heart` is the default; `af_bella` and `am_michael` are the alternatives).
- **Music and sound effects:** generated in `tools/mix.py`. The music is ducked at least 15 dB under the voice, and the mix is mastered to -14 LUFS / -1 dBTP.
- **Screens:** real LabBridge captures in `public/`.

```bash
npm i
python3 tools/mix.py [af_heart|af_bella|am_michael]   # rebuild audio -> public/mix.wav
npm run studio                                         # live preview / tweak in the browser
npm run render                                         # out/labbridge-ad-16x9.mp4 + 9x16
```

To change a line, edit it in `tools/say.py`, re-run that script, then run `mix.py` and adjust the times in `timeline.json`.
