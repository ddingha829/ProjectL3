import { NextRequest, NextResponse } from 'next/server';
import { readDeviceId, writeDeviceId } from '@/lib/session';
import { AI_DAILY_LIMIT, getStore, newId } from '@/lib/store';
import { callGemini } from '@/lib/gemini';
import { SkinTheme } from '@/types/l2';
import { normalizeSkinTheme } from '@/lib/skinValidation';

const EDITORIAL_MOOD_PRESETS: Array<{
  keywords: string[];
  defaultName: string;
  theme: Omit<SkinTheme, 'id' | 'name'>;
}> = [
  {
    keywords: ['amber', 'jazz', '우드', '와인', '위스키', '가을', '노을', '재즈', '호박', '황금', 'gold'],
    defaultName: 'TOKYO JAZZ AMBER',
    theme: {
      bg: '#1C140D',
      headerBg: '#D97706',
      headerText: '#1C140D',
      text: '#FDE68A',
      sub: '#B48E65',
      border: '#3E2B1D',
      accent: '#F59E0B',
      chipBg: '#271C13',
    },
  },
  {
    keywords: ['neon', '홍콩', '왕가위', 'cyber', '사이버', '네온', '밤', '나이트', '클럽', '마젠타'],
    defaultName: 'HONGKONG NEON',
    theme: {
      bg: '#140B24',
      headerBg: '#EC4899',
      headerText: '#FFFFFF',
      text: '#FDF2F8',
      sub: 'rgba(253,242,248,0.65)',
      border: 'rgba(236,72,153,0.32)',
      accent: '#F43F5E',
      chipBg: 'rgba(236,72,153,0.14)',
    },
  },
  {
    keywords: ['ocean', '바다', '여수', 'blue', '블루', '파랑', '코발트', '시원', '여름', '해변', '포카리', '수영'],
    defaultName: 'LISBON COBALT SEA',
    theme: {
      bg: '#071923',
      headerBg: '#06B6D4',
      headerText: '#071923',
      text: '#ECFEFF',
      sub: 'rgba(236,254,255,0.62)',
      border: 'rgba(6,182,212,0.28)',
      accent: '#22D3EE',
      chipBg: 'rgba(6,182,212,0.14)',
    },
  },
  {
    keywords: ['kinfolk', '킨포크', 'paper', '베이지', '크림', '미니멀', '화이트', '종이', '린넨', '따뜻', '감성'],
    defaultName: 'KINFOLK LINEN',
    theme: {
      bg: '#EFECE6',
      headerBg: '#2C2824',
      headerText: '#EFECE6',
      text: '#1F1C19',
      sub: '#6B645C',
      border: '#D6CFC4',
      accent: '#C2593F',
      chipBg: '#E4DFD6',
    },
  },
  {
    keywords: ['green', '그린', '초록', '숲', '자연', '녹차', '말차', '세이지', '모스', '가든', '식물', '제주'],
    defaultName: 'KYOTO MATCHA MOSS',
    theme: {
      bg: '#0D1F16',
      headerBg: '#10B981',
      headerText: '#06130D',
      text: '#ECFDF5',
      sub: '#86EFAC',
      border: '#1E3F2E',
      accent: '#34D399',
      chipBg: '#132C20',
    },
  },
  {
    keywords: ['pink', '핑크', '로즈', '장미', '벚꽃', '봄', '러블리', '코랄', '피치', '복숭아', '분홍', '와인바'],
    defaultName: 'PARIS VELVET ROSE',
    theme: {
      bg: '#230C16',
      headerBg: '#FB7185',
      headerText: '#230C16',
      text: '#FFF1F2',
      sub: '#FDA4AF',
      border: '#4C1D30',
      accent: '#F43F5E',
      chipBg: '#331220',
    },
  },
  {
    keywords: ['red', '레드', '빨강', '강렬', '크림슨', '다홍', '버건디', '매운', '열정', '오페라', '극장'],
    defaultName: 'CRIMSON OPERA',
    theme: {
      bg: '#1F0808',
      headerBg: '#EF4444',
      headerText: '#FFFFFF',
      text: '#FEF2F2',
      sub: '#FCA5A5',
      border: '#451212',
      accent: '#F87171',
      chipBg: '#2E0C0C',
    },
  },
  {
    keywords: ['acid', 'lime', '라임', '형광', '테크', '베를린', '힙', '스트릿', '일렉', '애시드', '형광초록'],
    defaultName: 'BERLIN ACID TECH',
    theme: {
      bg: '#0E120A',
      headerBg: '#A3E635',
      headerText: '#0E120A',
      text: '#F7FEE7',
      sub: '#BEF264',
      border: '#283518',
      accent: '#84CC16',
      chipBg: '#182010',
    },
  },
  {
    keywords: ['mono', 'black', '모노', '블랙', '흑백', '무채색', '실버', '스틸', '콘크리트', '브루탈', '시크', '도시'],
    defaultName: 'BRUTAL CONCRETE',
    theme: {
      bg: '#121316',
      headerBg: '#E4E4E7',
      headerText: '#09090B',
      text: '#FAFAFA',
      sub: '#A1A1AA',
      border: '#27272A',
      accent: '#F4F4F5',
      chipBg: '#1C1D22',
    },
  },
  {
    keywords: ['ice', 'winter', '겨울', '얼음', '눈', '북유럽', '차분', '새벽', '안개', '하늘', '스카이', '민트'],
    defaultName: 'NORDIC FJORD ICE',
    theme: {
      bg: '#EAF2F8',
      headerBg: '#0F172A',
      headerText: '#F8FAFC',
      text: '#0F172A',
      sub: '#475569',
      border: '#CBD5E1',
      accent: '#0284C7',
      chipBg: '#DCE8F2',
    },
  },
  {
    keywords: ['brown', 'coffee', '브라운', '커피', '카페', '에스프레소', '초콜릿', '빈티지', '필름', '레트로', '고전'],
    defaultName: 'VINTAGE ESPRESSO',
    theme: {
      bg: '#1A1412',
      headerBg: '#C28E5C',
      headerText: '#1A1412',
      text: '#F5EBE6',
      sub: '#B89F91',
      border: '#382B26',
      accent: '#E0A96D',
      chipBg: '#261D1A',
    },
  },
  {
    keywords: ['purple', '보라', '퍼플', '라벤더', '바이올렛', '몽환', '드림', '우주', '갤럭시', '신비'],
    defaultName: 'COSMIC VIOLET',
    theme: {
      bg: '#150F24',
      headerBg: '#8B5CF6',
      headerText: '#FFFFFF',
      text: '#F5F3FF',
      sub: '#C4B5FD',
      border: '#2E214D',
      accent: '#A78BFA',
      chipBg: '#201736',
    },
  },
  {
    keywords: ['terracotta', '테라코타', '사막', '모로코', '황토', '오렌지', '주황', '선셋', '석양', '벽돌'],
    defaultName: 'MILAN TERRA ROSSA',
    theme: {
      bg: '#21110B',
      headerBg: '#EA580C',
      headerText: '#FFF7ED',
      text: '#FFEDD5',
      sub: '#FDBA74',
      border: '#432215',
      accent: '#FB923C',
      chipBg: '#2F1810',
    },
  },
];

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

let rotationCounter = 0;

function buildSemanticMoodSkin(prompt: string): SkinTheme {
  const p = prompt.toLowerCase().trim();
  const id = `ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const cleanName = prompt.trim().toUpperCase().slice(0, 18);

  // 1. Check rich Korean/English mood keyword dictionary
  if (p) {
    for (const preset of EDITORIAL_MOOD_PRESETS) {
      if (preset.keywords.some((kw) => p.includes(kw))) {
        return {
          id,
          name: cleanName || preset.defaultName,
          ...preset.theme,
        };
      }
    }
  }

  // 2. Procedural HSL Editorial Color Harmony Generator
  // Combines prompt hash + rotation counter so every click or custom word produces a distinct palette
  rotationCounter = (rotationCounter + 1) % 12;
  let hash = rotationCounter * 137;
  for (let i = 0; i < p.length; i++) {
    hash = (hash * 31 + p.charCodeAt(i)) % 3600;
  }

  const hue = Math.abs(hash + Math.floor(Date.now() / 1000) * 47) % 360;
  const isLightMode = rotationCounter % 4 === 3;

  if (isLightMode) {
    const bg = hslToHex(hue, 28, 93);
    const headerBg = hslToHex((hue + 180) % 360, 45, 16);
    const accent = hslToHex(hue, 78, 45);
    return {
      id,
      name: cleanName || `STUDIO MOOD #${rotationCounter + 1}`,
      bg,
      headerBg,
      headerText: bg,
      text: hslToHex(hue, 35, 11),
      sub: hslToHex(hue, 18, 38),
      border: hslToHex(hue, 22, 80),
      accent,
      chipBg: hslToHex(hue, 24, 87),
    };
  }

  const bg = hslToHex(hue, 42, 9);
  const headerBg = hslToHex(hue, 82, 54);
  const accent = hslToHex((hue + 25) % 360, 90, 62);
  return {
    id,
    name: cleanName || `STUDIO MOOD #${rotationCounter + 1}`,
    bg,
    headerBg,
    headerText: '#0B0B0E',
    text: hslToHex(hue, 60, 95),
    sub: hslToHex(hue, 30, 70),
    border: hslToHex(hue, 40, 22),
    accent,
    chipBg: hslToHex(hue, 38, 15),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { prompt = '' } = (await req.json()) as {
      prompt?: string;
    };

    let deviceId = await readDeviceId();
    if (!deviceId) {
      deviceId = newId();
      await writeDeviceId(deviceId);
    }

    const store = getStore();
    const currentUsage = await store.getUsage(deviceId, 'ai');
    const isLimitReached = currentUsage >= AI_DAILY_LIMIT;

    if (!isLimitReached && prompt.trim()) {
      try {
        const geminiRes = await callGemini({
          contents: [
            {
              parts: [
                {
                  text: `Create a high-contrast editorial magazine card color palette JSON for the mood: "${prompt}".
Return ONLY a JSON object with keys:
"name" (uppercase max 16 chars),
"bg" (hex),
"headerBg" (hex),
"headerText" (hex),
"text" (hex with high contrast against bg),
"sub" (hex or rgba),
"border" (hex or rgba),
"accent" (vibrant hex),
"chipBg" (subtle hex or rgba).`,
                },
              ],
            },
          ],
          responseMimeType: 'application/json',
        });

        if (geminiRes) {
          const parsed = JSON.parse(geminiRes.text);
          if (parsed.bg && parsed.text && parsed.accent) {
            const skin = normalizeSkinTheme({
              id: `ai_${Date.now()}`,
              name: (parsed.name || prompt).toUpperCase().slice(0, 18),
              bg: parsed.bg,
              headerBg: parsed.headerBg || parsed.accent,
              headerText: parsed.headerText || '#FFFFFF',
              text: parsed.text,
              sub: parsed.sub || parsed.text,
              border: parsed.border || parsed.accent,
              accent: parsed.accent,
              chipBg: parsed.chipBg || 'rgba(255,255,255,0.08)',
            });
            const nextUsage = await store.bumpUsage(deviceId, 'ai');
            await store.savePrefs(deviceId, { skins: { [skin.id]: skin } });
            return NextResponse.json({
              skin,
              provider: 'GEMINI',
              model: geminiRes.model,
              limitReached: false,
              usage: { used: nextUsage, limit: AI_DAILY_LIMIT },
            });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini skin generation error:', geminiErr);
        // Fallback to semantic + procedural mood engine
      }
    }

    // Fallback: Semantic & Procedural Color Harmony Engine
    const skin = normalizeSkinTheme(buildSemanticMoodSkin(prompt));
    await store.savePrefs(deviceId, { skins: { [skin.id]: skin } });
    return NextResponse.json({
      skin,
      provider: 'SEMANTIC_ENGINE',
      limitReached: isLimitReached,
      usage: { used: currentUsage, limit: AI_DAILY_LIMIT },
      notice: isLimitReached
        ? '오늘 앱 AI 사용 한도(30회)에 도달하여 정교한 감성 절차적 하모니 엔진으로 생성되었습니다.'
        : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to generate AI skin', detail: String(err) },
      { status: 400 }
    );
  }
}
