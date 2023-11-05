precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

/*
 * Random number generator with a float seed
 *
 * Credits:
 * http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0
 */
highp float random1d(float dt) {
    highp float c = 43758.5453;
    highp float sn = mod(dt, 3.14);
    return fract(sin(sn) * c);
}

/*
 *  Returns a random drop position for the given seed value
 */
vec2 random_drop_pos(float val, vec2 screen_dim, vec2 velocity) {
    float max_x_move = velocity.x * abs(screen_dim.y / velocity.y);
    float x = -max_x_move * step(0.0, max_x_move) + (screen_dim.x + abs(max_x_move)) * random1d(val);
    float y = (1.0 + 0.05 * random1d(1.234 * val)) * screen_dim.y;

    return vec2(x, y);
}

/*
 * Calculates the drop trail color at the given pixel position
 */
vec4 trail_color(vec2 pixel, vec2 pos, vec2 velocity_dir, float width, float size) {
    vec2 pixel_dir = pixel - pos;
    float projected_dist = dot(pixel_dir, -velocity_dir);
    float tanjential_dist_sq = dot(pixel_dir, pixel_dir) - pow(projected_dist, 2.0);
    float width_sq = pow(width, 2.0);

    float line = step(0.0, projected_dist) * (1.0 - smoothstep(width_sq / 2.0, width_sq, tanjential_dist_sq));
    float dashed_line = line * step(0.5, cos(0.3 * projected_dist - 3.14159265 / 3.0));
    float fading_dashed_line = dashed_line * (1.0 - smoothstep(size / 5.0, size, projected_dist));

    return vec4(fading_dashed_line);
}

/*
 * The main program
 */
void main() {
    // Set the total number of rain drops that are visible at a given time
    const float n_drops = 20.0;

    // Set the drop trail radius
    float trail_width = 2.0;

    // Set the drop trail size
    float trail_size = 70.0;

    // Set the drop fall time in seconds
    float fall_time = 0.7;

    // Set the drop total life time
    float life_time = fall_time + 0.5;

    // Set the drop velocity in pixels per second
    vec2 velocity = vec2(23.0 - 0.5 * u_resolution.x, -0.9 * u_resolution.y) / fall_time;
    vec2 velocity_dir = normalize(velocity);

    // Iterate over the drops to calculate the pixel color
    vec4 pixel_color = vec4(0.0);

    for (float i = 0.0; i < n_drops; ++i) {
        // Offset the running time for each drop
        float time = u_time + life_time * (i + i / n_drops);

        // Calculate the time since the drop appeared on the screen
        float ellapsed_time = mod(time, life_time);

        // Calculate the drop initial position
        vec2 initial_pos = random_drop_pos(i + floor(time / life_time - i) * n_drops, u_resolution, velocity);

          // Calculate the drop current position
          vec2 current_pos = initial_pos + ellapsed_time * velocity;

          // Add the trail color to the pixel color
          pixel_color += trail_color(gl_FragCoord.xy, current_pos, velocity_dir, trail_width, trail_size);
      }

    // Fragment shader output
    gl_FragColor = pixel_color;
}