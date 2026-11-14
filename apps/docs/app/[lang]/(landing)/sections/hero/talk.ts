import { CROWN_CELL, MATE_PAD } from '@/components/mascot/sprite';
import { copy } from '../../content';
import { DISSOLVE } from '../../lib/dither';
import { clamp, TICK } from '../../lib/motion';
import { setText } from '../../lib/script';

/** ms: a character typed, a bubble held once typed, its dissolve, the pause before the next */
const TYPE = 40;
const HOLD = 2200;
const FADE = 3 * TICK;
const GAP = 2 * TICK;
/** a bubble's pop from the dot at its tail's tip, through a desktop's scales, held whole for the
 * last quarter */
const POP: Keyframe[] = [
  { transform: 'scale(0.04)' },
  { transform: 'scale(0.3, 0.2)' },
  { transform: 'scale(0.86)' },
  { transform: 'none' },
  { transform: 'none' },
];
/** each bubble's dot, in her cells from the top of her canvas over her crown: the bubble leans the
 * way the dot does, the next a little off the last */
const SPOTS = [
  [3, -2],
  [-3, -5],
  [4, -4],
  [-4, -3],
] as const;
/** px, as the stage sets them: the tail's root on the bubble's foot and its drop to the dot, and how
 * far in from the bubble's corner its root starts */
const TAIL = { root: 13, drop: 9, inset: 20 };
/** px the bubble's shadow falls right of it, as the stage sets it */
const SHADOW = 3;

/**
 * Her lines from the moon, a bubble at a time: each pops from a dot over her head and its lines
 * type in; it holds, dissolves, and the next pops a little off it, leaning the other way. She ends
 * on her first again, and it stays. Her clock is held while the sky is off screen.
 */
export function createTalk(
  drawing: HTMLElement,
  mate: HTMLCanvasElement,
  /** ms till her first bubble, `null` for none to play: her first is simply there */
  delay: number | null,
): () => void {
  const scene = drawing.parentElement;
  const stage = scene?.parentElement;
  const bubble = drawing.querySelector<HTMLElement>('[data-bubble]');
  const sizer = bubble?.querySelector('[data-sizer]');
  const said = bubble?.querySelector('[data-said]');
  const box = sizer?.parentElement;
  if (!scene || !stage || !bubble || !sizer || !said || !box) return () => {};
  const says = copy.hero.says;
  /** the line on screen */
  let line = 0;

  /** the bubble's box sized to its lines and laid over her crown on whole page px as the sky
   * rests, its tail from its foot down to the line's dot */
  const place = () => {
    box.style.width = '';
    const style = getComputedStyle(box);
    const width = Math.ceil(Number.parseFloat(style.width));
    const height = Number.parseFloat(style.height);
    // the moonset's drop, taken out
    const drop = scene.getBoundingClientRect().top - stage.getBoundingClientRect().top;
    const area = drawing.getBoundingClientRect();
    const her = mate.getBoundingClientRect();
    const x = area.left + scrollX;
    const y = area.top + scrollY - drop;
    const cell = her.width / mate.width;
    const [dx, dy] = SPOTS[line];
    const dotX = Math.round(her.left + scrollX + (MATE_PAD[0] + CROWN_CELL[0] + dx) * cell);
    const dotY = Math.round(her.top + scrollY - drop + dy * cell);
    const right = dx >= 0;
    // inside the drawing, its shadow too
    const left = clamp(
      right ? dotX - TAIL.inset : dotX - width + TAIL.inset,
      Math.ceil(x),
      Math.floor(x + area.width) - width - SHADOW,
    );
    // the tail's edge on the dot's side drops straight onto it
    const tip = clamp(dotX - left, TAIL.root, width - TAIL.root);
    const root = right ? tip : tip - TAIL.root;
    box.style.width = `${width}px`;
    bubble.style.left = `${left - x}px`;
    bubble.style.top = `${dotY - TAIL.drop - height - y}px`;
    bubble.style.setProperty('--tail-a', `${root}px`);
    bubble.style.setProperty('--tail-b', `${root + TAIL.root}px`);
    bubble.style.setProperty('--tail-tip', `${tip}px`);
    bubble.style.transformOrigin = `${tip}px ${height + TAIL.drop}px`;
  };

  // her clock, one timer: each step and the animation it starts are due a set time after the last
  // step, held while the sky is under a quarter on screen
  let held = false;
  let timer = 0;
  /** `performance.now()` the next step is due at; while held, the ms left till it */
  let due = 0;
  let next: (() => void) | null = null;
  const arm = () => {
    timer = window.setTimeout(() => {
      const run = next;
      next = null;
      run?.();
    }, due - performance.now());
  };
  const schedule = (ms: number, run: () => void) => {
    next = run;
    due += ms;
    if (!held) arm();
  };
  /** an animation of the bubble's, from the time of the step that starts it */
  const play = (frames: Keyframe[], options: KeyframeAnimationOptions) => {
    bubble.animate(frames, options).startTime = due;
  };
  const shown = new IntersectionObserver(
    (entries) => {
      const ratio = entries[entries.length - 1].intersectionRatio;
      if (ratio < 0.25 && !held) {
        held = true;
        clearTimeout(timer);
        // a step overdue on a busy page runs first thing back, the rest at their pace
        if (next) due = Math.max(0, due - performance.now());
        for (const animation of bubble.getAnimations())
          if (animation.playState === 'running') animation.pause();
      } else if (ratio >= 0.5 && held) {
        held = false;
        for (const animation of bubble.getAnimations())
          if (animation.playState === 'paused') animation.play();
        if (!next) return;
        due += performance.now();
        arm();
      }
    },
    { threshold: [0, 0.25, 0.5] },
  );

  /** bubble `n` of the script: it pops, its lines sized in full and typed in a character a step */
  const say = (n: number) => {
    line = n % says.length;
    const text = says[line].join('\n');
    setText(sizer, text);
    setText(said, '');
    place();
    bubble.dataset.state = 'on';
    // its beat starts as it pops, however late a busy page ran this step
    due = performance.now();
    play(POP, { duration: TICK });
    let typed = 0;
    const type = () => {
      setText(said, text.slice(0, ++typed));
      if (typed < text.length) schedule(TYPE, type);
      else if (n < says.length) schedule(HOLD, () => fade(n));
      // her first again is the last: it stays, and her clock stops
      else shown.disconnect();
    };
    schedule(TICK, type);
  };

  /** bubble `n` dissolves, then nothing of it is left till the next pops */
  const fade = (n: number) => {
    play(DISSOLVE, {
      duration: FADE,
      easing: `steps(${DISSOLVE.length - 1}, end)`,
      fill: 'forwards',
    });
    schedule(FADE, () => {
      for (const animation of bubble.getAnimations()) animation.cancel();
      bubble.dataset.state = 'off';
      schedule(GAP, () => say(n + 1));
    });
  };

  /** her first, still, shown in the frame the engine shows her */
  const stay = () => {
    if (mate.style.visibility !== 'visible') return;
    still.disconnect();
    place();
    bubble.dataset.state = 'on';
  };
  const still = new MutationObserver(stay);
  let begin = 0;
  if (delay === null) {
    setText(sizer, says[0].join('\n'));
    setText(said, says[0].join('\n'));
    still.observe(mate, { attributeFilter: ['style'] });
    stay();
  } else {
    // her first on the boot's beat, or once the sky is seen again
    begin = window.setTimeout(() => schedule(0, () => say(0)), delay);
    shown.observe(drawing);
  }

  // a new size for the sky or for her lines' type places the bubble again
  const resize = new ResizeObserver(() => {
    if (bubble.dataset.state === 'on') place();
  });
  resize.observe(drawing);
  resize.observe(sizer);

  return () => {
    clearTimeout(begin);
    clearTimeout(timer);
    next = null;
    shown.disconnect();
    still.disconnect();
    resize.disconnect();
    for (const animation of bubble.getAnimations()) animation.cancel();
    bubble.dataset.state = 'off';
  };
}
