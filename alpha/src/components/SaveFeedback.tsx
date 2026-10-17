'use client';

import { Check, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import './SaveFeedback.css';

export default function SaveFeedback({ state, label, successLabel = '저장됨', idleIcon }: {
  state: 'idle' | 'saving' | 'saved';
  label: string;
  successLabel?: string;
  idleIcon?: ReactNode;
}) {
  return <span className="save-feedback" data-save-state={state}>
    {state === 'saving' ? <LoaderCircle size={17} className="save-feedback-spinner" aria-hidden="true" />
      : state === 'saved' ? <Check size={17} className="save-feedback-check" aria-hidden="true" /> : idleIcon}
    <span>{state === 'saving' ? '저장 중…' : state === 'saved' ? successLabel : label}</span>
  </span>;
}
