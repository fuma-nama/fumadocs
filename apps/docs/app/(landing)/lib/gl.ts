import type { Rect } from './motion';

type Uniform = number | readonly number[];

const VERTEX = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

interface ShaderCanvasOptions {
  fragment: string;
  /** sets animated uniforms before each draw */
  onFrame?: (time: number) => void;
  /** after the canvas's box changed size, before the frame that shows it, with the canvas pixels
   * per CSS pixel it draws at */
  onResize?: (dpr: number) => void;
  /** how much of the canvas is on screen, 0 to 1, each time that crosses 0 or one of `thresholds` */
  onVisible?: (ratio: number) => void;
  thresholds?: number[];
  /** keeps what it drew, so a change shown in a box of the canvas redraws that box alone */
  preserve?: boolean;
}

export type ShaderCanvas = NonNullable<ReturnType<typeof createShaderCanvas>>;

/**
 * A full-canvas GLSL ES 3.00 fragment shader that only renders while the canvas is on screen, in
 * the frame after `invalidate()`, and only when a uniform, a texture or the canvas's size changed
 * since it last drew. It gets `vec2 uResolution` (device px) and `float uDpr`, and writes
 * `out vec4 color`. The program compiles while the page goes on: frames before it's ready draw
 * nothing, and never wait for the GPU where the browser can tell when it's done
 * (`KHR_parallel_shader_compile`).
 */
export function createShaderCanvas(
  canvas: HTMLCanvasElement,
  {
    fragment,
    onFrame,
    onResize,
    onVisible,
    thresholds = [],
    preserve = false,
  }: ShaderCanvasOptions,
) {
  const gl = canvas.getContext('webgl2', {
    preserveDrawingBuffer: preserve,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: 'low-power',
  });
  if (!gl) return null;
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const program = gl.createProgram();
  const shaders: WebGLShader[] = [];
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERTEX],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    shaders.push(shader);
  }
  // the position's location is set before the link, so nothing waits to look it up
  gl.bindAttribLocation(program, 0, 'p');
  gl.linkProgram(program);
  gl.flush();

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  /** `null` until a frame finds the program compiled */
  let linked: boolean | null = null;
  const locations = new Map<string, WebGLUniformLocation | null>();
  /** each uniform as last written, and those set before the link, written then */
  const written = new Map<string, number | number[]>();
  const pending = new Map<string, Uniform>();
  /** all the canvas shows changed since it last drew, or only within `dirty`'s boxes, CSS px
   * corners four by four */
  let stale = true;
  const dirty: number[] = [];

  /** a change shown within `box`, CSS px `[x0, y0, x1, y1]`, or anywhere */
  function mark(box?: readonly number[]) {
    if (stale) return;
    if (!box || !preserve) {
      stale = true;
      return;
    }
    if (box[2] <= box[0] || box[3] <= box[1]) return;
    for (let i = 0; i < dirty.length; i += 4) {
      if (
        box[0] >= dirty[i] &&
        box[1] >= dirty[i + 1] &&
        box[2] <= dirty[i + 2] &&
        box[3] <= dirty[i + 3]
      )
        return;
    }
    dirty.push(box[0], box[1], box[2], box[3]);
  }

  function write(name: string, value: Uniform, box?: readonly number[]) {
    let location = locations.get(name);
    if (location === undefined) {
      location = gl!.getUniformLocation(program, name);
      locations.set(name, location);
    }
    if (!location || !changed(name, value)) return;
    mark(box);
    if (typeof value === 'number') gl!.uniform1f(location, value);
    else if (value.length === 2) gl!.uniform2f(location, value[0], value[1]);
    else if (value.length === 3) gl!.uniform3f(location, value[0], value[1], value[2]);
    else gl!.uniform4f(location, value[0], value[1], value[2], value[3]);
  }

  /** whether `value` differs from `name`'s last write, which it then becomes */
  function changed(name: string, value: Uniform): boolean {
    const last = written.get(name);
    if (typeof value === 'number' || typeof last !== 'object') {
      if (last === value) return false;
      written.set(name, typeof value === 'number' ? value : [...value]);
      return true;
    }
    let same = true;
    for (let i = 0; i < value.length; i++) {
      if (last[i] === value[i]) continue;
      last[i] = value[i];
      same = false;
    }
    return !same;
  }

  /** `box`, CSS px `[x0, y0, x1, y1]`, holds all that a change to it shows, when the canvas
   * `preserve`s what it drew */
  function set(name: string, value: Uniform, box?: readonly number[]) {
    if (linked) write(name, value, box);
    // callers reuse their arrays between uniforms
    else if (linked === null) pending.set(name, typeof value === 'number' ? value : [...value]);
  }

  const textures = new Map<string, { tex: WebGLTexture; unit: number }>();
  /** uploads an image or canvas to a `sampler2D` uniform, again after drawing to it; `box`, CSS px,
   * is where it shows, when the canvas `preserve`s what it drew */
  function texture(name: string, source: TexImageSource, box?: Rect) {
    const known = textures.get(name);
    const entry = known ?? { tex: gl!.createTexture(), unit: textures.size };
    gl!.activeTexture(gl!.TEXTURE0 + entry.unit);
    gl!.bindTexture(gl!.TEXTURE_2D, entry.tex);
    if (!known) {
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      if (linked) gl!.uniform1i(gl!.getUniformLocation(program, name), entry.unit);
      textures.set(name, entry);
    }
    gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, true);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, source);
    mark(box && [box.x, box.y, box.x + box.w, box.y + box.h]);
    invalidate();
  }

  /** reads the link and puts the program to use; the shaders' sources are freed either way */
  function link() {
    linked = gl!.getProgramParameter(program, gl!.LINK_STATUS) as boolean;
    if (!linked) {
      for (const shader of shaders) console.error(gl!.getShaderInfoLog(shader));
      console.error(gl!.getProgramInfoLog(program));
    }
    for (const shader of shaders) {
      gl!.detachShader(program, shader);
      gl!.deleteShader(shader);
    }
    if (!linked) return;
    gl!.useProgram(program);
    for (const [name, entry] of textures) {
      gl!.uniform1i(gl!.getUniformLocation(program, name), entry.unit);
    }
    for (const [name, value] of pending) write(name, value);
    pending.clear();
  }

  const start = performance.now();
  let raf = 0;
  let onScreen = false;

  function frame(now: number) {
    raf = 0;
    if (linked === null) {
      // still compiling: look again next frame rather than wait for it
      if (parallel && !gl!.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) {
        raf = requestAnimationFrame(frame);
        return;
      }
      link();
    }
    onFrame?.((now - start) / 1000);
    if (!linked) return;
    if (stale) gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    else if (dirty.length > 0) {
      gl!.enable(gl!.SCISSOR_TEST);
      for (let i = 0; i < dirty.length; i += 4) {
        const x = Math.floor(dirty[i] * dpr);
        const y = Math.floor(canvas.height - dirty[i + 3] * dpr);
        gl!.scissor(
          x,
          y,
          Math.ceil(dirty[i + 2] * dpr) - x,
          Math.ceil(canvas.height - dirty[i + 1] * dpr) - y,
        );
        gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      }
      gl!.disable(gl!.SCISSOR_TEST);
    }
    stale = false;
    dirty.length = 0;
  }

  function invalidate() {
    if (raf === 0 && onScreen) raf = requestAnimationFrame(frame);
  }

  /** draws right away instead of in the next frame, for a change this frame shows */
  function draw() {
    if (!onScreen) return;
    cancelAnimationFrame(raf);
    frame(performance.now());
  }

  function pause() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  // a canvas pixel a CSS pixel at most, a whole number of device pixels each: the figures draw
  // their dither and outlines in CSS pixels, a phone's 3x would only triple the work
  let dpr = 1;

  /** a drawing buffer the canvas's size, kept off screen: one made again each time it came back
   * cost a phone a buffer and a whole frame, where the last one still shows */
  function fit() {
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width === width && canvas.height === height) return;
    // resizing clears it
    stale = true;
    canvas.width = width;
    canvas.height = height;
    gl!.viewport(0, 0, width, height);
    set('uResolution', [width, height]);
  }

  // resizing clears the canvas, and a frame requested now would come after this one paints it blank
  const resize = new ResizeObserver(() => {
    dpr = window.devicePixelRatio / Math.ceil(window.devicePixelRatio);
    canvas.style.imageRendering = dpr < window.devicePixelRatio ? 'pixelated' : '';
    set('uDpr', dpr);
    fit();
    onResize?.(dpr);
    draw();
  });
  const visibility = new IntersectionObserver(
    (entries) => {
      // the latest record wins when a busy page delivers several
      const entry = entries[entries.length - 1];
      if (entry.isIntersecting !== onScreen) {
        onScreen = entry.isIntersecting;
        // back on screen it draws only what changed while it was away
        if (onScreen) draw();
        else pause();
      }
      onVisible?.(entry.intersectionRatio);
    },
    { threshold: [0, ...thresholds] },
  );
  resize.observe(canvas);
  visibility.observe(canvas);

  return {
    set,
    texture,
    invalidate,
    draw,
    destroy() {
      pause();
      resize.disconnect();
      visibility.disconnect();
      if (linked === null) for (const shader of shaders) gl.deleteShader(shader);
      for (const entry of textures.values()) gl.deleteTexture(entry.tex);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      // the context stays for a remount (StrictMode, HMR) to reuse; its backing store goes now
      canvas.width = 1;
      canvas.height = 1;
    },
  };
}

/** a computed CSS colour, `#rgb`, `#rrggbb`, `#rrggbbaa` or `rgb(r g b / a)`, as 0-1 channels */
export function cssRgba(value: string): [r: number, g: number, b: number, a: number] {
  const text = value.trim();
  if (text.startsWith('#')) {
    const hex = text.length < 6 ? text.slice(1).replace(/./g, '$&$&') : text.slice(1);
    const n = (i: number) => Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return [n(0), n(2), n(4), hex.length === 8 ? n(6) : 1];
  }
  // a token read while the page that defines it unmounts is empty
  const [r = 0, g = 0, b = 0, a = 1] = (text.match(/[\d.]+/g) ?? []).map(Number);
  return [r / 255, g / 255, b / 255, a];
}

export function cssRgb(value: string): [r: number, g: number, b: number] {
  const [r, g, b] = cssRgba(value);
  return [r, g, b];
}
