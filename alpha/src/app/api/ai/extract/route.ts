import { NextRequest, NextResponse } from 'next/server';
import { readDeviceId, writeDeviceId } from '@/lib/session';
import { AI_DAILY_LIMIT, getStore, newId } from '@/lib/store';
import { callGemini } from '@/lib/gemini';
import {
  extractBadFromText,
  extractGoodFromText,
  extractNoteFromText,
} from '@/data/initialData';

export async function POST(req: NextRequest) {
  try {
    const { title = '기록', quote = '', loc = 'SEOUL' } = (await req.json()) as {
      title?: string;
      quote?: string;
      loc?: string;
    };

    let deviceId = await readDeviceId();
    if (!deviceId) {
      deviceId = newId();
      await writeDeviceId(deviceId);
    }

    const store = getStore();
    const currentUsage = await store.getUsage(deviceId, 'ai');
    const isLimitReached = currentUsage >= AI_DAILY_LIMIT;

    if (!isLimitReached && quote.trim()) {
      try {
        const geminiRes = await callGemini({
          contents: [
            {
              parts: [
                {
                  text: `다음 사용자 경험 메모에서 카드 명함에 들어갈 3가지 한 줄 요약(각 35자 이내 한국어 명사구)을 JSON으로만 추출해줘. 키는 "good"(장점/매력 포인트), "bad"(아쉬운 점/웨이팅 등, 없으면 빈 문자열), "note"(방문 팁/특이사항).
제목: ${title}
장소/구분: ${loc}
본문 메모: ${quote}`,
                },
              ],
            },
          ],
          responseMimeType: 'application/json',
        });

        if (geminiRes) {
          const parsed = JSON.parse(geminiRes.text);
          if (parsed.good || parsed.note) {
            const nextUsage = await store.bumpUsage(deviceId, 'ai');
            return NextResponse.json({
              good: parsed.good || extractGoodFromText(quote, title),
              bad: parsed.bad || '',
              note: parsed.note || extractNoteFromText(quote, loc),
              provider: 'GEMINI',
              model: geminiRes.model,
              limitReached: false,
              usage: { used: nextUsage, limit: AI_DAILY_LIMIT },
            });
          }
        }
      } catch {
        // Fallback to local Korean NLP extractor
      }
    }

    // Local Korean NLP Fallback
    return NextResponse.json({
      good: extractGoodFromText(quote, title),
      bad: extractBadFromText(quote),
      note: extractNoteFromText(quote, loc),
      provider: 'LOCAL_NLP',
      limitReached: isLimitReached,
      usage: { used: currentUsage, limit: AI_DAILY_LIMIT },
      notice: isLimitReached
        ? `오늘 앱 AI 사용 한도(${AI_DAILY_LIMIT}회)에 도달하여 로컬 문맥 분석 엔진으로 요약되었습니다.`
        : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to extract memo insights', detail: String(err) },
      { status: 400 }
    );
  }
}
