// Adapted from Tween UI: https://tween-ui.vercel.app/component/slide-arrow-button
'use client';

import {type ComponentPropsWithRef} from 'react';
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
  // Keep the native activation target mounted through focus, click and form
  // submission. Re-keying its descendants during activation can swallow a tap
  // on mobile WebKit. Animate the existing nodes after the click instead.
  const playFeedback=(button:HTMLButtonElement)=>{
    if(pending||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const animate=(selector:string,frames:Keyframe[])=>{
      for(const node of button.querySelectorAll<HTMLElement>(selector)){
        node.getAnimations().forEach(animation=>animation.cancel());
        node.animate(frames,{duration:560,easing:'cubic-bezier(.32,.72,0,1)'});
      }
    };
    animate('.tween-slide-label>span',[{transform:'translateY(0)'},{transform:'translateY(-100%)'}]);
    animate('.tween-slide-badge>svg:first-child',[{translate:'0 0'},{translate:'24px 0'}]);
    animate('.tween-slide-badge>svg:last-child',[{translate:'-24px 0'},{translate:'0 0'}]);
  };
  const label =
    'block text-sm leading-5 font-medium whitespace-nowrap';

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
      onClick={event=>{onClick?.(event);if(type!=='submit'&&!event.defaultPrevented)playFeedback(event.currentTarget);}}
      onFocus={onFocus}
    >
      {/* Stable, decorative children animate only after activation. */}
      <span className="tween-slide-label block h-5 overflow-hidden">
        <span className={label}>{children}</span>
        <span className={label} aria-hidden="true">
          {children}
        </span>
      </span>

      {/* Chevron slides out of the badge while a fresh one slides in. */}
      <span className="tween-slide-badge relative grid size-6 place-items-center overflow-hidden rounded-full bg-[#c6f56f]">
        {pending?<LoaderCircle size={14} className="lab-spin" aria-hidden="true"/>:<><Chevron className="col-start-1 row-start-1 size-3.5 stroke-[#045f64]" />
        <Chevron className="col-start-1 row-start-1 size-3.5 -translate-x-6 stroke-[#045f64] motion-reduce:hidden" />
        </>}
      </span>
    </button>
  );
};

export default SlideArrowButton;
