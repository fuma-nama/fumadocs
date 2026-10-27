type Uniform = number | readonly number[];

const VERTEX = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

/**
 * A full-canvas GLSL ES 3.00 fragment shader that only renders while the canvas is on screen: after
 * `invalidate()`, or every frame with `loop`. It gets `vec2 uResolution` (device px), `float uDpr`
 * and `float uTime` (seconds since creation), writes `out vec4 color`, and `onFrame` sets animated
 * uniforms before each draw. Making one never waits for the GPU: it compiles while the page goes on,
 * and the first frame drawn reads the link, so a canvas made off screen is ready when it shows.
 */
export function createShaderCanvas(
  canvas: HTMLCanvasElement,
  {
    fragment,
    loop = false,
    onFrame,
  }: { fragment: string; loop?: boolean; onFrame?: (time: number) => void },
) {
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: true });
  if (!gl) return null;
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

  /** `null` until the first frame reads the link */
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

  /** reads the link, waiting for the GPU only if it hasn't finished, and puts the program to use */
  function link() {
    linked = gl!.getProgramParameter(program, gl!.LINK_STATUS) as boolean;
    if (!linked) {
      for (const shader of shaders) console.error(gl!.getShaderInfoLog(shader));
      console.error(gl!.getProgramInfoLog(program));
      return;
    }
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
  // at most 2x; a GPU that can't keep up renders at 1x instead: running frames under ~40fps for a second
  let limit = 2;
  let last = 0;
  let slow = 0;
  // the next frame was asked for while one drew, so the gap between them, however long, is a frame
  // time; one asked for from idle (a typed character, a resize) comes after a gap the page chose
  let chained = false;

  function frame(now: number) {
    raf = 0;
    if (linked === null) link();
    const dt = now - last;
    if (chained && limit > 1) {
      slow = dt > 25 ? slow + 1 : Math.max(0, slow - 2);
      if (slow > 40) {
        limit = 1;
        fit();
      }
    }
    last = now;
    const time = (now - start) / 1000;
    set('uTime', time);
    onFrame?.(time);
    if (linked) gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    if (loop) invalidate();
    chained = raf !== 0;
  }

  function invalidate() {
    if (raf === 0 && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
  }

  /** draws right away instead of in the next frame, for a change this frame shows */
  function draw() {
    if (!onScreen || document.hidden) return;
    cancelAnimationFrame(raf);
    frame(performance.now());
  }

  function pause() {
    cancelAnimationFrame(raf);
    raf = 0;
    chained = false;
  }

  function fit() {
    // under the limit by a whole factor of the screen's density, so its pixels stretch evenly:
    // a 3x screen renders at 1.5x, each pixel 2 device pixels
    const dpr = window.devicePixelRatio / Math.ceil(window.devicePixelRatio / limit);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    // below the screen's density, upscale in whole pixels: the shaders draw pixel art
    canvas.style.imageRendering = dpr < window.devicePixelRatio ? 'pixelated' : '';
    gl!.viewport(0, 0, canvas.width, canvas.height);
    set('uResolution', [canvas.width, canvas.height]);
    set('uDpr', dpr);
  }

  // resizing clears the canvas, and a frame requested now would come after this one paints it blank
  const resize = new ResizeObserver(() => {
    fit();
    draw();
  });
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) invalidate();
    else pause();
  });
  const onVisibilityChange = () => (document.hidden ? pause() : invalidate());

  resize.observe(canvas);
  visibility.observe(canvas);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    set,
    texture,
    invalidate,
    draw,
    destroy() {
      pause();
      resize.disconnect();
      visibility.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      // free the GPU resources but keep the context: a remount (StrictMode, HMR) reuses the canvas
      for (const entry of textures.values()) gl.deleteTexture(entry.tex);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
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
  const [r, g, b, a = 1] = text.match(/[\d.]+/g)!.map(Number);
  return [r / 255, g / 255, b / 255, a];
}

export function cssRgb(value: string): [r: number, g: number, b: number] {
  const [r, g, b] = cssRgba(value);
  return [r, g, b];
}
