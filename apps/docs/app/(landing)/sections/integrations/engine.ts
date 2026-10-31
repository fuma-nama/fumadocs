import { type Cable, cable, GROW, type Point, wipe } from '../../lib/cable';
import { TICK } from '../../lib/motion';
import { createClock, reached, whenShareSeen } from '../../lib/script';

/** a frame of a card's pop */
const STEP = TICK / 4;
/** a card's pop: a step hidden, then a dot at its middle grown through the scales an old desktop
 * draws a window at */
const POP: Keyframe[] = [
  { opacity: 0, transform: 'scale(0.04)', easing: 'steps(1, end)' },
  { opacity: 1, transform: 'scale(0.04)' },
  { opacity: 1, transform: 'scale(0.3, 0.2)' },
  { opacity: 1, transform: 'scale(0.86)' },
  { opacity: 1, transform: 'none' },
  { opacity: 1, transform: 'none' },
];
/** a cable's head, px a ms */
const SPEED = 2.5;

/**
 * The board's entrance, played once the reader reaches it: the cards pop in reading order, each on
 * the plug of a cable drawn out of the one before, under them, so each card covers the cable it
 * plugs into, and each starts its mechanism as it pops. Nothing is pressed till it ends. A board
 * already reached, or with reduced motion, is simply there, each mechanism on its payoff.
 */
export function createEntrance(board: HTMLElement): (() => void) | undefined {
  if (reached(board)) return;
  const cards = board.querySelectorAll<HTMLElement>(':scope > .bt-cell');
  const wires = board.querySelectorAll<HTMLElement>('[data-wire]');
  const animations: Animation[] = [];
  /** each cable as routed, its growth's ms once the entrance is set out, and its growth once started */
  const cables: Cable[] = [];
  const durations: number[] = [];
  const growths: Animation[] = [];
  const clock = createClock([board]);
  const playing = () => board.querySelectorAll('.bt-cell[data-play]').length;
  // a mechanism coming to rest gives its turn to the next card queued, in reading order
  const turns = new MutationObserver(() => {
    for (
      let next = board.querySelector<HTMLElement>('.bt-cell[data-queued]');
      next && playing() < 2;
      next = board.querySelector<HTMLElement>('.bt-cell[data-queued]')
    ) {
      delete next.dataset.queued;
      next.dataset.play = '';
    }
  });
  turns.observe(board, { subtree: true, attributeFilter: ['data-play'] });

  /**
   * Each cable from under the edge of its card facing the next to the next card's centre, on whole
   * px: across a row along its centre line; down out of a row's last card at its middle to the next
   * row's centre line, then back to its lead; straight down a column
   */
  function layout() {
    const centre = (el: HTMLElement): Point => [
      Math.round(el.offsetLeft + el.offsetWidth / 2),
      Math.round(el.offsetTop + el.offsetHeight / 2),
    ];
    for (let i = 0; i < cards.length - 1; i++) {
      const a = cards[i];
      const [ax] = centre(a);
      const [bx, by] = centre(cards[i + 1]);
      const points: Point[] = [];
      if (cards[i + 1].offsetLeft >= a.offsetLeft + a.offsetWidth - 1)
        points.push([a.offsetLeft + a.offsetWidth, by]);
      else {
        points.push([ax, a.offsetTop + a.offsetHeight]);
        if (ax !== bx) points.push([ax, by]);
      }
      points.push([bx, by]);
      cables[i] = cable(wires[i], points, false);
      (growths[i]?.effect as KeyframeEffect | undefined)?.setKeyframes(wipe(cables[i]));
    }
  }

  /**
   * Every beat on the clock: each card pops on the tick grid, on the frame the cable before it
   * arrives, and the cable after it leaves once it's whole. Each is made on its beat, held hidden
   * till then by its own static style, so nothing waiting is a layer a growing cable repaints.
   */
  function play() {
    layout();
    let at = 0;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const last = i === cards.length - 1;
      void clock.wait(at).then(() => {
        delete card.dataset.waiting;
        // its mechanism starts as it pops, or holds its first pose till one of two turns is free
        if (playing() < 2) card.dataset.play = '';
        else card.dataset.queued = '';
        const pop = card.animate(POP, 5 * STEP);
        animations.push(pop);
        if (last) pop.finished.then(end, () => {});
      });
      if (last) break;
      const { lengths } = cables[i];
      const gap = Math.ceil((3 * STEP + lengths[lengths.length - 1] / SPEED) / TICK) * TICK;
      durations[i] = gap - 3 * STEP;
      const svg = wires[i];
      svg.style.visibility = 'hidden';
      void clock.wait(at + 4 * STEP).then(() => {
        svg.style.visibility = '';
        growths[i] = svg.animate(wipe(cables[i]), { duration: durations[i], easing: GROW });
        animations.push(growths[i]);
      });
      at += gap;
    }
    board.dataset.state = 'playing';
  }

  function end() {
    delete board.dataset.state;
    sizes.disconnect();
    stopView();
    clock.stop();
    board.removeEventListener('focusin', finish);
  }

  /** a key reaching the board plays it out */
  function finish() {
    for (const animation of animations) animation.finish();
    for (const card of cards) {
      delete card.dataset.waiting;
      delete card.dataset.queued;
    }
    end();
  }

  const sizes = new ResizeObserver(() => {
    if (durations.length > 0) layout();
  });
  sizes.observe(board);
  for (const card of cards) card.dataset.waiting = '';
  const stopView = whenShareSeen(board, clock, play);
  board.addEventListener('focusin', finish);

  return () => {
    for (const animation of animations) animation.cancel();
    for (const card of cards) delete card.dataset.waiting;
    turns.disconnect();
    end();
  };
}
