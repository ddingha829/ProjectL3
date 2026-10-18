import type { ReactNode } from 'react';
import type { ArchiveItem, CardLayoutType, PresetSlot } from '@/types/l2';
import styles from './AdditionalCardLayouts.module.css';

type AdditionalLayout = Extract<CardLayoutType, 'doodle' | 'feed' | 'photocard' | 'day' | 'paint' | 'arch' | 'orbit' | 'duo' | 'margin'>;
interface Props {
  layout: AdditionalLayout;
  item: ArchiveItem;
  slot: PresetSlot;
  author: string;
  footer: ReactNode;
  photo: (height: number | string, fullBleed?: boolean) => ReactNode;
}

/** Integer pixels, including diagonal stair-steps, survive SVG-to-JPEG capture. */
function pixelLines(lines: number[][][]) {
  const pixels = new Set<string>();
  for (const points of lines) for (let i = 1; i < points.length; i++) {
    let [x, y] = points[i - 1];
    const [endX, endY] = points[i];
    const dx = Math.abs(endX - x), dy = -Math.abs(endY - y), sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1;
    let error = dx + dy;
    while (true) {
      pixels.add(`${x},${y}`);
      if (x === endX && y === endY) break;
      const twice = 2 * error;
      if (twice >= dy) { error += dy; x += sx; }
      if (twice <= dx) { error += dx; y += sy; }
    }
  }
  return [...pixels].map(pixel => `M${pixel.replace(',', ' ')}h1v1h-1z`).join('');
}

const badDrawingPixels = pixelLines([
  [[70,24],[68,8],[77,16],[87,12],[94,1],[99,20],[103,27],[101,40],[111,46],[113,59],[108,66],[101,65],[100,70],[94,69],[91,60],[85,68],[80,66],[81,57],[73,51],[71,41],[66,35],[70,24]],
  [[110,54],[120,51],[124,42],[120,39],[118,43],[121,45]],
  [[84,33],[87,35],[84,39],[80,37]], [[68,31],[60,29]], [[70,36],[60,39]], [[102,30],[113,27]], [[103,36],[113,39]],
  [[15,43],[17,62],[38,64],[42,42],[15,43]], [[42,48],[50,47],[51,55],[40,58]],
  [[23,35],[20,29],[25,24],[23,17]], [[34,36],[37,29],[34,25]],
  [[9,10],[13,15],[21,14],[16,19],[17,27],[11,22],[5,24],[8,17],[6,12],[9,10]],
]);

/** Deterministic pixel art: no external request or canvas paint race during export. */
function BadDrawing() {
  return <svg viewBox="0 0 128 76" aria-hidden="true" className={styles.badDrawing} shapeRendering="crispEdges" fill="currentColor">
    <path d={badDrawingPixels}/><path d="M76 25h2v3h-2zM94 23h3v2h-3z"/>
    <path d="M3 71h53v1H3zM62 73h11v1H62zM112 71h14v1h-14z" fill="var(--card-accent)"/>
  </svg>;
}

function Scribble() {
  return <svg viewBox="0 0 180 80" className={styles.scribble} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m92 5 10 23 26-5-17 21 15 23-27-9-20 17 3-27-23-15 28-4 5-24ZM16 52l13-7m111-26 15-9m-2 46 16 7"/></svg>;
}

export default function AdditionalCardLayouts({ layout, item, slot, author, photo, footer }: Props) {
  const decorations = slot.showDecorations !== false;
  const score = slot.showScore !== false && item.score !== '' && Number.isFinite(Number(item.score));
  const location = slot.showLocation !== false && (item.fullAddress || item.addressShort || item.loc);
  const number = slot.showNumber !== false ? String(item.num || '1').padStart(2, '0') : null;
  const compact = slot.ratio === '1:1';
  // Use the record's date, never today's date or timezone-dependent parsing.
  const dateParts = item.date.match(/^(?:\d{2}|\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  const month = dateParts?.[1]?.padStart(2, '0');
  const day = dateParts?.[2]?.padStart(2, '0');
  const titleLength = Array.from(item.title).length;
  const title = <h3 className={styles.title} data-title-length={titleLength > 32 ? 'long' : titleLength > 18 ? 'medium' : 'short'}>{item.title}</h3>;
  const place = location ? <p className={styles.location}>{location}</p> : null;
  const quote = item.quote.trim() ? <p className={styles.quote}>{item.quote}</p> : null;
  const rating = score ? <span className={styles.score} aria-label={`평점 ${item.score}`}>{item.score}<small>/ 5</small></span> : null;
  const badge = number ? <span className={styles.number} data-card-number="true">{number}</span> : null;
  const decor = (text: string) => decorations ? <span className={styles.eyebrow} data-card-decoration="true">{text}</span> : null;
  const header = (text: string) => (decorations || number || score) ? <div className={styles.header}><div className={styles.headerLabel}>{decor(text)}{badge}</div>{rating}</div> : null;
  const details = slot.showProsCons !== false && [item.good, item.bad, item.note].some(Boolean) ? <div className={styles.details}>{([['GOOD', item.good], ['BAD', item.bad], ['NOTE', item.note]] as const).filter(([, value]) => value).slice(0, compact ? 1 : 2).map(([label, value]) => <p key={label}><b>{label}</b><span>{value}</span></p>)}</div> : null;
  const imprint = <div className={styles.imprint}>{footer}</div>;
  const root = (children: ReactNode) => <div className={`${styles.card} ${styles[layout]}`} data-new-layout={layout} data-ratio={slot.ratio} data-decorations={decorations}>{children}</div>;

  switch (layout) {
    case 'doodle': return root(<>
      {header('A LITTLE NOTE')}
      <div className={styles.noteBody}><div className={styles.underlined}>{title}</div>{place}{quote}{details}</div>
      {decorations && <div className={styles.noteDrawing} data-card-decoration="true"><Scribble/><span>keep this moment.</span></div>}{imprint}
    </>);
    case 'feed': return root(<>
      {header(slot.showSignature !== false ? author : 'L2. MINI FEED')}
      <div className={styles.feedPhoto}>{photo('100%')}</div>
      <div className={styles.copy}>{title}{place}{quote}</div>{imprint}
    </>);
    case 'photocard': return root(<>
      <div className={styles.pocketPhoto}>{photo('100%')}<div className={styles.pocketShade}/><div className={styles.pocketTop}>{decor('L2. MOMENT CLUB')}{badge}</div>
        <div className={styles.pocketCaption}>{title}{place}{quote}</div></div>
      {(decorations || score) && <div className={styles.pocketEdition}>{decor('ONE MOMENT. YOUR EDITION.')}{rating}</div>}{imprint}
    </>);
    case 'day': return root(<>
      {header('THE DAILY PAGE')}
      <div className={styles.calendar}><strong>{day || item.date}</strong>{month && <span>{month}<i>/</i>{item.date.split(/[.\-/]/)[0]}</span>}</div>
      <div className={styles.dayBody}>{title}{place}{quote}{details}</div>{imprint}
    </>);
    case 'paint': return root(<>
      {header('NOT PERFECT. STILL MINE.')}
      {decorations && <div className={styles.paintDrawing} data-card-decoration="true"><BadDrawing/></div>}
      <div className={styles.paintCopy}>{title}{place}{quote}{details}</div>{imprint}
    </>);
    case 'arch': return root(<>
      {header('S L O W   M O M E N T S')}
      <div className={styles.archPhoto}>{photo('100%')}</div>
      <div className={styles.archCopy}>{title}{place}{quote}</div>{imprint}
    </>);
    case 'orbit': return root(<>
      {header('IN MY ORBIT')}{title}
      <div className={styles.orbitGrid}><div className={styles.orbitPhoto}>{photo('100%')}</div><div className={styles.orbitCopy}>{decor(item.cat)}{quote}{place}</div></div>
      {decorations && <div className={styles.orbitRule} data-card-decoration="true"><span>PERSONAL OBSERVATIONS</span><i/></div>}{imprint}
    </>);
    case 'duo': return root(<>
      {header('ONE FRAME / TWO VIEWS')}{title}
      <div className={styles.twoPhotos}><div className={styles.wideCut}>{photo('100%')}</div><div className={styles.detailCut}>{photo('100%')}</div></div>
      <div className={styles.copy}>{quote}{place}</div>{imprint}
    </>);
    case 'margin': return root(<>
      {header('THE MOMENTS BETWEEN')}
      <div className={styles.marginCopy}>{title}{quote}</div>
      <div className={styles.marginPhoto}>{photo('100%')}</div>{place}{imprint}
    </>);
  }
}
