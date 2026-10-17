import type { SkinTheme } from '@/types/l2';

type Color = { r: number; g: number; b: number; a: number };
const white: Color = { r: 255, g: 255, b: 255, a: 1 };
const black: Color = { r: 0, g: 0, b: 0, a: 1 };

/** Only literal CSS colors are accepted; functions, variables and URLs are not. */
export function parseSkinColor(value: unknown): Color | null {
  if (typeof value !== 'string') return null;
  const color = value.trim();
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color);
  if (hex) {
    const expanded = hex[1].length < 5 ? [...hex[1]].map(character => character + character).join('') : hex[1];
    return { r: parseInt(expanded.slice(0, 2), 16), g: parseInt(expanded.slice(2, 4), 16), b: parseInt(expanded.slice(4, 6), 16), a: expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1 };
  }
  const rgb = /^(rgb|rgba)\(([^()]*)\)$/i.exec(color);
  if (!rgb) return null;
  const parts = rgb[2].split(',').map(part => part.trim());
  if (parts.length !== (rgb[1].toLowerCase() === 'rgba' ? 4 : 3)) return null;
  const channels = parts.slice(0, 3).map(part => {
    if (!/^(?:\d+(?:\.\d+)?|\.\d+)%?$/.test(part)) return NaN;
    const number = parseFloat(part);
    return part.endsWith('%') ? number <= 100 ? number * 2.55 : NaN : number;
  });
  const alpha = parts[3] === undefined ? 1 : /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(parts[3]) ? Number(parts[3]) : NaN;
  if (channels.some(channel => !Number.isFinite(channel) || channel < 0 || channel > 255) || !Number.isFinite(alpha) || alpha < 0 || alpha > 1) return null;
  return { r: channels[0], g: channels[1], b: channels[2], a: alpha };
}

function composite(color: Color, background: Color): Color {
  return { r: color.r * color.a + background.r * (1 - color.a), g: color.g * color.a + background.g * (1 - color.a), b: color.b * color.a + background.b * (1 - color.a), a: 1 };
}
function hex(color: Color): string {
  return `#${[color.r, color.g, color.b].map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
function luminance(color: Color): number {
  const [r, g, b] = [color.r, color.g, color.b].map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}
export function skinContrast(foreground: string, background: string): number {
  const bg = composite(parseSkinColor(background) || white, white);
  const fg = composite(parseSkinColor(foreground) || black, bg);
  const first = luminance(fg);
  const second = luminance(bg);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
function mix(first: Color, second: Color, amount: number): Color {
  return { r: first.r + (second.r - first.r) * amount, g: first.g + (second.g - first.g) * amount, b: first.b + (second.b - first.b) * amount, a: 1 };
}
function readable(color: Color, background: Color): Color {
  const original = composite(color, background);
  if (skinContrast(hex(original), hex(background)) >= 4.5) return original;
  const target = skinContrast('#000000', hex(background)) > skinContrast('#FFFFFF', hex(background)) ? black : white;
  // A small bounded search preserves hue as far as possible while fixing ink.
  for (let step = 1; step <= 100; step++) {
    const candidate = mix(original, target, step / 100);
    if (skinContrast(hex(candidate), hex(background)) >= 4.5) return candidate;
  }
  return target;
}

/** Applies the same readable color contract to AI and procedural palettes. */
export function normalizeSkinTheme(input: Partial<SkinTheme>): SkinTheme {
  const bg = composite(parseSkinColor(input.bg) || { r: 245, g: 242, b: 235, a: 1 }, white);
  const text = readable(parseSkinColor(input.text) || black, bg);
  const sub = readable(parseSkinColor(input.sub) || text, bg);
  let accent = readable(parseSkinColor(input.accent) || { r: 194, g: 70, b: 37, a: 1 }, bg);
  // CardStage chooses #111114 above this luminance and white below it.
  const accentInk = luminance(parseSkinColor(hex(accent))!) > 0.179 ? '#111114' : '#FFFFFF';
  if (skinContrast(accentInk, hex(accent)) < 4.5) accent = readable(accent, parseSkinColor(accentInk)!);
  if (skinContrast(hex(accent), hex(bg)) < 4.5) accent = luminance(bg) > 0.179 ? black : white;
  const headerBg = composite(parseSkinColor(input.headerBg) || accent, bg);
  const headerText = readable(parseSkinColor(input.headerText) || text, headerBg);
  let chip = composite(parseSkinColor(input.chipBg) || { ...text, a: 0.06 }, bg);
  if (skinContrast(hex(text), hex(chip)) < 4.5 || skinContrast(hex(sub), hex(chip)) < 4.5) chip = bg;
  const border = composite(parseSkinColor(input.border) || { ...text, a: 0.2 }, bg);
  return {
    id: typeof input.id === 'string' ? input.id : `skin_${Date.now()}`,
    name: typeof input.name === 'string' ? input.name.replace(/[\u0000-\u001f]/g, '').slice(0, 32) : 'STUDIO MOOD',
    bg: hex(bg), text: hex(text), sub: hex(sub), border: hex(border), accent: hex(accent),
    headerBg: hex(headerBg), headerText: hex(headerText), chipBg: hex(chip),
  };
}
