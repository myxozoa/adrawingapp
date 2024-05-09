#version 300 es

precision lowp float;

in vec2 v_position;
out vec4 fragColor;

uniform float u_size;

void main() {
  vec2 pos = floor(v_position / u_size);
  float patternMask = mod(pos.x + pos.y, 2.0) + 0.8;

  fragColor = patternMask * vec4(1.0, 1.0, 1.0, 1.0);
}