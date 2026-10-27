type Uniform = number | readonly number[];

const VERTEX = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

interface ShaderCanvasOptions {
  fragment: string;
  /** draw every frame while on screen, not only after `invalidate()` */
  loop?: boolean;
  /** sets animated uniforms before each draw */
  onFrame?: (time: number) => void;
  /** after the canvas took its box's new size, before the frame that shows it */
  onResize?: () => void;
  /** how much of the canvas is on screen, 0 to 1, each time that crosses 0 or one of `thresholds` */
  onVisible?: (ratio: number) => void;
  thresholds?: number[];
}

export type ShaderCanvas = NonNullable<ReturnType<typeof createShaderCanvas>>;

/**
 * A full-canvas GLSL ES 3.00 fragment shader that only renders while the canvas is on screen: after
 * `invalidate()`, or every frame with `loop`. It gets `vec2 uResolution` (device px), `float uDpr`
 * and `float uTime` (seconds since creation), and writes `out vec4 color`. The program compiles
 * while the page goes on: frames before it's ready draw nothing, and never wait for the GPU where
 * the browser can tell when it's done (`KHR_parallel_shader_compile`).
 */
export function createShaderCanvas(
  canvas: HTMLCanvasElement,
  { fragment, loop = false, onFrame, onResize, onVisible, thresholds = [] }: ShaderCanvasOptions,
) {
  const gl = canvas.getContext('webgl2', {
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
  /** uniforms set before that, written then */
  const pending = new Map<string, Uniform>();

  function write(name: string, value: Uniform) {
    let location = locations.get(name);
    if (location === undefined) {
      location = gl!.getUniformLocation(program, name);
      locations.set(name, location);
    }
    if (!location) return;
    if (typeof value === 'number') gl!.uniform1f(location, value);
    else if (value.length === 2) gl!.uniform2f(location, value[0], value[1]);
    else if (value.length === 3) gl!.uniform3f(location, value[0], value[1], value[2]);
    else gl!.uniform4f(location, value[0], value[1], value[2], value[3]);
  }

  function set(name: string, value: Uniform) {
    if (linked) write(name, value);
    // callers reuse their arrays between uniforms
    else if (linked === null) pending.set(name, typeof value === 'number' ? value : [...value]);
  }

  const textures = new Map<string, { tex: WebGLTexture; unit: number }>();
  /** uploads an image or canvas to a `sampler2D` uniform, again after drawing to it */
  function texture(name: string, source: TexImageSource) {
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
    const time = (now - start) / 1000;
    set('uTime', time);
    onFrame?.(time);
    if (linked) gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    if (loop) invalidate();
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

  // resizing clears the canvas, and a frame requested now would come after this one paints it blank
  const resize = new ResizeObserver(() => {
    // whole device pixels per canvas pixel, so a 3x screen's pixels stretch evenly over 1.5x
    const dpr = window.devicePixelRatio / Math.ceil(window.devicePixelRatio / 2);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    canvas.style.imageRendering = dpr < window.devicePixelRatio ? 'pixelated' : '';
    gl.viewport(0, 0, canvas.width, canvas.height);
    set('uResolution', [canvas.width, canvas.height]);
    set('uDpr', dpr);
    onResize?.();
    draw();
  });
  const visibility = new IntersectionObserver(
    (entries) => {
      // the latest record wins when a busy page delivers several
      const entry = entries[entries.length - 1];
      onScreen = entry.isIntersecting;
      if (onScreen) invalidate();
      else pause();
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
