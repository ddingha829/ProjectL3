// Adapted from Tween UI: https://tween-ui.vercel.app/component/slide-arrow-button
'use client';

import {useState,type ComponentPropsWithRef} from 'react';
import { cn } from './cn';
import {LoaderCircle} from 'lucide-react';
import './touch-motion.css';

const Chevron = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
};

export interface SlideArrowButtonProps extends ComponentPropsWithRef<'button'> {
  /** Button label. Must be a string — it is duplicated for the roll. */
  children: string;
  pending?: boolean;
}

const SlideArrowButton = ({
  children,
  className,
  type = 'button',
  onClick,
  onFocus,
  pending = false,
  ...props
}: SlideArrowButtonProps) => {
  const [pulse,setPulse]=useState(0);
  const label =
    'block text-sm leading-5 font-medium whitespace-nowrap transition-transform duration-500 ease-in-out group-hover:-translate-y-full motion-reduce:transition-none motion-reduce:group-hover:translate-y-0';

  return (
    <button
      type={type}
      className={cn(
        'tween-slide-button group inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-transparent bg-[#045f64] px-6 text-[#c6f56f] shadow-[0_1px_1px_rgba(16,24,40,0.16)] transition-colors duration-300 hover:bg-[#045f64]/95 focus-visible:ring-2 focus-visible:ring-[#045f64] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:ring-offset-[#12161F]',
        className
      )}
      {...props}
      disabled={props.disabled||pending}
      aria-busy={pending||props['aria-busy']}
      data-pending={pending?true:undefined}
      onClick={event=>{setPulse(value=>value+1);onClick?.(event);}}
      onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))setPulse(value=>value+1);onFocus?.(event);}}
    >
      {/* Label rolls up to an identical copy on hover. */}
      <span key={`label-${pulse}`} data-tween-run={!pending&&pulse>0?true:undefined} className="tween-slide-label block h-5 overflow-hidden">
        <span className={label}>{children}</span>
        <span className={label} aria-hidden="true">
          {children}
        </span>
      </span>

      {/* Chevron slides out of the badge while a fresh one slides in. */}
      <span key={`badge-${pulse}`} data-tween-run={!pending&&pulse>0?true:undefined} className="tween-slide-badge relative grid size-6 place-items-center overflow-hidden rounded-full bg-[#c6f56f]">
        {pending?<LoaderCircle size={14} className="lab-spin" aria-hidden="true"/>:<><Chevron className="col-start-1 row-start-1 size-3.5 stroke-[#045f64] transition-transform duration-400 ease-in-out group-hover:translate-x-6 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
        <Chevron className="col-start-1 row-start-1 size-3.5 -translate-x-6 stroke-[#045f64] transition-transform duration-400 ease-in-out group-hover:translate-x-0 motion-reduce:hidden" />
        </>}
      </span>
    </button>
  );
};

export default SlideArrowButton;
