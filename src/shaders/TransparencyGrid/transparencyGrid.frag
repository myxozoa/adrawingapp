#version 300 es

precision mediump float;

in vec2 v_position;
out vec4 fragColor;

void main() {
  float size = 8.0;
  vec2 pos = floor(v_position / size);
  float patternMask = mod(pos.x + pos.y, 2.0) + 0.8;

  fragColor = patternMask * vec4(1.0, 1.0, 1.0, 1.0);
}