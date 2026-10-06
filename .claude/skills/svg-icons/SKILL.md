---
name: svg-icons
description: Draw and choose icons for LabBridge (action buttons, HUD, panels). Use whenever adding or changing an icon, a button glyph or any inline SVG in the UI, or when someone says the icons look cheap, generic or inconsistent.
---

# LabBridge icons

The UI is white glass over a 3D lab, so icons are **white line icons** that must read at
20–28 px on a busy, light or dark background.

## 1. Source

1. Use **lucide-react** (already a dependency) when it has the exact object: `FlaskConical`,
   `TestTube`, `Pipette`, `Droplet`, `Droplets`, `Funnel`, `Eye`, `Microscope`, `ClipboardList`,
   `Flame`, `Timer`, `Scale`, `Zap`, `RotateCw`…
2. When it doesn't (a burette, a stopcock, a meniscus, a white tile, a bubble in a jet), draw it
   in `components/icons/LabIcons.tsx` following §2, so it can't be told apart from Lucide.
3. Never mix in emoji, filled icon sets or another library's style.

## 2. Drawing rules (match Lucide exactly)

- `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeLinecap="round"`,
  `strokeLinejoin="round"`. Stroke width: 1.75 on glass buttons (2 in small HUD chips).
- Keep 2 px of padding: the live area is 2..22. Snap coordinates to 0.5.
- Fewer than ~6 strokes; one idea per icon. Name the *object*, then add at most one *action
  hint* (a drop under a jet = "drip", an arrow = "fill").
- Circles and arcs over polylines; equal stroke weight everywhere; no tiny details under 1.5 px.
- Glassware: draw the silhouette, then one liquid line inside (it reads as "glass" instantly).
- Test every new icon at 20 px on white and on #1e293b before shipping.

## 3. On buttons

- The icon is white with `drop-shadow(0 1px 2px rgba(0,0,0,.4))` so it reads on a white wall.
- Hover: icon scales 1.1 and tilts −6°. Active: no tilt.
- Give the button an `aria-label`; the icon itself is `aria-hidden`.
