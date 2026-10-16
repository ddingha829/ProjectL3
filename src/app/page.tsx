'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toPng } from 'html-to-image';
import {
  ArchiveCategory,
  ArchiveItem,
  ArchiveViewMode,
  CardLayoutType,
  MapApiPlace,
  OptionRowKey,
  PresetSlot,
  SkinTheme,
  SortOrder,
} from '@/types/l2';
import {
  extractBadFromText,
  extractGoodFromText,
  extractNoteFromText,
  INITIAL_ARCHIVES,
  INITIAL_SKINS,
  MAP_API_PLACES,
  PRESET_SLOTS,
} from '@/data/initialData';
import { compressUploadedImage, dataUrlToFile } from '@/lib/imageUtils';
import { haptic } from '@/lib/haptics';
import CardStage from '@/components/CardStage';
import InstallHint from '@/components/InstallHint';

type TabId = 'log' | 'archive' | 'card' | 'studio';

const SAMPLE_PHOTOS = [
  { key: 'korean', label: '한식 한상', url: '/images/korean.jpg' },
  { key: 'wine', label: '와인 파스타', url: '/images/wine.jpg' },
  { key: 'cinema', label: '시네마', url: '/images/cinema.jpg' },
  { key: 'museum', label: '전시 공간', url: '/images/museum.jpg' },
];

const ALL_LAYOUTS: {
  id: CardLayoutType;
  name: string;
  sub: string;
  ratio: '3:4' | '1:1' | '9:16';
  isNoPhoto: boolean;
}[] = [
  // Photo Layouts (7)
  { id: 'spec', name: 'KAKAO', sub: '에디토리얼 리뷰', ratio: '3:4', isNoPhoto: false },
  { id: 'cover', name: 'INSTA', sub: '풀블리드 포스터', ratio: '1:1', isNoPhoto: false },
  { id: 'ticket', name: 'TICKET', sub: '입장권 티켓 스텁', ratio: '9:16', isNoPhoto: false },
  { id: 'curation', name: 'LIST', sub: '멀티 큐레이션', ratio: '3:4', isNoPhoto: false },
  { id: 'receipt', name: 'RECEIPT', sub: '비스트로 감열 영수증', ratio: '3:4', isNoPhoto: false },
  { id: 'polaroid', name: 'POLAROID', sub: '35mm 필름 콘택트', ratio: '3:4', isNoPhoto: false },
  { id: 'magazine', name: 'MAGAZINE', sub: '모노클 매거진 커버', ratio: '3:4', isNoPhoto: false },

  // No-Photo Layouts (4)
  { id: 'passport', name: 'PASSPORT', sub: '여권 비자 스탬프', ratio: '3:4', isNoPhoto: true },
  { id: 'vinyl', name: 'VINYL LP', sub: '33⅓ RPM 자켓·트랙', ratio: '1:1', isNoPhoto: true },
  { id: 'library', name: 'LIBRARY', sub: '도서관 대출 카드', ratio: '3:4', isNoPhoto: true },
  { id: 'broadside', name: 'BROADSIDE', sub: '스위스 타이포 포스터', ratio: '3:4', isNoPhoto: true },
];

const STORAGE_KEY = 'l2_production_state_v1';

export default function L2AppPage() {
  // Navigation & Theme
  const [activeTab, setActiveTab] = useState<TabId>('log');
  const [isLight, setIsLight] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authorName, setAuthorName] = useState('L2. ARCHIVE');

  // Device Session & Rate Limit State
  const [recoveryCode, setRecoveryCode] = useState<string>('');
  const [aiUsage, setAiUsage] = useState<{ used: number; limit: number }>({
    used: 0,
    limit: 30,
  });
  const [restoreCodeInput, setRestoreCodeInput] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [detectedPreviousCode, setDetectedPreviousCode] = useState<string | null>(
    null
  );

  // Data State (Starts empty for new testers)
  const [archives, setArchives] = useState<ArchiveItem[]>([]);
  const [presetSlots, setPresetSlots] = useState<PresetSlot[]>(PRESET_SLOTS);
  const [skins, setSkins] = useState<Record<string, SkinTheme>>(INITIAL_SKINS);
  const [isSaving, setIsSaving] = useState(false);

  // Archive Filters & Modes
  const [filterCategory, setFilterCategory] = useState<'ALL' | ArchiveCategory>(
    'ALL'
  );
  const [archiveView, setArchiveView] = useState<ArchiveViewMode>('poster');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [curationTitle, setCurationTitle] = useState('TOP PICKS.');

  // Active Card & Studio State
  const [activeItemId, setActiveItemId] = useState<string>('');
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);
  const [studioPrompt, setStudioPrompt] = useState('');
  const [isGeneratingSkin, setIsGeneratingSkin] = useState(false);

  // + LOG State (Full-screen canvas + translucent 1-row-per-option overlay)
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [logTitle, setLogTitle] = useState('');
  const [logBody, setLogBody] = useState('');
  const [logHasPhoto, setLogHasPhoto] = useState<boolean>(true);
  const [logImg, setLogImg] = useState('/images/korean.jpg');
  const [logCropX, setLogCropX] = useState(50);
  const [layoutFilter, setLayoutFilter] = useState<'ALL' | 'PHOTO' | 'NO_PHOTO'>('ALL');
  const [logCropY, setLogCropY] = useState(50);
  const [logCat, setLogCat] = useState<ArchiveCategory>('DINING');
  const [logScore, setLogScore] = useState<number>(4.5);
  const [logGood, setLogGood] = useState('');
  const [logBad, setLogBad] = useState('');
  const [logNote, setLogNote] = useState('');
  const [logMapQuery, setLogMapQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<MapApiPlace | null>(null);
  const [placeResults, setPlaceResults] =
    useState<MapApiPlace[]>(MAP_API_PLACES);
  const [mapDropdownOpen, setMapDropdownOpen] = useState(false);

  // Overlay Modal State
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [, setFocusedOptionRow] = useState<OptionRowKey | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ title: string; sub: string } | null>(
    null
  );
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sticky-to-Docked Share Bar Observer
  const shareSentinelRef = useRef<HTMLDivElement | null>(null);
  const [shareBarDocked, setShareBarDocked] = useState(false);

  // Refs for Card Capture & Log Photo Panning
  const cardCaptureRef = useRef<HTMLDivElement | null>(null);
  const scoreTrackRef = useRef<HTMLDivElement | null>(null);
  const logPhotoDragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
  }>({ active: false, startX: 0, startY: 0, initX: 50, initY: 50 });

  const showToast = (title: string, sub: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ title, sub });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Initial Hydrate: initialize device session & load per-device logs
  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      try {
        const sessionRes = await fetch('/api/session');
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (mounted) {
            if (sessionData.recoveryCode) {
              setRecoveryCode(sessionData.recoveryCode);
              const storedLastCode = localStorage.getItem('l2_last_recovery_code');
              if (
                storedLastCode &&
                storedLastCode !== sessionData.recoveryCode &&
                sessionData.isNewDevice
              ) {
                setDetectedPreviousCode(storedLastCode);
              } else {
                localStorage.setItem('l2_last_recovery_code', sessionData.recoveryCode);
              }
            }
            if (sessionData.authorName) setAuthorName(sessionData.authorName);
            if (sessionData.presetSlots) setPresetSlots(sessionData.presetSlots);
            if (sessionData.skins) setSkins(sessionData.skins);
            if (sessionData.aiUsage) setAiUsage(sessionData.aiUsage);
          }
        }

        const res = await fetch('/api/logs');
        if (res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data.archives)) {
            setArchives(data.archives);
            if (data.archives[0]) setActiveItemId(data.archives[0].id);
            if (data.recoveryCode) setRecoveryCode(data.recoveryCode);
            if (data.authorName) setAuthorName(data.authorName);
            if (data.presetSlots) setPresetSlots(data.presetSlots);
            if (data.skins) setSkins(data.skins);
            return;
          }
        }
      } catch {
        // Fallback to localStorage if offline
      }

      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && mounted) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.archives)) setArchives(parsed.archives);
          if (Array.isArray(parsed.presetSlots))
            setPresetSlots(parsed.presetSlots);
          if (parsed.skins) setSkins(parsed.skins);
          if (parsed.authorName) setAuthorName(parsed.authorName);
        }
      } catch {
        // Ignore storage error
      }
    }
    hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  // Restore device session via Recovery Code
  const handleRestoreDevice = async (overrideCode?: string) => {
    const raw = (overrideCode || restoreCodeInput).trim();
    if (!raw || isRestoring) return;
    setIsRestoring(true);
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recoveryCode: raw }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.recoveryCode) {
          setRecoveryCode(data.recoveryCode);
          localStorage.setItem('l2_last_recovery_code', data.recoveryCode);
        }
        if (data.authorName) setAuthorName(data.authorName);
        if (data.presetSlots) setPresetSlots(data.presetSlots);
        if (data.skins) setSkins(data.skins);
        if (Array.isArray(data.archives)) {
          setArchives(data.archives);
          if (data.archives[0]) setActiveItemId(data.archives[0].id);
        }
        if (data.aiUsage) setAiUsage(data.aiUsage);
        setRestoreCodeInput('');
        setDetectedPreviousCode(null);
        setSettingsOpen(false);
        haptic.success();
        showToast(
          'RESTORE SUCCESS',
          '기존 기기의 모든 기록과 스킨이 복구되었습니다'
        );
      } else {
        showToast('RESTORE FAILED', data.detail || '복구 코드를 확인해주세요');
      }
    } catch {
      showToast('RESTORE ERROR', '네트워크 연결 상태를 확인해주세요');
    } finally {
      setIsRestoring(false);
    }
  };

  // Persist preferences to localStorage for instant local start
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ archives, presetSlots, skins, authorName })
      );
    } catch {
      // Ignore quota errors
    }
  }, [archives, presetSlots, skins, authorName]);

  // Sync light/dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isLight) {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [isLight]);

  // Debounced Place/Movie Search against /api/places/search
  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = logMapQuery.split('(')[0].trim();
      try {
        const res = await fetch(
          `/api/places/search?q=${encodeURIComponent(q)}&category=${encodeURIComponent(logCat)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.results)) {
            setPlaceResults(data.results);
          }
        }
      } catch {
        // Keep local places
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [logMapQuery, logCat]);

  // Sticky-to-inline IntersectionObserver for CARD share bar
  useEffect(() => {
    if (activeTab !== 'card') return;
    const sentinel = shareSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setShareBarDocked(entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeTab]);

  // Filtered & Sorted Archive Items
  const filteredArchives = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return archives
      .filter((item) => {
        const matchCat =
          filterCategory === 'ALL' || item.cat === filterCategory;
        const matchQuery =
          !q ||
          item.title.toLowerCase().includes(q) ||
          item.loc.toLowerCase().includes(q) ||
          item.addressShort.toLowerCase().includes(q) ||
          item.quote.toLowerCase().includes(q) ||
          item.good.toLowerCase().includes(q);
        return matchCat && matchQuery;
      })
      .sort((a, b) =>
        sortOrder === 'desc'
          ? b.timestamp - a.timestamp
          : a.timestamp - b.timestamp
      );
  }, [archives, filterCategory, searchQuery, sortOrder]);

  // Elegant fallback preview item when archive is empty
  const fallbackItem: ArchiveItem = useMemo(
    () => ({
      id: 'preview_sample',
      num: '01',
      cat: 'DINING',
      sub: 'DINING · SEOUL',
      title: '첫 번째 로그',
      loc: 'SEOUL',
      addressShort: '서울 성동구 성수동',
      fullAddress: '서울 성동구 성수동',
      date: '26.10.16',
      timestamp: Date.now(),
      score: '5.0',
      quote: '인상적인 순간을 한 줄로 기록하고 나만의 카드로 완성해보세요.',
      good: '감각적인 에디토리얼 디자인과 고해상도 카드 공유',
      bad: '',
      note: '직접 촬영한 사진과 함께 첫 기록을 남겨보세요.',
      link: 'https://maps.google.com',
      img: '/images/korean.jpg',
      cropX: 50,
      cropY: 50,
      mapX: 50,
      mapY: 50,
      author: authorName || 'L2. ARCHIVE',
    }),
    [authorName]
  );

  const activeItem = useMemo(
    () =>
      archives.find((a) => a.id === activeItemId) ||
      archives[0] ||
      fallbackItem,
    [archives, activeItemId, fallbackItem]
  );

  const activeSlot = presetSlots[activeSlotIdx] || presetSlots[0];
  const activeSkin = skins[activeSlot.skinId] || skins.paper;

  const selectedArchiveItems = useMemo(
    () => archives.filter((a) => selectedIds.includes(a.id)),
    [archives, selectedIds]
  );

  const itemHasNoPhoto = Boolean(
    activeItem && (activeItem.hasPhoto === false || !activeItem.img)
  );

  // When viewing a photo-less archive, automatically ensure the layout is a No-Photo layout
  useEffect(() => {
    if (itemHasNoPhoto) {
      const PHOTO_LAYOUTS: CardLayoutType[] = [
        'spec',
        'cover',
        'ticket',
        'curation',
        'receipt',
        'polaroid',
        'magazine',
      ];
      if (PHOTO_LAYOUTS.includes(activeSlot.layout)) {
        setPresetSlots((prev) =>
          prev.map((s, idx) =>
            idx === activeSlotIdx
              ? { ...s, layout: 'passport' as CardLayoutType, ratio: '3:4' as const }
              : s
          )
        );
      }
    }
  }, [itemHasNoPhoto, activeSlot.layout, activeSlotIdx]);

  // Handlers for + LOG Photo Panning & File Upload
  const handleLogPhotoPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, label, input')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    logPhotoDragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      initX: logCropX,
      initY: logCropY,
    };
  };

  const handleLogPhotoPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!logPhotoDragRef.current.active) return;
    const dx = e.clientX - logPhotoDragRef.current.startX;
    const dy = e.clientY - logPhotoDragRef.current.startY;
    setLogCropX(
      Math.max(
        0,
        Math.min(100, Math.round(logPhotoDragRef.current.initX - dx * 0.2))
      )
    );
    setLogCropY(
      Math.max(
        0,
        Math.min(100, Math.round(logPhotoDragRef.current.initY - dy * 0.2))
      )
    );
  };

  const handleLogPhotoPointerUp = () => {
    logPhotoDragRef.current.active = false;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressUploadedImage(file, 1280, 0.85);
      setLogImg(compressedDataUrl);
      setLogCropX(50);
      setLogCropY(50);
      showToast('PHOTO UPLOADED', '사진을 위아래로 드래그해 초점을 조절하세요');
    } catch {
      showToast('UPLOAD ERROR', '이미지 파일을 읽는 중 문제가 발생했습니다');
    }
  };

  // Draggable 0.1-unit Score Gauge Handler with Haptic Tick
  const updateScoreFromClientX = (clientX: number) => {
    const track = scoreTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0.02, Math.min(1, (clientX - rect.left) / rect.width));
    const stepped = Math.max(0.1, Math.round(ratio * 50) / 10);
    const newScore = Number(stepped.toFixed(1));
    setLogScore((prev) => {
      if (prev !== newScore) {
        haptic.tick();
      }
      return newScore;
    });
  };

  // Save or Update Log -> Calls /api/ai/extract (if needed) + /api/logs
  const handleSaveLogWithCat = async (selectedCat?: ArchiveCategory) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const cat: ArchiveCategory = selectedCat || logCat || 'DINING';
      setLogCat(cat);

      const title = logTitle.trim() || (cat === 'CINEMA' ? 'THE SUBSTANCE' : '작은부엌');
      const quote =
        logBody.trim() ||
        (cat === 'CINEMA'
          ? '강렬한 대비와 사운드가 압도적인 올해의 시네마 경험.'
          : '‘진짜’ 전라도 한식 한상차림을 먹을 수 있는 현지인 맛집.');
      const score = logScore.toFixed(1);
      const loc = selectedPlace?.loc || (cat === 'CINEMA' ? 'FILM' : 'SUNCHEON');

      let good = logGood.trim();
      let bad = logBad.trim();
      let note = logNote.trim();

      if (!good || !note) {
        try {
          const aiRes = await fetch('/api/ai/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, quote, loc, category: cat }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            if (!good) good = aiData.good;
            if (!bad && aiData.bad) bad = aiData.bad;
            if (!note) note = aiData.note;
          }
        } catch {
          // Local fallback
        }
      }

      if (!good) good = extractGoodFromText(quote, title);
      if (!bad) bad = extractBadFromText(quote);
      if (!note) note = extractNoteFromText(quote, loc);

      const now = new Date();
      const dateStr = `${String(now.getFullYear()).slice(-2)}.${String(
        now.getMonth() + 1
      ).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

      const payload: ArchiveItem = {
        id: editingLogId || `log_${Date.now()}`,
        num: String(archives.length + 1).padStart(2, '0'),
        cat,
        sub: `${cat} · ${loc}`,
        title,
        loc,
        addressShort: selectedPlace?.short || '전남 순천시 향교동',
        fullAddress:
          selectedPlace?.fullAddress ||
          selectedPlace?.short ||
          '전라남도 순천시 향교길 39',
        date: dateStr,
        timestamp: Date.now(),
        score,
        quote,
        good,
        bad,
        note,
        link:
          selectedPlace?.link ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            title
          )}`,
        img: logHasPhoto ? logImg : '',
        hasPhoto: logHasPhoto,
        cropX: logCropX,
        cropY: logCropY,
        mapX: selectedPlace?.x || 48,
        mapY: selectedPlace?.y || 52,
        author: authorName,
      };

      const res = await fetch('/api/logs', {
        method: editingLogId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let targetId = payload.id;
      if (res.ok) {
        const data = await res.json();
        const savedItem = data.item || payload;
        targetId = savedItem.id;
        if (Array.isArray(data.archives)) {
          setArchives(data.archives);
        } else {
          setArchives((prev) => [
            savedItem,
            ...prev.filter(
              (a) => a.id !== savedItem.id && a.id !== editingLogId
            ),
          ]);
        }
      } else {
        setArchives((prev) => [payload, ...prev]);
      }

      if (!logHasPhoto) {
        const nextSlots = presetSlots.map((slot, idx) =>
          idx === activeSlotIdx
            ? { ...slot, layout: 'passport' as CardLayoutType, ratio: '3:4' as const }
            : slot
        );
        setPresetSlots(nextSlots);
        syncPresetsToServer(nextSlots, skins);
      }

      setActiveItemId(targetId);
      setEditingLogId(null);
      setLogTitle('');
      setLogBody('');
      setLogHasPhoto(true);
      setLogGood('');
      setLogBad('');
      setLogNote('');
      setLogMapQuery('');
      setSelectedPlace(null);
      setOptionsModalOpen(false);
      setCategoryModalOpen(false);
      setActiveTab('card');
      haptic.success();
      showToast(
        'LOG SAVED TO CARD',
        '로그가 저장되어 공유 카드가 생성되었습니다'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Open Mandatory Category Selection Modal Before Saving
  const handleInitiateSave = () => {
    haptic.snap();
    setCategoryModalOpen(true);
  };

  // Load an existing Archive Item into + LOG for Editing
  const handleEditActiveItem = (item: ArchiveItem) => {
    setEditingLogId(item.id);
    setLogTitle(item.title);
    setLogBody(item.quote);
    setLogHasPhoto(item.hasPhoto !== false && Boolean(item.img));
    setLogImg(item.img || '/images/korean.jpg');
    setLogCropX(item.cropX ?? 50);
    setLogCropY(item.cropY ?? 50);
    setLogCat(item.cat);
    setLogScore( parseFloat(item.score) || 4.5);
    setLogGood(item.good);
    setLogBad(item.bad);
    setLogNote(item.note);
    setLogMapQuery(`${item.addressShort} (${item.fullAddress || item.addressShort})`);
    setSelectedPlace({
      name: item.title,
      short: item.addressShort,
      fullAddress: item.fullAddress || item.addressShort,
      loc: item.loc,
      link: item.link,
      x: item.mapX,
      y: item.mapY,
    });
    setActiveTab('log');
    showToast('EDIT MODE', `${item.title} 로그를 수정합니다`);
  };

  // Delete an Archive Item
  const handleDeleteItem = async (id: string) => {
    haptic.warning();
    const nextList = archives.filter((a) => a.id !== id);
    setArchives(nextList);
    if (activeItemId === id) {
      setActiveItemId(nextList[0]?.id || '');
    }
    try {
      const res = await fetch(`/api/logs?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.archives)) {
          setArchives(data.archives);
          if (activeItemId === id) {
            setActiveItemId(data.archives[0]?.id || '');
          }
        }
      }
    } catch {
      // Ignore network error
    }
    showToast('DELETED', '아카이브에서 로그가 삭제되었습니다');
  };

  // Share Trigger (Exports 3x PNG + Copies Auto-matched Link + Invokes Mobile Web Share API)
  const handleTriggerShare = async (platform: 'KAKAO' | 'INSTA') => {
    const shareText =
      activeSlot.layout === 'curation'
        ? `[L2] ${curationTitle} (${selectedArchiveItems.length} PICKS)`
        : `${activeItem.title} — “${activeItem.quote}”\n${activeItem.link}`;

    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      // Ignore clipboard permission fallback
    }

    let exportedDataUrl: string | null = null;
    const filename = `L2_${activeSlot.name}_${activeItem.title.replace(
      /\s+/g,
      '_'
    )}.png`;

    if (cardCaptureRef.current) {
      try {
        exportedDataUrl = await toPng(cardCaptureRef.current, {
          cacheBust: true,
          pixelRatio: 3,
        });
      } catch {
        // Fallback if image export is skipped
      }
    }

    // Try Mobile Web Share API with Image File if supported on iPhone/Android
    if (
      exportedDataUrl &&
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      window.innerWidth < 768
    ) {
      try {
        const file = await dataUrlToFile(exportedDataUrl, filename);
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `[L2.] ${activeItem.title}`,
            text: shareText,
            files: [file],
          });
          showToast(
            `${platform} SHARED`,
            '카드 이미지와 링크가 함께 공유되었습니다'
          );
          return;
        }
      } catch {
        // Fall through to direct download
      }
    }

    if (exportedDataUrl) {
      const link = document.createElement('a');
      link.download = filename;
      link.href = exportedDataUrl;
      link.click();
    }

    if (platform === 'KAKAO') {
      const kakaoJsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      const w = window as unknown as {
        Kakao?: {
          isInitialized: () => boolean;
          init: (k: string) => void;
          Share?: {
            sendDefault: (opts: Record<string, unknown>) => void;
          };
        };
      };
      if (kakaoJsKey && w.Kakao) {
        try {
          if (!w.Kakao.isInitialized()) {
            w.Kakao.init(kakaoJsKey);
          }
          const shareUrl = `${window.location.origin}/share/${activeItem.id}`;
          w.Kakao.Share?.sendDefault({
            objectType: 'feed',
            content: {
              title: `[L2.] ${activeItem.title} (★${activeItem.score})`,
              description: `“${activeItem.quote}” | GOOD: ${activeItem.good}`,
              imageUrl: `${window.location.origin}/images/korean.jpg`,
              link: {
                mobileWebUrl: shareUrl,
                webUrl: shareUrl,
              },
            },
            buttons: [
              {
                title: '추천 카드 보기',
                link: {
                  mobileWebUrl: shareUrl,
                  webUrl: shareUrl,
                },
              },
            ],
          });
        } catch {
          // Fallback to toast + clipboard
        }
      }
      showToast(
        'KAKAOTALK READY',
        `카드 이미지 저장 + 링크 복사 완료 (${activeItem.link})`
      );
    } else {
      showToast(
        'INSTAGRAM READY',
        `고해상도 ${activeSlot.ratio} 카드 이미지가 저장되었습니다`
      );
    }
  };

  // Persist Preset & Skin Updates to Server (/api/presets)
  const syncPresetsToServer = async (
    nextSlots: PresetSlot[],
    nextSkins: Record<string, SkinTheme>,
    nextAuthor = authorName
  ) => {
    try {
      await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presetSlots: nextSlots,
          skins: nextSkins,
          authorName: nextAuthor,
        }),
      });
    } catch {
      // Saved in localStorage
    }
  };

  // Studio AI Skin Generator (/api/ai/skin)
  const handleGenerateAiSkin = async () => {
    if (isGeneratingSkin) return;
    setIsGeneratingSkin(true);
    const defaultMoodCycle = [
      'TOKYO JAZZ AMBER',
      'HONGKONG NEON',
      'LISBON COBALT SEA',
      'KYOTO MATCHA MOSS',
      'PARIS VELVET ROSE',
      'KINFOLK LINEN',
      'CRIMSON OPERA',
      'BERLIN ACID TECH',
      'NORDIC FJORD ICE',
      'VINTAGE ESPRESSO',
      'COSMIC VIOLET',
      'MILAN TERRA ROSSA',
    ];
    const promptText =
      studioPrompt.trim() ||
      defaultMoodCycle[Object.keys(skins).length % defaultMoodCycle.length];

    try {
      const res = await fetch('/api/ai/skin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      });
      if (res.ok) {
        const { skin } = (await res.json()) as { skin: SkinTheme };
        const nextSkins = { ...skins, [skin.id]: skin };
        const nextSlots = presetSlots.map((slot, idx) =>
          idx === activeSlotIdx ? { ...slot, skinId: skin.id } : slot
        );
        setSkins(nextSkins);
        setPresetSlots(nextSlots);
        setStudioPrompt('');
        syncPresetsToServer(nextSlots, nextSkins);
        showToast(
          'AI SKIN APPLIED',
          `${skin.name} 스킨이 프리셋에 적용되었습니다`
        );
      }
    } finally {
      setIsGeneratingSkin(false);
    }
  };

  // Delete Custom / AI Skin
  const handleDeleteSkin = (skinId: string) => {
    haptic.warning();
    const targetName = skins[skinId]?.name || '스킨';
    const nextSkins = { ...skins };
    delete nextSkins[skinId];

    // Fallback skin for any slots that were using this skin
    const fallbackSkinId = Object.keys(nextSkins)[0] || 'paper';
    const nextSlots = presetSlots.map((slot) =>
      slot.skinId === skinId ? { ...slot, skinId: fallbackSkinId } : slot
    );

    setSkins(nextSkins);
    setPresetSlots(nextSlots);
    syncPresetsToServer(nextSlots, nextSkins);
    showToast('SKIN DELETED', `${targetName} 스킨이 삭제되었습니다`);
  };

  // Cycle to Previous / Next Skin for the active slot
  const handleCycleSkin = (direction: 'next' | 'prev') => {
    haptic.snap();
    const skinList = Object.values(skins);
    if (skinList.length <= 1) return;
    const currentIdx = skinList.findIndex((s) => s.id === activeSlot.skinId);
    let nextIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (nextIdx >= skinList.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = skinList.length - 1;
    const targetSkin = skinList[nextIdx];

    const nextSlots = presetSlots.map((slot, idx) =>
      idx === activeSlotIdx ? { ...slot, skinId: targetSkin.id } : slot
    );
    setPresetSlots(nextSlots);
    syncPresetsToServer(nextSlots, skins);
    showToast('SKIN', `${targetSkin.name}`);
  };

  // Toggle Card Element Visibility in STUDIO
  const toggleSlotElement = (
    key:
      | 'showScore'
      | 'showProsCons'
      | 'showLocation'
      | 'showSignature'
      | 'showGrain'
  ) => {
    haptic.snap();
    const nextSlots = presetSlots.map((slot, idx) =>
      idx === activeSlotIdx
        ? { ...slot, [key]: slot[key] === false ? true : false }
        : slot
    );
    setPresetSlots(nextSlots);
    syncPresetsToServer(nextSlots, skins);
  };

  return (
    <div className="min-h-screen p-4 md:px-8 md:py-5 select-none flex flex-col">
      <div className="max-w-[1340px] w-full mx-auto flex-1 flex flex-col">
        {/* ==========================================
            1. HEADER: "L2." LEFT, [+ LOG] FIRST & DEFAULT SELECTED
           ========================================== */}
        <header className="relative flex items-center justify-between pb-3 mb-3.5 border-b border-[var(--line)] shrink-0">
          <button
            onClick={() => {
              haptic.snap();
              setActiveTab('log');
            }}
            className="cursor-pointer display-type text-3xl sm:text-4xl md:text-5xl tracking-tighter text-left active:scale-95 transition-transform"
          >
            L2<span className="text-[var(--accent)]">.</span>
          </button>

          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
            {(
              [
                { id: 'log', label: '+ LOG' },
                { id: 'archive', label: 'ARCHIVE' },
                { id: 'card', label: 'CARD' },
                { id: 'studio', label: 'STUDIO' },
              ] as { id: TabId; label: string }[]
            ).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    haptic.snap();
                    setActiveTab(tab.id);
                  }}
                  className={`px-2.5 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs md:text-sm font-black tracking-tight transition-all border whitespace-nowrap cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]'
                      : 'border-[var(--line)] text-[var(--muted)] hover:text-[var(--fg)]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}

            {/* Settings Trigger */}
            <div className="relative ml-0.5 sm:ml-1">
              <button
                onClick={() => setSettingsOpen((prev) => !prev)}
                aria-label="Settings"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[var(--line)] bg-[var(--surface)] flex items-center justify-center transition-all hover:opacity-80 cursor-pointer"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>

              {settingsOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-2xl z-50 space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
                    <span className="display-type text-lg">SETTINGS</span>
                    <button
                      onClick={() => setSettingsOpen(false)}
                      className="text-xs font-black opacity-60 hover:opacity-100 cursor-pointer"
                    >
                      CLOSE ✕
                    </button>
                  </div>

                  {/* DISPLAY MODE */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-black tracking-widest uppercase text-[var(--muted)]">
                      DISPLAY MODE
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setIsLight(false)}
                        className={`py-2 rounded-xl text-xs font-black border cursor-pointer ${
                          !isLight
                            ? 'bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]'
                            : 'border-[var(--line)] text-[var(--muted)]'
                        }`}
                      >
                        DARK
                      </button>
                      <button
                        onClick={() => setIsLight(true)}
                        className={`py-2 rounded-xl text-xs font-black border cursor-pointer ${
                          isLight
                            ? 'bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]'
                            : 'border-[var(--line)] text-[var(--muted)]'
                        }`}
                      >
                        LIGHT
                      </button>
                    </div>
                  </div>

                  {/* CARD SIGNATURE */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-black tracking-widest uppercase text-[var(--muted)]">
                      CARD SIGNATURE
                    </div>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => {
                        const val = e.target.value || 'L2. ARCHIVE';
                        setAuthorName(val);
                        syncPresetsToServer(presetSlots, skins, val);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-transparent focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  {/* DEVICE RECOVERY CODE */}
                  <div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black tracking-widest uppercase text-[var(--muted)]">
                        DEVICE RECOVERY CODE
                      </span>
                      <button
                        onClick={async () => {
                          if (!recoveryCode) return;
                          try {
                            await navigator.clipboard.writeText(recoveryCode);
                            showToast('COPIED', '복구 코드가 클립보드에 복사되었습니다');
                          } catch {
                            showToast('CODE', recoveryCode);
                          }
                        }}
                        className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--line)] hover:border-[var(--accent)] cursor-pointer"
                      >
                        복사 (COPY)
                      </button>
                    </div>
                    <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] mono-num text-xs font-black tracking-wider text-[var(--accent)] text-center">
                      {recoveryCode || '발급 중...'}
                    </div>
                    <p className="text-[10px] leading-tight text-[var(--muted)]">
                      홈 화면 앱 추가나 기기 변경 시 이 코드로 기록을 즉시 불러올 수 있습니다.
                    </p>
                  </div>

                  {/* DETECTED PREVIOUS DEVICE CODE */}
                  {detectedPreviousCode && (
                    <div className="p-2.5 rounded-xl border border-[var(--accent)] bg-[var(--surface-2)] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black text-[var(--accent)] uppercase tracking-wider">
                          이전 기기 발견
                        </div>
                        <div className="text-xs font-black mono-num truncate">
                          {detectedPreviousCode}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestoreDevice(detectedPreviousCode)}
                        disabled={isRestoring}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-[var(--accent)] text-white hover:opacity-90 shrink-0 cursor-pointer"
                      >
                        {isRestoring ? '...' : '복구하기'}
                      </button>
                    </div>
                  )}

                  {/* RESTORE FROM CODE */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-black tracking-widest uppercase text-[var(--muted)]">
                      RESTORE FROM CODE
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={restoreCodeInput}
                        onChange={(e) => setRestoreCodeInput(e.target.value)}
                        placeholder="L2-XXXX-XXXX"
                        className="flex-1 min-w-0 px-3 py-1.5 rounded-xl text-xs mono-num uppercase font-bold border border-[var(--line)] bg-transparent focus:outline-none focus:border-[var(--accent)]"
                      />
                      <button
                        onClick={() => handleRestoreDevice()}
                        disabled={isRestoring}
                        className="px-3 py-1.5 rounded-xl text-xs font-black bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 shrink-0 cursor-pointer"
                      >
                        {isRestoring ? '...' : '불러오기'}
                      </button>
                    </div>
                  </div>

                  {/* AI QUOTA STATUS */}
                  <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[var(--muted)]">오늘 무료 AI 사용량</span>
                    <span className="font-black mono-num text-[var(--accent)]">
                      {aiUsage.used} / {aiUsage.limit}회
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ==========================================
            DEFAULT VIEW: + LOG (FULL-SCREEN MEMO CANVAS + TRANSLUCENT OVERLAY)
           ========================================== */}
        {activeTab === 'log' && (
          <main className="flex-1 flex flex-col relative min-h-[calc(100vh-88px)]">
            <div className="flex-1 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6 md:p-8 flex flex-col justify-between gap-3.5 sm:gap-5 shadow-2xl relative overflow-hidden">
              {/* 1. TITLE INPUT + ACTIVE OPTION SUMMARY BADGES */}
              <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5 shrink-0">
                <input
                  type="text"
                  value={logTitle}
                  onChange={(e) => setLogTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="flex-1 min-w-0 bg-transparent display-type text-3xl sm:text-4xl md:text-6xl focus:outline-none tracking-tight"
                />
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setFocusedOptionRow('score');
                      setOptionsModalOpen(true);
                    }}
                    className="cursor-pointer px-2.5 py-1 rounded-full text-[11px] font-black bg-[var(--accent)] text-white"
                  >
                    ★ {logScore.toFixed(1)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFocusedOptionRow('address');
                      setOptionsModalOpen(true);
                    }}
                    className="cursor-pointer px-2.5 py-1 rounded-full text-[11px] font-bold border border-[var(--line)] text-[var(--muted)]"
                  >
                    {selectedPlace?.short || '위치 미지정'}
                  </button>
                </div>
              </div>

              {/* 2. FULL-SCREEN PROPORTION PHOTO + CONTENT AREA */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-6 min-h-[420px]">
                {/* Left / Top 7 Cols: Generous Photo Frame or No-Photo Canvas */}
                <div
                  onPointerDown={logHasPhoto ? handleLogPhotoPointerDown : undefined}
                  onPointerMove={logHasPhoto ? handleLogPhotoPointerMove : undefined}
                  onPointerUp={logHasPhoto ? handleLogPhotoPointerUp : undefined}
                  onPointerCancel={logHasPhoto ? handleLogPhotoPointerUp : undefined}
                  className={`lg:col-span-7 relative rounded-2xl overflow-hidden border border-[var(--line)] bg-[var(--bg)] group min-h-[345px] sm:min-h-[350px] lg:min-h-full select-none ${
                    logHasPhoto ? 'cursor-ns-resize' : ''
                  }`}
                >
                  {/* Photo / No-Photo Mode Pill Switcher (Top Left) */}
                  <div className="absolute top-3.5 left-3.5 z-20 flex items-center bg-black/70 backdrop-blur-md p-1 rounded-full border border-white/15 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        haptic.snap();
                        setLogHasPhoto(true);
                      }}
                      className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wider transition-all cursor-pointer ${
                        logHasPhoto
                          ? 'bg-[#FF3B00] text-white shadow-sm'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      📷 사진 첨부
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        haptic.snap();
                        setLogHasPhoto(false);
                      }}
                      className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wider transition-all cursor-pointer ${
                        !logHasPhoto
                          ? 'bg-[#FF3B00] text-white shadow-sm'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      ✍️ 사진 없음
                    </button>
                  </div>

                  {logHasPhoto ? (
                    <>
                      <img
                        src={logImg}
                        alt="Uploaded preview"
                        draggable={false}
                        style={{ objectPosition: `${logCropX}% ${logCropY}%` }}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/25 pointer-events-none" />

                      <div className="absolute top-3.5 right-3.5 flex items-center gap-2 z-10">
                        <div className="hidden sm:flex items-center gap-1 bg-black/60 backdrop-blur px-2 py-1 rounded-full border border-white/15">
                          {SAMPLE_PHOTOS.map((sp) => (
                            <button
                              key={sp.key}
                              type="button"
                              onClick={() => {
                                setLogImg(sp.url);
                                setLogCropX(50);
                                setLogCropY(50);
                              }}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black cursor-pointer ${
                                logImg === sp.url
                                  ? 'bg-[#FF3B00] text-white'
                                  : 'text-white/75 hover:text-white'
                              }`}
                            >
                              {sp.label}
                            </button>
                          ))}
                        </div>

                        <label className="px-3.5 py-1.5 rounded-full text-[11px] font-black tracking-wider uppercase bg-black/75 text-white backdrop-blur hover:bg-[#FF3B00] transition-colors cursor-pointer">
                          + PHOTO UPLOAD
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="absolute bottom-3 left-3.5 pointer-events-none">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/55 text-white/85 backdrop-blur">
                          ↕ DRAG PHOTO TO ADJUST FOCUS
                        </span>
                      </div>
                    </>
                  ) : (
                    /* Elegant Graphic Layout Canvas for No-Photo Mode */
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none guilloche-pattern">
                      <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/15 flex items-center justify-center mb-3 shadow-xl backdrop-blur-md">
                        <span className="display-type text-2xl text-[#FF3B00]">✍️</span>
                      </div>
                      <h4 className="apple-wave-text kor-heavy text-2xl sm:text-3xl mb-1.5 tracking-tight">
                        사진 무첨부 텍스트 모드
                      </h4>
                      <p className="text-xs sm:text-sm font-semibold text-[var(--muted)] max-w-sm leading-relaxed mb-4">
                        사진이 없어도 여권 비자 스탬프, 33⅓ 바이닐 LP, 도서관 대출 카드, 스위스 타이포그래피 등 특화 디자인으로 완벽한 카드가 생성됩니다.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] mono-num font-black">
                        <span className="px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-amber-400">
                          ✈️ PASSPORT
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-[#FF3B00]">
                          🎵 VINYL LP
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-cyan-400">
                          📚 LIBRARY INDEX
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-emerald-400">
                          🇨🇭 SWISS BROADSIDE
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right / Bottom 5 Cols: Tactile Memo Content Area filling the height */}
                <div className="lg:col-span-5 flex flex-col">
                  <textarea
                    value={logBody}
                    onChange={(e) => setLogBody(e.target.value)}
                    placeholder="내용을 자유롭게 메모하세요..."
                    className="memo-body-textarea flex-1 w-full bg-[var(--bg)] text-base sm:text-lg md:text-2xl p-4 sm:p-5 rounded-2xl border border-[var(--line)] focus:outline-none transition-colors focus:border-[#FF3B00] resize-none min-h-[210px] font-semibold"
                  />
                </div>
              </div>

              {/* 3. BOTTOM ACTION BAR: [+ 추가 옵션] LEFT | [SAVE LOG →] RIGHT */}
              <div className="flex items-center justify-between gap-3 pt-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setOptionsModalOpen(true)}
                  className="px-5 py-3.5 sm:px-6 sm:py-4 rounded-2xl display-type text-base sm:text-lg md:text-2xl tracking-tight border border-[var(--line)] bg-[var(--bg)] transition-all hover:border-[#FF3B00] flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <span className="text-[var(--accent)]">+</span> 추가 옵션
                </button>

                <button
                  type="button"
                  onClick={handleInitiateSave}
                  disabled={isSaving}
                  className="flex-1 py-3.5 sm:py-4 px-6 rounded-2xl display-type text-lg sm:text-xl md:text-2xl tracking-tight text-white bg-[var(--accent)] transition-all hover:opacity-90 text-center whitespace-nowrap cursor-pointer"
                >
                  {isSaving
                    ? 'SAVING...'
                    : editingLogId
                    ? 'UPDATE LOG →'
                    : 'SAVE LOG →'}
                </button>
              </div>

              {/* ========================================================
                  SEMI-TRANSPARENT OVERLAY MODAL FOR [+ 추가 옵션]
                  Appears directly over the memo canvas with 1 stylish row per option!
                 ======================================================== */}
              {optionsModalOpen && (
                <div className="absolute inset-0 z-30 option-overlay-backdrop p-4 sm:p-6 md:p-10 flex flex-col justify-between overflow-y-auto">
                  {/* Overlay Header */}
                  <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                    <div className="flex items-baseline gap-2.5">
                      <h3 className="display-type text-2xl sm:text-3xl md:text-5xl">
                        OPTIONS<span className="text-[var(--accent)]">.</span>
                      </h3>
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                        SELECT DETAILS
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOptionsModalOpen(false)}
                      className="px-4 py-1.5 rounded-full text-[11px] font-black tracking-widest uppercase border bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)] cursor-pointer"
                    >
                      DONE ✓
                    </button>
                  </div>

                  {/* 1-Row-Per-Option Editorial Stack */}
                  <div className="divide-y divide-[var(--line)] my-auto py-1">
                    {/* ROW 01: 주소 추가 (지도 API 연동 검색) */}
                    <div className="py-2.5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-baseline gap-3 md:w-56 shrink-0">
                        <span className="display-type text-lg sm:text-2xl opacity-40">
                          01
                        </span>
                        <span className="kor-heavy text-xl sm:text-2xl md:text-3xl">
                          주소 추가
                        </span>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2">
                          <input
                            type="text"
                            value={logMapQuery}
                            onFocus={() => setMapDropdownOpen(true)}
                            onChange={(e) => {
                              setLogMapQuery(e.target.value);
                              setMapDropdownOpen(true);
                            }}
                            placeholder="지도 API 장소 검색 (상호명 또는 동네 입력)..."
                            className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-bold focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setMapDropdownOpen((prev) => !prev)
                            }
                            className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 bg-[var(--accent)] text-white cursor-pointer"
                          >
                            MAP API
                          </button>
                        </div>
                        {mapDropdownOpen && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1">
                            {placeResults.slice(0, 6).map((p) => (
                              <button
                                key={p.id || p.name}
                                type="button"
                                onClick={() => {
                                  setSelectedPlace(p);
                                  setLogTitle(p.name.replace(/\s*\(.*\)$/, ''));
                                  setLogMapQuery(
                                    `${p.short} (${p.fullAddress || p.short})`
                                  );
                                  if (p.category) setLogCat(p.category);
                                  if (p.posterImg) {
                                    setLogImg(p.posterImg);
                                    showToast(
                                      'POSTER LOADED',
                                      `${p.name} 공식 포스터가 카드 사진으로 적용되었습니다`
                                    );
                                  }
                                  setMapDropdownOpen(false);
                                }}
                                className="p-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-left text-xs font-bold hover:border-[#FF3B00] cursor-pointer truncate"
                              >
                                {p.source === 'TMDB' ? '🎬 ' : ''}{p.name} · {p.short}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ROW 02: 평점 추가 (0.1 단위 드래그 게이지) */}
                    <div className="py-2.5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-baseline gap-3 md:w-56 shrink-0">
                        <span className="display-type text-lg sm:text-2xl opacity-40">
                          02
                        </span>
                        <span className="kor-heavy text-xl sm:text-2xl md:text-3xl">
                          평점 추가
                        </span>
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        <div
                          ref={scoreTrackRef}
                          onPointerDown={(e) => {
                            e.currentTarget.setPointerCapture(e.pointerId);
                            updateScoreFromClientX(e.clientX);
                          }}
                          onPointerMove={(e) => {
                            if (e.buttons === 1) {
                              updateScoreFromClientX(e.clientX);
                            }
                          }}
                          className="relative h-9 flex-1 rounded-full bg-white/10 border border-[var(--line)] overflow-hidden cursor-ew-resize touch-none"
                        >
                          <div
                            style={{ width: `${(logScore / 5) * 100}%` }}
                            className="h-full bg-[var(--accent)] rounded-full transition-all duration-75"
                          />
                        </div>
                        <span className="display-type text-3xl sm:text-4xl md:text-5xl w-16 text-right text-[var(--accent)]">
                          {logScore.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* ROW 03: 장점 추가 (GOOD) */}
                    <div className="py-2.5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-baseline gap-3 md:w-56 shrink-0">
                        <span className="display-type text-lg sm:text-2xl opacity-40">
                          03
                        </span>
                        <span className="kor-heavy text-xl sm:text-2xl md:text-3xl text-[var(--accent)]">
                          장점 추가
                        </span>
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={logGood}
                          onChange={(e) => setLogGood(e.target.value)}
                          placeholder="좋았던 점 (비워두면 본문에서 AI가 자동 인식합니다)"
                          className="w-full px-3.5 py-2 sm:py-2.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] font-bold text-xs sm:text-sm focus:outline-none focus:border-[#FF3B00]"
                        />
                      </div>
                    </div>

                    {/* ROW 04: 단점 추가 (BAD) */}
                    <div className="py-2.5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-baseline gap-3 md:w-56 shrink-0">
                        <span className="display-type text-lg sm:text-2xl opacity-40">
                          04
                        </span>
                        <span className="kor-heavy text-xl sm:text-2xl md:text-3xl">
                          단점 추가
                        </span>
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={logBad}
                          onChange={(e) => setLogBad(e.target.value)}
                          placeholder="아쉬웠던 점 (선택 입력)"
                          className="w-full px-3.5 py-2 sm:py-2.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] font-bold text-xs sm:text-sm focus:outline-none focus:border-[#FF3B00]"
                        />
                      </div>
                    </div>

                    {/* ROW 05: 특이사항 (NOTE) */}
                    <div className="py-2.5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-baseline gap-3 md:w-56 shrink-0">
                        <span className="display-type text-lg sm:text-2xl opacity-40">
                          05
                        </span>
                        <span className="kor-heavy text-xl sm:text-2xl md:text-3xl">
                          특이사항
                        </span>
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={logNote}
                          onChange={(e) => setLogNote(e.target.value)}
                          placeholder="웨이팅 팁, 예약 여부 등 특이사항 (비워두면 본문에서 AI 자동 인식)"
                          className="w-full px-3.5 py-2 sm:py-2.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] font-bold text-xs sm:text-sm focus:outline-none focus:border-[#FF3B00]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Overlay Footer */}
                  <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold leading-tight text-[var(--muted)]">
                      미입력 항목은 본문에서 AI가 자동 인식합니다.
                    </span>
                    <button
                      type="button"
                      onClick={() => setOptionsModalOpen(false)}
                      className="px-6 py-2.5 rounded-2xl display-type text-base sm:text-xl text-white bg-[var(--accent)] shrink-0 cursor-pointer"
                    >
                      APPLY OPTIONS ✓
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================
                  MANDATORY CATEGORY SELECTION MODAL BEFORE SAVE LOG
                 ======================================================== */}
              {categoryModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="w-full max-w-[480px] bg-[var(--surface)] border border-[var(--line)] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                      <div>
                        <span className="mono-num text-[11px] font-black tracking-widest uppercase text-[var(--accent)]">
                          CATEGORY · MANDATORY
                        </span>
                        <h2 className="display-type text-2xl sm:text-3xl mt-0.5">
                          SELECT CATEGORY
                        </h2>
                        <p className="text-xs font-bold text-[var(--muted)] mt-1">
                          기록의 카테고리를 선택하면 즉시 카드가 완성됩니다
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCategoryModalOpen(false)}
                        className="w-8 h-8 rounded-full border border-[var(--line)] flex items-center justify-center text-sm font-black hover:border-[var(--fg)] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {(
                        [
                          {
                            id: 'DINING' as ArchiveCategory,
                            icon: '🍽️',
                            title: 'DINING',
                            sub: '미식 · 맛집 · 카페 · 와인바',
                            desc: '식사, 음료, 디저트의 미식 기록',
                          },
                          {
                            id: 'CINEMA' as ArchiveCategory,
                            icon: '🎬',
                            title: 'CINEMA',
                            sub: '영화 · 상영작 · 극장',
                            desc: '영화 관람 및 시네마틱 감상 기록',
                          },
                          {
                            id: 'ART' as ArchiveCategory,
                            icon: '🏛️',
                            title: 'ART',
                            sub: '전시 · 미술관 · 복합공간',
                            desc: '현대미술, 갤러리, 건축 공간 기록',
                          },
                        ] as const
                      ).map((item) => {
                        const isSelected = logCat === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSaveLogWithCat(item.id)}
                            disabled={isSaving}
                            className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98] ${
                              isSelected
                                ? 'border-[var(--accent)] bg-[var(--bg)] shadow-md ring-2 ring-[var(--accent)]/40'
                                : 'border-[var(--line)] bg-[var(--surface)] hover:border-[var(--fg)] hover:bg-[var(--bg)]'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <span className="text-3xl sm:text-4xl shrink-0">
                                {item.icon}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="display-type text-lg sm:text-xl">
                                    {item.title}
                                  </span>
                                  {isSelected && (
                                    <span className="mono-num text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[var(--accent)] text-white">
                                      CURRENT
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-bold text-[var(--fg)] opacity-90 truncate">
                                  {item.sub}
                                </div>
                                <div className="text-[11px] text-[var(--muted)] font-medium mt-0.5 truncate">
                                  {item.desc}
                                </div>
                              </div>
                            </div>
                            <span className="mono-num text-xs font-black text-[var(--accent)] group-hover:translate-x-1 transition-transform shrink-0 pl-2">
                              {isSaving ? '저장 중...' : '저장 →'}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => setCategoryModalOpen(false)}
                        className="text-xs font-bold text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                      >
                        돌아가서 계속 수정하기
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        )}

        {/* ==========================================
            VIEW 1: ARCHIVE
           ========================================== */}
        {activeTab === 'archive' && (
          <main className="space-y-4">
            {archives.length === 0 ? (
              <div className="py-24 sm:py-36 flex flex-col items-center justify-center text-center px-4 rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-xl">
                <div className="w-16 h-16 rounded-3xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center mb-6 shadow-2xl">
                  <span className="display-type text-3xl text-[var(--accent)]">+</span>
                </div>
                <h3 className="apple-wave-text kor-heavy text-3xl sm:text-4xl md:text-5xl tracking-tight mb-3">
                  로그를 시작해보세요!
                </h3>
                <p className="text-sm sm:text-base font-semibold text-[var(--muted)] max-w-md leading-relaxed mb-8">
                  기억하고 싶은 장소와 순간의 인상적인 한 줄을 남기면<br className="hidden sm:inline" />
                  나만의 감각적인 에디토리얼 카드가 완성됩니다.
                </p>

                {detectedPreviousCode && (
                  <div className="mb-6 p-3.5 sm:p-4 rounded-2xl border border-[var(--accent)] bg-[var(--surface-2)] flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left max-w-md shadow-lg">
                    <div className="flex-1">
                      <div className="text-[11px] font-black text-[var(--accent)] uppercase tracking-wider">
                        이전 기기 아카이브 복구 가능
                      </div>
                      <div className="text-xs font-bold opacity-80 mt-0.5">
                        기존 코드 <span className="mono-num text-[var(--fg)] font-black">{detectedPreviousCode}</span>의 기록을 바로 불러올 수 있습니다.
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestoreDevice(detectedPreviousCode)}
                      disabled={isRestoring}
                      className="px-4 py-1.5 rounded-full text-xs font-black bg-[var(--accent)] text-white hover:opacity-90 shrink-0 cursor-pointer shadow-md"
                    >
                      {isRestoring ? '복구 중...' : '기록 복구하기'}
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setActiveTab('log')}
                  className="px-7 py-3.5 rounded-full display-type text-base text-white bg-[var(--accent)] hover:opacity-90 transition-all cursor-pointer shadow-xl hover:scale-105"
                >
                  + LOG 작성하기 →
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                  {/* Left: Big Typographic Category Filters */}
                  <div className="flex items-baseline justify-between sm:justify-start gap-3 sm:gap-6 overflow-x-auto">
                    {(
                      [
                        { id: 'ALL', label: 'ALL', count: archives.length },
                        {
                          id: 'DINING',
                          label: 'DINING',
                          count: archives.filter((a) => a.cat === 'DINING').length,
                        },
                        {
                          id: 'CINEMA',
                          label: 'CINEMA',
                          count: archives.filter((a) => a.cat === 'CINEMA').length,
                        },
                        {
                          id: 'ART',
                          label: 'ART',
                          count: archives.filter((a) => a.cat === 'ART').length,
                        },
                      ] as const
                    ).map((cat) => {
                      const active = filterCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setFilterCategory(cat.id)}
                          className={`display-type text-2xl sm:text-3xl md:text-4xl transition-opacity whitespace-nowrap cursor-pointer ${
                            active ? 'opacity-100' : 'opacity-35 hover:opacity-100'
                          }`}
                        >
                          {cat.label}{' '}
                          <sup
                            className={`text-[10px] font-bold ${
                              active ? 'text-[var(--accent)]' : ''
                            }`}
                          >
                            {String(cat.count).padStart(2, '0')}
                          </sup>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right: Connected Control Dock */}
                  <div className="flex items-center justify-end">
                    <div className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1.5 gap-1.5">
                      <div className="flex items-center px-2.5 py-1 gap-1.5 flex-1 sm:flex-initial">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          className="text-[var(--muted)]"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="SEARCH"
                          className="bg-transparent text-[11px] font-black tracking-wider uppercase w-20 sm:w-28 focus:outline-none"
                        />
                      </div>

                      <button
                        onClick={() =>
                          setSortOrder((prev) =>
                            prev === 'desc' ? 'asc' : 'desc'
                          )
                        }
                        className="px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase transition-all hover:opacity-80 whitespace-nowrap cursor-pointer"
                      >
                        {sortOrder === 'desc' ? '최신순 ↓' : '오래된순 ↑'}
                      </button>

                      <button
                        onClick={() => setSelectMode((prev) => !prev)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
                          selectMode
                            ? 'bg-[var(--accent)] text-white'
                            : 'text-[var(--muted)]'
                        }`}
                      >
                        {selectMode ? `SELECT (${selectedIds.length})` : 'SELECT'}
                      </button>

                      <div className="w-full sm:w-auto flex items-center justify-between gap-1 pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--line)]">
                        {(['poster', 'index', 'map'] as ArchiveViewMode[]).map(
                          (mode) => (
                            <button
                              key={mode}
                              onClick={() => setArchiveView(mode)}
                              className={`flex-1 sm:flex-initial px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase transition-all text-center cursor-pointer ${
                                archiveView === mode
                                  ? 'bg-[var(--fg)] text-[var(--bg)]'
                                  : 'text-[var(--muted)]'
                              }`}
                            >
                              {mode}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {selectMode && (
                  <div className="p-3.5 rounded-2xl border border-[var(--accent)] bg-[var(--surface)] flex items-center justify-between gap-3">
                    <div className="flex items-baseline gap-2.5">
                      <span className="display-type text-2xl text-[var(--accent)]">
                        {String(selectedIds.length).padStart(2, '0')}
                      </span>
                      <input
                        type="text"
                        value={curationTitle}
                        onChange={(e) => setCurationTitle(e.target.value)}
                        className="kor-heavy text-sm md:text-lg bg-transparent border-b border-[var(--line)] focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setActiveSlotIdx(3);
                        setActiveTab('card');
                      }}
                      className="px-4 py-2 rounded-full text-[11px] font-black tracking-wider uppercase text-white bg-[var(--accent)] cursor-pointer shrink-0"
                    >
                      CREATE LIST CARD →
                    </button>
                  </div>
                )}

                {/* 1. POSTER GRID VIEW */}
                {archiveView === 'poster' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredArchives.map((item) => {
                      const picked = selectedIds.includes(item.id);
                      return (
                        <article
                          key={item.id}
                          onClick={() => {
                            if (selectMode) {
                              setSelectedIds((prev) =>
                                prev.includes(item.id)
                                  ? prev.filter((id) => id !== item.id)
                                  : [...prev, item.id]
                              );
                              return;
                            }
                            setActiveItemId(item.id);
                            setActiveTab('card');
                          }}
                          className={`group cursor-pointer rounded-3xl overflow-hidden border relative h-[315px] sm:h-[440px] flex flex-col justify-between transition-all ${
                            selectMode && picked
                              ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]'
                              : 'border-[var(--line)]'
                          }`}
                        >
                          <img
                            src={item.img}
                            alt={item.title}
                            style={{
                              objectPosition: `${item.cropX}% ${item.cropY}%`,
                            }}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/25" />

                          <div className="relative z-10 p-5 sm:p-6 flex items-start justify-between text-white">
                            <div className="space-y-1">
                              <span className="display-type text-xl sm:text-2xl opacity-60">
                                {item.num}
                              </span>
                              <div className="text-[11px] sm:text-xs font-black tracking-widest uppercase opacity-80">
                                {item.sub}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="display-type text-4xl md:text-5xl text-white">
                                {item.score}
                              </span>
                              {selectMode && (
                                <span
                                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-black text-xs ${
                                    picked
                                      ? 'bg-[#FF3B00] text-white'
                                      : 'bg-white/20 text-white'
                                  }`}
                                >
                                  {picked ? '✓' : '+'}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="relative z-10 p-5 sm:p-6 space-y-2 text-white">
                            <h2 className="kor-heavy text-3xl sm:text-4xl md:text-5xl tracking-tight leading-none group-hover:text-[#FF3B00] transition-colors">
                              {item.title}
                            </h2>
                            <p className="font-bold text-sm sm:text-base md:text-lg text-white/90 line-clamp-2 max-w-xl">
                              “{item.quote}”
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {/* 2. INDEX VIEW */}
                {archiveView === 'index' && (
                  <div className="border-t border-[var(--line)]">
                    {filteredArchives.map((item, idx) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setActiveItemId(item.id);
                          setActiveTab('card');
                        }}
                        className="group cursor-pointer py-5 border-b border-[var(--line)] flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 transition-all hover:pl-3"
                      >
                        <div className="flex items-baseline gap-5 flex-wrap">
                          <span className="display-type text-xl md:text-2xl opacity-35">
                            0{idx + 1}
                          </span>
                          <h3 className="kor-heavy text-3xl md:text-5xl group-hover:text-[#FF3B00] transition-colors">
                            {item.title}
                          </h3>
                          <span className="text-sm md:text-base font-bold mono-num text-[var(--muted)]">
                            {item.date}
                          </span>
                          {item.addressShort && (
                            <span className="text-sm md:text-base font-bold opacity-75">
                              {item.addressShort}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. MAP VIEW */}
                {archiveView === 'map' && (
                  <div className="space-y-4">
                    <div className="rounded-3xl overflow-hidden border border-[var(--line)] bg-[var(--surface)] relative h-[300px] sm:h-[380px] flex flex-col justify-between">
                      <iframe
                        title="L2 Google Maps"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(
                          `${activeItem.title} ${activeItem.addressShort}`
                        )}&t=m&z=15&output=embed&iwloc=near`}
                        className="w-full h-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />

                      {/* Floating Spot Selector Pills on top of Google Maps */}
                      <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center gap-2 overflow-x-auto pb-1">
                        {filteredArchives.map((item) => {
                          const isFocused = item.id === activeItem.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => setActiveItemId(item.id)}
                              className={`px-3.5 py-2 rounded-full font-black text-xs shadow-xl shrink-0 flex items-center gap-2 transition-all cursor-pointer ${
                                isFocused
                                  ? 'bg-[#FF3B00] text-white'
                                  : 'bg-black/80 text-white backdrop-blur hover:bg-black'
                              }`}
                            >
                              <span>{item.title}</span>
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveItemId(item.id);
                                  setActiveTab('card');
                                }}
                                className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] hover:bg-white hover:text-black"
                              >
                                CARD →
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-[var(--line)]">
                      {filteredArchives.map((item, idx) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setActiveItemId(item.id);
                            setActiveTab('card');
                          }}
                          className="group cursor-pointer py-5 border-b border-[var(--line)] flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 transition-all hover:pl-3"
                        >
                          <div className="flex items-baseline gap-5 flex-wrap">
                            <span className="display-type text-xl md:text-2xl opacity-35">
                              0{idx + 1}
                            </span>
                            <h3 className="kor-heavy text-3xl md:text-5xl group-hover:text-[#FF3B00] transition-colors">
                              {item.title}
                            </h3>
                            <span className="text-sm md:text-base font-bold mono-num text-[var(--muted)]">
                              {item.date}
                            </span>
                            <span className="text-sm md:text-base font-bold opacity-75">
                              {item.addressShort}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        )}

        {/* ==========================================
            VIEW 2: CARD (THE SHARE ENGINE + STICKY-TO-INLINE SHARE BAR)
           ========================================== */}
        {activeTab === 'card' && (
          <main>
            {archives.length === 0 ? (
              <div className="py-24 sm:py-36 flex flex-col items-center justify-center text-center px-4 rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-xl">
                <div className="w-16 h-16 rounded-3xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center mb-6 shadow-2xl">
                  <span className="display-type text-3xl text-[var(--accent)]">✦</span>
                </div>
                <h3 className="apple-wave-text kor-heavy text-3xl sm:text-4xl md:text-5xl tracking-tight mb-3">
                  아직 생성된 카드가 없습니다
                </h3>
                <p className="text-sm sm:text-base font-semibold text-[var(--muted)] max-w-md leading-relaxed mb-8">
                  + LOG에서 첫 번째 경험을 기록하면 인스타그램과 카카오톡에<br className="hidden sm:inline" />
                  공유할 수 있는 감각적인 카드가 바로 생성됩니다.
                </p>

                {detectedPreviousCode && (
                  <div className="mb-6 p-3.5 sm:p-4 rounded-2xl border border-[var(--accent)] bg-[var(--surface-2)] flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left max-w-md shadow-lg">
                    <div className="flex-1">
                      <div className="text-[11px] font-black text-[var(--accent)] uppercase tracking-wider">
                        이전 기기 아카이브 복구 가능
                      </div>
                      <div className="text-xs font-bold opacity-80 mt-0.5">
                        기존 코드 <span className="mono-num text-[var(--fg)] font-black">{detectedPreviousCode}</span>의 기록을 바로 불러올 수 있습니다.
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestoreDevice(detectedPreviousCode)}
                      disabled={isRestoring}
                      className="px-4 py-1.5 rounded-full text-xs font-black bg-[var(--accent)] text-white hover:opacity-90 shrink-0 cursor-pointer shadow-md"
                    >
                      {isRestoring ? '복구 중...' : '기록 복구하기'}
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setActiveTab('log')}
                  className="px-7 py-3.5 rounded-full display-type text-base text-white bg-[var(--accent)] hover:opacity-90 transition-all cursor-pointer shadow-xl hover:scale-105"
                >
                  첫 카드 만들기 →
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
                  <div className="lg:col-span-6 flex flex-col items-center">
                    {/* Single-Row 4-Column Preset Bar: KAKAO, INSTA, TICKET, LIST */}
                    <div className="w-full max-w-[420px] grid grid-cols-4 gap-2 mb-3.5">
                      {presetSlots.map((slot, idx) => {
                        const active = idx === activeSlotIdx;
                        return (
                          <button
                            key={slot.id}
                            onClick={() => {
                              haptic.snap();
                              if (itemHasNoPhoto) {
                                const PHOTO_LAYOUTS: CardLayoutType[] = [
                                  'spec',
                                  'cover',
                                  'ticket',
                                  'curation',
                                  'receipt',
                                  'polaroid',
                                  'magazine',
                                ];
                                if (PHOTO_LAYOUTS.includes(slot.layout)) {
                                  showToast(
                                    'NO-PHOTO ARCHIVE',
                                    '사진이 없는 기록으로, 무첨부 전용 양식으로 표시됩니다'
                                  );
                                  const nextSlots = presetSlots.map((s, i) =>
                                    i === idx
                                      ? { ...s, layout: 'passport' as CardLayoutType }
                                      : s
                                  );
                                  setPresetSlots(nextSlots);
                                }
                              }
                              setActiveSlotIdx(idx);
                            }}
                            className={`py-2.5 px-2 rounded-full text-xs font-black tracking-wider uppercase border text-center truncate transition-all cursor-pointer active:scale-95 ${
                              active
                                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                                : 'border-[var(--line)] text-[var(--muted)] hover:text-[var(--fg)]'
                            }`}
                          >
                            {slot.name}
                          </button>
                        );
                      })}
                    </div>

                {/* Live Interactive Card Stage with Carousel Arrows */}
                <div className="relative w-full max-w-[440px] flex flex-col items-center">
                  <div className="relative w-full flex items-center justify-center">
                    {/* Left Carousel Arrow */}
                    <button
                      type="button"
                      onClick={() => handleCycleSkin('prev')}
                      aria-label="이전 스킨 (Previous Skin)"
                      title="이전 스킨"
                      className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[var(--surface)]/90 backdrop-blur-md border border-[var(--line)] shadow-xl text-[var(--fg)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
                    >
                      <svg
                        className="w-5 h-5 transition-transform group-hover:-translate-x-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <CardStage
                      item={activeItem}
                      slot={activeSlot}
                      skin={activeSkin}
                      authorName={authorName}
                      selectedItems={selectedArchiveItems}
                      curationTitle={curationTitle}
                      cardCaptureRef={cardCaptureRef}
                      onUpdateCrop={(cropX, cropY) => {
                        setArchives((prev) =>
                          prev.map((a) =>
                            a.id === activeItem.id ? { ...a, cropX, cropY } : a
                          )
                        );
                        fetch('/api/logs', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            id: activeItem.id,
                            cropX,
                            cropY,
                          }),
                        }).catch(() => {});
                      }}
                    />

                    {/* Right Carousel Arrow */}
                    <button
                      type="button"
                      onClick={() => handleCycleSkin('next')}
                      aria-label="다음 스킨 (Next Skin)"
                      title="다음 스킨"
                      className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[var(--surface)]/90 backdrop-blur-md border border-[var(--line)] shadow-xl text-[var(--fg)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
                    >
                      <svg
                        className="w-5 h-5 transition-transform group-hover:translate-x-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Active Palette Indicator Badge */}
                  <div className="mt-3.5 flex items-center gap-2">
                    <span className="text-[10px] mono-num tracking-wider uppercase px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[var(--muted)]">
                      PALETTE : <span className="text-[var(--fg)] font-bold">{activeSkin.name}</span> ({Object.keys(skins).indexOf(activeSkin.id) + 1}/{Object.keys(skins).length})
                    </span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-5 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black tracking-widest uppercase text-[var(--muted)]">
                      ARCHIVE ITEM
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditActiveItem(activeItem)}
                        className="px-3 py-1 rounded-full border border-[var(--line)] text-[11px] font-black hover:border-[var(--fg)] cursor-pointer"
                      >
                        수정 (EDIT)
                      </button>
                      <button
                        onClick={() => handleDeleteItem(activeItem.id)}
                        className="px-3 py-1 rounded-full border border-[var(--line)] text-[11px] font-black text-[var(--muted)] hover:text-[#FF3B00] hover:border-[#FF3B00] cursor-pointer"
                      >
                        삭제
                      </button>
                      <Link
                        href={`/share/${activeItem.id}`}
                        className="px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[11px] font-black text-[var(--accent)] hover:border-[var(--accent)]"
                      >
                        웹 공유링크 ↗
                      </Link>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {archives.map((a) => {
                      const active =
                        a.id === activeItem.id &&
                        activeSlot.layout !== 'curation';
                      return (
                        <button
                          key={a.id}
                          onClick={() => setActiveItemId(a.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            active
                              ? 'bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]'
                              : 'border-[var(--line)] text-[var(--muted)] hover:text-[var(--fg)]'
                          }`}
                        >
                          {a.title}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-black tracking-widest uppercase mb-2 text-[var(--muted)]">
                    RATIO
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(
                      [
                        { r: '3:4', label: 'KAKAO' },
                        { r: '1:1', label: 'INSTA' },
                        { r: '9:16', label: 'STORY' },
                      ] as const
                    ).map((opt) => {
                      const active = activeSlot.ratio === opt.r;
                      return (
                        <button
                          key={opt.r}
                          onClick={() => {
                            const nextSlots = presetSlots.map((slot, idx) =>
                              idx === activeSlotIdx
                                ? { ...slot, ratio: opt.r }
                                : slot
                            );
                            setPresetSlots(nextSlots);
                            syncPresetsToServer(nextSlots, skins);
                          }}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            active
                              ? 'border-[var(--accent)] text-[var(--fg)]'
                              : 'border-[var(--line)] text-[var(--muted)]'
                          }`}
                        >
                          <div className="display-type text-2xl md:text-4xl">
                            {opt.r}
                          </div>
                          <div className="text-[11px] font-bold tracking-wider uppercase mt-1 opacity-70">
                            {opt.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 rounded-3xl border border-[var(--line)] bg-[var(--surface)] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black tracking-widest uppercase text-[var(--accent)]">
                      KAKAOTALK LINK CLIPBOARD
                    </span>
                    <a
                      href={activeItem.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-black underline opacity-75 hover:opacity-100"
                    >
                      OPEN LINK ↗
                    </a>
                  </div>
                  <div className="font-bold text-sm md:text-lg leading-snug">
                    {activeItem.title} — “{activeItem.quote}”
                  </div>
                  <div className="text-xs mono-num truncate opacity-65">
                    {activeItem.link}
                  </div>
                </div>
              </div>
            </div>

            {/* STICKY-TO-INLINE 2-COLUMN SHARE BAR */}
            <div
              className={`share-dock-sticky mt-5 ${
                shareBarDocked ? 'is-docked' : 'is-floating'
              }`}
            >
              <div className="share-dock-inner">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleTriggerShare('KAKAO')}
                    className="py-3.5 px-4 rounded-2xl display-type text-base md:text-xl tracking-tight bg-[#FEE500] text-[#111111] hover:opacity-90 transition-all text-center whitespace-nowrap cursor-pointer shadow-lg"
                  >
                    KAKAOTALK →
                  </button>
                  <button
                    onClick={() => handleTriggerShare('INSTA')}
                    className="py-3.5 px-4 rounded-2xl display-type text-base md:text-xl tracking-tight text-white bg-[var(--accent)] hover:opacity-90 transition-all text-center whitespace-nowrap cursor-pointer shadow-lg"
                  >
                    INSTAGRAM →
                  </button>
                </div>
              </div>
            </div>
            <div ref={shareSentinelRef} className="h-2 w-full" />
              </>
            )}
          </main>
        )}

        {/* ==========================================
            VIEW 3: STUDIO
           ========================================== */}
        {activeTab === 'studio' && (
          <main>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
              <div className="lg:col-span-7 space-y-4 sm:space-y-6">
                <div className="flex items-baseline justify-between">
                  <h2 className="display-type text-3xl sm:text-4xl md:text-5xl">
                    STUDIO<span className="text-[var(--accent)]">.</span>
                  </h2>
                  <span className="text-[10px] font-black tracking-widest uppercase text-[var(--muted)]">
                    AI PRESET ENGINE
                  </span>
                </div>

                {/* 1. PRESET SLOTS */}
                <div>
                  <div className="text-[11px] font-black tracking-widest uppercase mb-1.5 text-[var(--muted)]">
                    PRESET SLOTS
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {presetSlots.map((slot, idx) => {
                      const active = idx === activeSlotIdx;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => {
                            haptic.snap();
                            setActiveSlotIdx(idx);
                          }}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer active:scale-95 ${
                            active
                              ? 'border-[var(--accent)] bg-[var(--surface)]'
                              : 'border-[var(--line)] opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div
                            className={`display-type text-xl ${
                              active ? 'text-[var(--accent)]' : ''
                            }`}
                          >
                            {slot.id}
                          </div>
                          <div className="font-black text-xs mt-1 truncate">
                            {slot.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. PALETTE & AI SKIN */}
                <div>
                  <div className="text-[11px] font-black tracking-widest uppercase mb-1.5 text-[var(--muted)]">
                    PALETTE &amp; AI SKIN
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    {Object.values(skins).map((sk) => {
                      const active = activeSlot.skinId === sk.id;
                      const isCustom = !INITIAL_SKINS[sk.id];
                      return (
                        <div
                          key={sk.id}
                          style={{
                            background: sk.bg,
                            borderColor: active ? '#FF3B00' : sk.border,
                          }}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-1 transition-all ${
                            active ? 'ring-2 ring-[#FF3B00]' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              haptic.snap();
                              const nextSlots = presetSlots.map((slot, idx) =>
                                idx === activeSlotIdx
                                  ? { ...slot, skinId: sk.id }
                                  : slot
                              );
                              setPresetSlots(nextSlots);
                              syncPresetsToServer(nextSlots, skins);
                            }}
                            style={{ color: sk.text }}
                            className="flex-1 min-w-0 text-left font-black text-[11px] truncate cursor-pointer active:scale-95"
                          >
                            {sk.name}
                          </button>
                          {isCustom && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSkin(sk.id);
                              }}
                              title={`${sk.name} 스킨 삭제`}
                              style={{ color: sk.text }}
                              className="w-4 h-4 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/25 text-[10px] font-black cursor-pointer shrink-0 transition-opacity active:scale-75"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={studioPrompt}
                      onChange={(e) => setStudioPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleGenerateAiSkin();
                        }
                      }}
                      placeholder="AI 무드 키워드 (예: 홍콩 네온, 제주 녹차, 여수 바다, 파리 로즈, 비우면 랜덤 생성)"
                      className="flex-1 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-[var(--line)] bg-transparent focus:outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      onClick={handleGenerateAiSkin}
                      disabled={isGeneratingSkin}
                      className="px-4 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase text-white bg-[var(--accent)] shrink-0 cursor-pointer"
                    >
                      {isGeneratingSkin ? '...' : 'AI SKIN'}
                    </button>
                  </div>
                </div>

                {/* 3. CARD LAYOUT STRUCTURE (PHOTO & NO-PHOTO SEGREGATION) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-[11px] font-black tracking-widest uppercase text-[var(--muted)]">
                      CARD STRUCTURE ({ALL_LAYOUTS.length})
                    </div>
                    {/* Category Filter Pills: All / Photo / No-Photo */}
                    <div className="flex items-center gap-1 bg-[var(--surface-2)] p-1 rounded-full border border-[var(--line)]">
                      {(
                        [
                          { id: 'ALL', label: '전체 (11)' },
                          { id: 'PHOTO', label: '📷 사진형 (7)' },
                          { id: 'NO_PHOTO', label: '✍️ 무첨부형 (4)' },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            haptic.snap();
                            setLayoutFilter(f.id);
                          }}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                            layoutFilter === f.id
                              ? 'bg-[var(--accent)] text-white shadow-sm'
                              : 'text-[var(--muted)] hover:text-[var(--fg)]'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Warning banner when active item has no photo */}
                  {itemHasNoPhoto && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold flex items-center gap-2">
                      <span className="text-base">✍️</span>
                      <span>
                        선택된 기록은 사진이 없어 <strong>무첨부 전용 양식</strong>(여권, LP, 도서관, 스위스)만 선택 가능합니다.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {ALL_LAYOUTS.filter((ly) => {
                      if (layoutFilter === 'PHOTO') return !ly.isNoPhoto;
                      if (layoutFilter === 'NO_PHOTO') return ly.isNoPhoto;
                      return true;
                    }).map((ly) => {
                      const active = activeSlot.layout === ly.id;
                      const disabled = itemHasNoPhoto && !ly.isNoPhoto;

                      return (
                        <button
                          key={ly.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            if (disabled) {
                              haptic.warning();
                              showToast(
                                'PHOTO REQUIRED',
                                '이 기록은 사진이 없어 사진 첨부형 양식을 사용할 수 없습니다'
                              );
                              return;
                            }
                            haptic.snap();
                            const nextSlots = presetSlots.map((slot, idx) =>
                              idx === activeSlotIdx
                                ? { ...slot, layout: ly.id, ratio: ly.ratio }
                                : slot
                            );
                            setPresetSlots(nextSlots);
                            syncPresetsToServer(nextSlots, skins);
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[78px] ${
                            disabled
                              ? 'opacity-40 cursor-not-allowed bg-[var(--surface-2)] border-[var(--line)]'
                              : active
                              ? 'bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)] shadow-lg ring-2 ring-[var(--accent)]/50'
                              : 'border-[var(--line)] bg-[var(--surface)] hover:border-[var(--fg)] text-[var(--fg)] cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="display-type text-sm sm:text-base tracking-tight truncate">
                              {ly.name}
                            </span>
                            <span
                              className={`mono-num text-[9px] font-black px-1.5 py-0.5 rounded ${
                                active
                                  ? 'bg-[var(--bg)] text-[var(--fg)]'
                                  : 'bg-[var(--line)] text-[var(--muted)]'
                              }`}
                            >
                              {ly.ratio}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-1">
                            <span
                              className={`text-[10px] font-semibold truncate ${
                                active ? 'opacity-90' : 'text-[var(--muted)]'
                              }`}
                            >
                              {ly.sub}
                            </span>
                            {disabled && (
                              <span className="mono-num text-[8px] font-black uppercase text-amber-500 shrink-0">
                                사진 필요
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. ELEMENTS VISIBILITY TOGGLES */}
                <div>
                  <div className="text-[11px] font-black tracking-widest uppercase mb-1.5 text-[var(--muted)]">
                    ELEMENTS
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { key: 'showScore', label: 'SCORE' },
                        { key: 'showProsCons', label: 'GOOD / NOTE' },
                        { key: 'showLocation', label: 'LOCATION' },
                        { key: 'showSignature', label: 'SIGNATURE' },
                        { key: 'showGrain', label: '35MM GRAIN' },
                      ] as const
                    ).map((el) => {
                      const on = activeSlot[el.key] !== false;
                      return (
                        <button
                          key={el.key}
                          onClick={() => toggleSlotElement(el.key)}
                          className={`px-3.5 py-2 rounded-full text-xs font-black uppercase border transition-all cursor-pointer active:scale-95 ${
                            on
                              ? 'bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]'
                              : 'border-[var(--line)] text-[var(--muted)]'
                          }`}
                        >
                          {el.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="relative w-full max-w-[440px] flex items-center justify-center">
                  {/* Left Carousel Arrow */}
                  <button
                    type="button"
                    onClick={() => handleCycleSkin('prev')}
                    aria-label="이전 스킨 (Previous Skin)"
                    title="이전 스킨"
                    className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[var(--surface)]/90 backdrop-blur-md border border-[var(--line)] shadow-xl text-[var(--fg)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
                  >
                    <svg
                      className="w-5 h-5 transition-transform group-hover:-translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <CardStage
                    item={activeItem}
                    slot={activeSlot}
                    skin={activeSkin}
                    authorName={authorName}
                    selectedItems={selectedArchiveItems}
                    curationTitle={curationTitle}
                  />

                  {/* Right Carousel Arrow */}
                  <button
                    type="button"
                    onClick={() => handleCycleSkin('next')}
                    aria-label="다음 스킨 (Next Skin)"
                    title="다음 스킨"
                    className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[var(--surface)]/90 backdrop-blur-md border border-[var(--line)] shadow-xl text-[var(--fg)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
                  >
                    <svg
                      className="w-5 h-5 transition-transform group-hover:translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Active Palette Indicator Badge */}
                <div className="mt-3.5 flex items-center gap-2">
                  <span className="text-[10px] mono-num tracking-wider uppercase px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[var(--muted)]">
                    PALETTE : <span className="text-[var(--fg)] font-bold">{activeSkin.name}</span> ({Object.keys(skins).indexOf(activeSkin.id) + 1}/{Object.keys(skins).length})
                  </span>
                </div>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* PWA INSTALL HINT BANNER */}
      <InstallHint />

      {/* TOAST NOTIFICATION */}
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
          toast
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-16 opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-5 py-4 rounded-2xl bg-[var(--fg)] text-[var(--bg)] shadow-2xl flex items-center gap-3.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shrink-0" />
          <div>
            <p className="mono-num text-xs font-extrabold tracking-wider uppercase">
              {toast?.title}
            </p>
            <p className="text-xs opacity-80 mt-0.5">{toast?.sub}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
