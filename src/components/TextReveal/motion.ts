import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

export const revealWords = (element: HTMLElement, delay: number) => {
  gsap.registerPlugin(SplitText);
  const split = SplitText.create(element, { tag: `span`, type: `words`, aria: `hidden`, wordsClass: `text-reveal-word` });
  split.words.forEach((word, index) => { word.id = `${element.id}-word-${index}`; });
  let settled = false;
  const tween = gsap.fromTo(split.words, { opacity: 0, yPercent: 24 }, {
    delay,
    opacity: 1,
    yPercent: 0,
    duration: .55,
    ease: `power3.out`,
    stagger: { amount: Math.min(.18, split.words.length * .026) },
    onComplete: () => {
      settled = true;
      gsap.set(split.words, { clearProps: `opacity,transform` });
      split.kill();
    },
  });

  const dispose = () => {
    settled = true;
    tween.kill();
    split.revert();
  };
  return { dispose, cancel: () => { if (!settled) dispose(); } };
};
