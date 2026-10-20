/** A local suggestion from spoken words, never an AI request or automatic overwrite. */
export function voiceTitleCandidate(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentence = clean.split(/(?<=[.!?。！？])\s|[\n\r]/u)[0].replace(/[.!?。！？]+$/u, '').trim();
  if (Array.from(sentence).length <= 28) return sentence;
  const slice = Array.from(sentence).slice(0, 28).join('');
  const boundary = slice.lastIndexOf(' ');
  return (boundary >= 16 ? slice.slice(0, boundary) : slice).trim() + '…';
}
