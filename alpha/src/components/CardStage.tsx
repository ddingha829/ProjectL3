'use client';

import React, { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ArchiveItem, PresetSlot, SkinTheme } from '@/types/l2';
import { getCardLayout, itemHasPhoto, resolveEffectiveSlot } from '@/lib/cardLayouts';
import { CARD_GRAIN } from '@/lib/cardGrain';
import CardFrame from './CardFrame';
import AdditionalCardLayouts from './AdditionalCardLayouts';
import styles from './CardStage.module.css';

interface CardStageProps {
  item: ArchiveItem;
  slot: PresetSlot;
  skin: SkinTheme;
  authorName: string;
  selectedItems: ArchiveItem[];
  curationTitle: string;
  cardCaptureRef?: React.RefObject<HTMLDivElement | null>;
  onUpdateCrop?: (cropX: number, cropY: number) => void;
}

type Crop = { x: number; y: number };
const clamp = (value: number) => Math.max(0, Math.min(100, value));

function accentInk(color: string): string {
  const hex = color.replace('#', '');
  if (!/^[\da-f]{6}$/i.test(hex)) return '#FFFFFF';
  const rgb = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = rgb.map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722 > .179 ? '#111114' : '#FFFFFF';
}

export default function CardStage({ item, slot: preferredSlot, skin, authorName, selectedItems, curationTitle, cardCaptureRef, onUpdateCrop }: CardStageProps) {
  const slot = resolveEffectiveSlot(item, preferredSlot);
  const [cropMode, setCropMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [crop, setCrop] = useState<Crop>({ x: item.cropX ?? 50, y: item.cropY ?? 50 });
  const cropRef = useRef(crop);
  const gesture = useRef<{ pointer: number; startX: number; startY: number; initial: Crop; overflowX: number; overflowY: number } | null>(null);

  useEffect(() => {
    const next = { x: item.cropX ?? 50, y: item.cropY ?? 50 };
    cropRef.current = next;
    setCrop(next);
  }, [item.id, item.cropX, item.cropY]);
  useEffect(() => {
    setCropMode(false);
    setIsDragging(false);
    gesture.current = null;
  }, [item.id, slot.layout]);

  const updateDraft = (next: Crop) => { cropRef.current = next; setCrop(next); };
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cropMode || !onUpdateCrop || !event.isPrimary || event.button !== 0) return;
    const image = event.currentTarget.querySelector('img');
    if (!image?.naturalWidth) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const cover = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
    gesture.current = { pointer: event.pointerId, startX: event.clientX, startY: event.clientY, initial: cropRef.current, overflowX: image.naturalWidth * cover - rect.width, overflowY: image.naturalHeight * cover - rect.height };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = gesture.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    updateDraft({ x: drag.overflowX > 1 ? clamp(drag.initial.x - (event.clientX - drag.startX) / drag.overflowX * 100) : drag.initial.x, y: drag.overflowY > 1 ? clamp(drag.initial.y - (event.clientY - drag.startY) / drag.overflowY * 100) : drag.initial.y });
  };
  const finishGesture = (event: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const drag = gesture.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    gesture.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!commit) { updateDraft(drag.initial); return; }
    const next = cropRef.current;
    if (next.x !== drag.initial.x || next.y !== drag.initial.y) onUpdateCrop?.(Math.round(next.x), Math.round(next.y));
  };

  const hasPhoto = itemHasPhoto(item);
  const showScore = slot.showScore !== false && item.score !== '' && Number.isFinite(Number(item.score));
  const showLocation = slot.showLocation !== false;
  const showSignature = slot.showSignature !== false;
  const showProsCons = slot.showProsCons !== false;
  const showNumber = slot.showNumber !== false;
  const showDecorations = slot.showDecorations !== false;
  const author = authorName || item.author || 'CURATOR';
  const number = String(item.num || '1').padStart(2, '0');
  const compact = slot.ratio === '1:1';
  const story = slot.ratio === '9:16';
  const photoHeight = compact ? 120 : story ? 290 : 185;
  const location = item.fullAddress || item.addressShort || item.loc;

  const photo = (height: number | string, fullBleed = false) => <div
    className={`${styles.photo} ${fullBleed ? styles.photoCover : ''} ${cropMode ? styles.cropActive : ''}`}
    style={{ height, cursor: cropMode ? isDragging ? 'grabbing' : 'grab' : undefined }}
    onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
    onPointerUp={(event) => finishGesture(event, true)} onPointerCancel={(event) => finishGesture(event, false)}
    role={cropMode ? 'group' : undefined} aria-label={cropMode ? '사진 위치 조정. 드래그하거나 방향키를 사용하세요.' : undefined} tabIndex={cropMode ? 0 : undefined}
    onKeyDown={(event) => {
      if (!cropMode || !onUpdateCrop || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const step = event.shiftKey ? 5 : 1;
      const next = { x: clamp(cropRef.current.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0)), y: clamp(cropRef.current.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0)) };
      updateDraft(next); onUpdateCrop(next.x, next.y);
    }}
  ><img src={item.img} alt={item.title} draggable={false} style={{ objectPosition: `${crop.x}% ${crop.y}%` }} /></div>;
  const label = (text: React.ReactNode, className = '') => <span className={`${styles.label} ${className}`}>{text}</span>;
  const decoration = (text: React.ReactNode, className = '') => showDecorations ? <span data-card-decoration="true" className={`${styles.label} ${className}`}>{text}</span> : null;
  const score = showScore ? <span className={styles.score} aria-label={`평점 ${item.score}`}>{item.score}</span> : null;
  const heading = (withScore = true) => <div className={styles.row} style={{ alignItems: 'flex-start' }}>
    <div style={{ minWidth: 0, flex: 1 }}><h3 className={styles.title}>{item.title}</h3>{showLocation && location && <p className={styles.location}>{location}</p>}</div>{withScore && score}
  </div>;
  const quote = item.quote.trim() ? <p className={styles.quote}>“{item.quote}”</p> : null;
  const details = showProsCons && (item.good || item.bad || item.note) ? <div className={styles.details}>
    {([['GOOD', item.good], ['BAD', item.bad], ['NOTE', item.note]] as const).filter(([, value]) => value).slice(0, compact ? 2 : 3).map(([key, value]) => <div className={styles.detail} key={key}><span>{key}</span><span>{value}</span></div>)}
  </div> : null;
  const footer = <div className={styles.footer}>
    <div className={styles.imprint} data-card-imprint="true">
      <span data-imprint-field="date">{item.date}</span>
      {showSignature && <span data-imprint-field="author" className={styles.imprintAuthor} title={author}>— {author}</span>}
      <span data-imprint-field="design">{getCardLayout(slot.layout).name}</span>
      <span data-imprint-field="ratio">{slot.ratio}</span>
      <span data-imprint-field="theme" className={styles.imprintPalette} title={`THEME: ${skin.name}`}><span>THEME:</span><span className={styles.imprintThemeName}>{skin.name}</span></span>
    </div>
  </div>;
  const header = (title = 'L2.', subtitle: React.ReactNode = item.cat) => showDecorations ? <div data-card-decoration="true" className={styles.header}><span className={styles.brand}>{title}</span>{label(subtitle, styles.muted)}</div> : null;

  let artwork: React.ReactNode;
  let treatment = '';
  switch (slot.layout) {
    case 'cover':
    case 'magazine': {
      const magazine = slot.layout === 'magazine';
      treatment = styles.fullBleed;
      artwork = <>{photo('100%', true)}<div className={styles.vignette} /><div className={styles.artwork}>
        {(showDecorations || !magazine && showScore) && <div className={styles.header} style={!showDecorations ? { justifyContent: 'flex-end' } : undefined}>{showDecorations && <div data-card-decoration="true"><div className={magazine ? styles.masthead : styles.brand}>{magazine ? 'L2. CHRONICLE' : compact && showNumber ? number : 'L2.'}</div>{label(magazine ? 'THE JOURNAL OF TASTE & SPACES' : item.sub || item.cat, styles.muted)}</div>}{magazine ? decoration(item.cat) : score}</div>}
        <div className={styles.content}>{magazine && decoration(`COVER STORY · ${item.cat}`, styles.accent)}{heading(false)}{quote}{magazine && !compact && details}{magazine && showScore && label(`RATING ${item.score} / 5`)}{footer}</div>
      </div></>;
      break;
    }
    case 'ticket':
      treatment = styles.ticket;
      artwork = <div className={styles.artwork}>
        {header(showNumber ? `L2 / ${number}` : 'L2.', 'ADMISSION TICKET')}{photo(photoHeight)}<div className={styles.content}>{heading()}{quote && <div className={styles.quoteBox}>{quote}</div>}{!compact && details}</div>{footer}
      </div>;
      break;
    case 'curation': {
      const allEntries = selectedItems.length ? selectedItems : item.cat === 'GROUP' ? [] : [item];
      const entries = allEntries.slice(0, 20);
      artwork = <div className={styles.artwork}>{header('L2.', `CURATED LIST · ${allEntries.length}`)}<h3 className={styles.title}>{curationTitle || 'TOP PICKS.'}</h3>
        <div className={`${styles.list} ${entries.length > 4 ? styles.denseList : ''}`} style={entries.length>8?{gap:3}:undefined}>{entries.map((entry, index) => <div className={styles.listEntry} key={entry.id} style={entries.length>8?{padding:'3px 6px',gap:6}:undefined}>
          {entries.length<=8&&(itemHasPhoto(entry) ? <img src={entry.img} alt={entry.title} style={{ objectPosition: `${entry.cropX ?? 50}% ${entry.cropY ?? 50}%` }} /> : <div className={styles.listPlaceholder}>{String(index + 1).padStart(2,'0')}</div>)}
          <div style={{ minWidth: 0, flex: 1 }}><h4 className={styles.title} style={entries.length>8?{fontSize:entries.length>12?13:16}:undefined}>{String(index + 1).padStart(2, '0')} {entry.title}</h4>{entries.length<=5&&entry.quote.trim() && <p className={styles.quote}>{entry.quote}</p>}{showLocation&&entries.length<=8&&<p className={styles.location}>{entry.addressShort || entry.loc}</p>}</div>
          {entries.length<=8&&slot.showScore !== false && entry.score !== '' && Number.isFinite(Number(entry.score)) && <span className={styles.score}>{entry.score}</span>}
        </div>)}</div>{footer}
      </div>;
      break;
    }
    case 'receipt':
      treatment = styles.receipt;
      artwork = <><div className={styles.tear} style={{ top: 0 }} /><div className={styles.artwork}>
        {showDecorations && <div data-card-decoration="true" className={styles.header}><div className={styles.brand}>L2. RECEIPT</div>{label(`${showNumber ? `ORDER #${number} · ` : ''}${item.date}`, styles.muted)}</div>}
        {heading(false)}{photo(compact ? 87 : story ? 220 : 140)}{(showDecorations || showScore) && <div className={styles.row}>{decoration(`${showNumber ? `${number}. ` : ''}${item.cat}`)}{showScore && label(`★ ${item.score} / 5`, styles.accent)}</div>}
        {details}{quote && <div className={styles.quoteBox}>{quote}</div>}<div className={styles.barcode} aria-hidden="true" />{footer}
      </div><div className={styles.tear} style={{ bottom: 0, transform: 'rotate(180deg)' }} /></>;
      break;
    case 'polaroid':
      treatment = styles.polaroid;
      artwork = <><div className={styles.tape} /><div className={styles.artwork}>
        <div className={styles.film} style={{ height: compact ? 185 : story ? 380 : 270 }}>{showDecorations && <div data-card-decoration="true" className={styles.row}>{label('L2. FILM ARCHIVE')}{showNumber && label(`FRAME ${number}`)}</div>}{photo('100%')}{showDecorations && <div data-card-decoration="true" className={styles.row}>{label(item.date)}{label(item.cat)}</div>}</div>
        {heading()}<div className={styles.content}>{quote}{!compact && details}</div>{footer}
      </div></>;
      break;
    case 'passport':
      treatment = styles.passport;
      artwork = <div className={styles.artwork}>{header('L2 PASSPORT', showNumber ? `NO. ${number}` : '')}
        <div className={styles.stamps}><div className={styles.stamp}>{showDecorations && <span data-card-decoration="true">★ VISITED ★<br /></span>}{showLocation && item.loc && <>{item.loc}<br /></>}{item.date}</div>{showScore && <div className={`${styles.stamp} ${styles.stampRound}`}>{showDecorations && <span data-card-decoration="true">ADMITTED<br /></span>}SCORE {item.score}</div>}</div>
        <div className={`${styles.dataBox} ${styles.grow}`}>{decoration(`RECORD ENTRY · ${item.cat}`, styles.accent)}{heading(false)}{quote}</div>
        {showDecorations && <div data-card-decoration="true" className={styles.mrz} aria-hidden="true">P&lt;KORARCHIVE&lt;&lt;L2&lt;{item.cat}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>}{footer}
      </div>;
      break;
    case 'vinyl': {
      treatment = styles.vinyl;
      const tracks = showProsCons ? [item.good, item.quote, item.note].filter(Boolean) : [item.quote];
      artwork = <><div className={styles.disc} aria-hidden="true"><div className={styles.discLabel}>{showDecorations && <span data-card-decoration="true">L2. SOUND<br />33⅓ RPM</span>}</div></div><div className={styles.artwork}>
        {header('L2. SOUND', showNumber ? `SIDE A · ${number}` : '')}<div className={`${styles.content} ${styles.grow}`} style={{ justifyContent: 'center' }}>{decoration(`ORIGINAL EXPERIENCE · ${item.cat}`, styles.accent)}{heading(false)}<div className={styles.tracks}>{tracks.map((track, index) => <div className={styles.track} key={index}><span>{String(index + 1).padStart(2, '0')}</span><span>{track}</span></div>)}</div></div>
        {(showScore || showDecorations) && <div className={styles.row}>{showScore && label(`SCORE ★ ${item.score} / 5`, styles.accent)}{decoration('PERSONAL PRESSING', styles.muted)}</div>}<div className={styles.scrubber} aria-hidden="true" />{footer}
      </div></>;
      break;
    }
    case 'library':
      treatment = styles.library;
      artwork = <div className={styles.artwork}>{header('L2 PUBLIC ARCHIVE', showNumber ? `CAT. ${number}` : '')}<div className={styles.catalogField}>{decoration('TITLE OF RECORD', styles.muted)}{heading(false)}</div>
        <div className={`${styles.catalogField} ${styles.grow}`}>{decoration('CURATOR’S SUMMARY', styles.muted)}{quote}</div>
        <table className={styles.catalogTable}><thead><tr><th>DATE ISSUED</th>{showSignature && <th>CURATOR</th>}{showScore && <th>SCORE</th>}</tr></thead><tbody><tr><td>{item.date}</td>{showSignature && <td>{author}</td>}{showScore && <td className={styles.accent}>★ {item.score}</td>}</tr></tbody></table>
        {decoration(`ARCHIVED & PRESERVED · ${item.cat}`, styles.accent)}{footer}
      </div>;
      break;
    case 'broadside':
      treatment = styles.broadside;
      artwork = <div className={styles.artwork}>{showDecorations && <div data-card-decoration="true" className={styles.header}><div className={styles.number} data-card-number="true" hidden={!showNumber}>{number}</div><span className={styles.brand}>L2<br />ARCHIV.</span></div>}
        <div className={styles.metadata}>{showLocation && <div>{label('01 PLACE', styles.muted)}<div className={styles.truncate}>{item.loc}</div></div>}<div>{label('02 DATE', styles.muted)}<div>{item.date}</div></div>{showScore && <div>{label('03 SCORE', styles.muted)}<div className={styles.accent}>★ {item.score}</div></div>}</div>
        <div className={`${styles.content} ${styles.grow}`} style={{ justifyContent: 'center' }}>{heading(false)}{quote && <div className={styles.quoteBox}>{quote}</div>}{details}</div>{footer}
      </div>;
      break;
    case 'doodle':
    case 'feed':
    case 'photocard':
    case 'day':
    case 'paint':
    case 'arch':
    case 'orbit':
    case 'duo':
    case 'margin':
      artwork = <AdditionalCardLayouts layout={slot.layout} item={item} slot={slot} author={author} footer={footer} photo={photo}/>;
      break;
    default:
      treatment = styles.editorial;
      artwork = <div className={styles.artwork}>{header(showNumber ? `L2 / ${number}` : 'L2.', item.sub || item.cat)}{photo(photoHeight)}<div className={styles.content}>{heading()}{quote && <div className={styles.quoteBox}>{quote}</div>}{!compact && details}</div>{footer}</div>;
  }

  const variables = { '--card-bg': skin.bg, '--card-text': skin.text, '--card-sub': skin.sub, '--card-border': skin.border, '--card-accent': skin.accent, '--card-chip': skin.chipBg, '--card-accent-ink': accentInk(skin.accent), backgroundColor: skin.bg } as CSSProperties;
  return <div data-card-preview="true" className={styles.stage}>
    <CardFrame ratio={slot.ratio} layout={slot.layout} captureRef={cardCaptureRef} style={variables}><div className={`${styles.surface} ${treatment}`}>{artwork}</div>{slot.showGrain !== false && <div className={styles.grain} style={{ backgroundImage: `url("${CARD_GRAIN}")` }} aria-hidden="true" />}</CardFrame>
    {hasPhoto && onUpdateCrop && !getCardLayout(slot.layout).isNoPhoto && slot.layout !== 'curation' && <div className={styles.cropToolbar}>{cropMode && <span className={styles.cropHint}>사진을 드래그해 조정하세요</span>}<button type="button" aria-pressed={cropMode} onClick={() => setCropMode((active) => !active)}>{cropMode ? '위치 조정 완료' : '사진 위치 조정'}</button></div>}
  </div>;
}
