import './styles.scss';
import { memo, useRef } from 'react';
import type { TextRevealProps } from './types';
import { useTextReveal } from './useTextReveal';

const TextReveal = memo(({ id, text, delay = 0 }: TextRevealProps) => {
  const visualRef = useRef<HTMLSpanElement>(null);
  useTextReveal(visualRef, id, text, delay);
  return <span id={id} className='text-reveal'>
    <span id={`${id}-accessible`} className='sr-only'>{text}</span>
    <span key={text} ref={visualRef} id={`${id}-visual`} className='text-reveal-visual' aria-hidden='true'>{text}</span>
  </span>;
});

TextReveal.displayName = `TextReveal`;

export default TextReveal;
