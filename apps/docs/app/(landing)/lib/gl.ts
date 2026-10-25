type Uniform =
  | number
  | readonly [number, number]
  | readonly [number, number, number]
  | readonly [number, number, number, number];

interface ShaderCanvasOptions {
  /**
   * GLSL ES 3.00 fragment shader. Provided uniforms: `vec2 uResolution` (device px),
   * `float uDpr`, `float uTime` (seconds since creation). Write to `out vec4 color`.
   */
  fragment: string;
  /** redraw every frame while on screen, otherwise only after `invalidate()` */
  loop?: boolean;
  /** runs before each draw, set animated uniforms here */
  onFrame?: (time: number) => void;
}

interface ShaderCanvas {
  set: (name: string, value: Uniform) => void;
  /** upload (or re-upload after drawing to it) an image or canvas to a `sampler2D` uniform */
  texture: (name: string, source: TexImageSource) => void;
  invalidate: () => void;
  destroy: () => void;
}

const VERTEX = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

/** a full-canvas fragment shader that only renders while the canvas is on screen */
export function createShaderCanvas(
  canvas: HTMLCanvasElement,
  { fragment, loop = false, onFrame }: ShaderCanvasOptions,
): ShaderCanvas | null {
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: true });
  if (!gl) return null;
  const program = link(gl, fragment);
  if (!program) return null;

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const locations = new Map<string, WebGLUniformLocation | null>();
  function set(name: string, value: Uniform) {
    let location = locations.get(name);
    if (location === undefined) {
      location = gl!.getUniformLocation(program!, name);
      locations.set(name, location);
    }
    if (!location) return;
    if (typeof value === 'number') gl!.uniform1f(location, value);
    else if (value.length === 2) gl!.uniform2f(location, value[0], value[1]);
    else if (value.length === 3) gl!.uniform3f(location, value[0], value[1], value[2]);
    else gl!.uniform4f(location, value[0], value[1], value[2], value[3]);
  }

  const textures = new Map<string, { tex: WebGLTexture; unit: number }>();
  function texture(name: string, source: TexImageSource) {
    let entry = textures.get(name);
    if (entry) {
      gl!.activeTexture(gl!.TEXTURE0 + entry.unit);
      gl!.bindTexture(gl!.TEXTURE_2D, entry.tex);
    } else {
      entry = { tex: gl!.createTexture(), unit: textures.size };
      gl!.activeTexture(gl!.TEXTURE0 + entry.unit);
      gl!.bindTexture(gl!.TEXTURE_2D, entry.tex);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.uniform1i(gl!.getUniformLocation(program!, name), entry.unit);
      textures.set(name, entry);
    }
    gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, true);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, source);
    invalidate();
  }

  const start = performance.now();
  let raf = 0;
  let onScreen = false;
  // at most 2x; a GPU that can't keep up renders at 1x instead: running frames under ~40fps for a second
  let limit = 2;
  let last = 0;
  let slow = 0;

  function frame(now: number) {
    raf = 0;
    const dt = now - last;
    if (limit > 1 && dt < 100) {
      slow = dt > 25 ? slow + 1 : Math.max(0, slow - 2);
      if (slow > 40) {
        limit = 1;
        size();
      }
    }
    last = now;
    const time = (now - start) / 1000;
    set('uTime', time);
    onFrame?.(time);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    if (loop) invalidate();
  }

  function invalidate() {
    if (raf === 0 && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function pause() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function size() {
    const dpr = Math.min(window.devicePixelRatio, limit);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    // below the screen's density, upscale in whole pixels: the shaders draw pixel art
    canvas.style.imageRendering = dpr < window.devicePixelRatio ? 'pixelated' : '';
    gl!.viewport(0, 0, canvas.width, canvas.height);
    set('uResolution', [canvas.width, canvas.height]);
    set('uDpr', dpr);
    invalidate();
  }

  const resize = new ResizeObserver(size);
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

function link(gl: WebGL2RenderingContext, fragment: string): WebGLProgram | null {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERTEX],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}
