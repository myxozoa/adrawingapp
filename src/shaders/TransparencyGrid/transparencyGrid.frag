#version 300 es

precision highp float;

out vec4 fragColor;

void main() {
  float size = 10.0;
  vec2 pos = floor(gl_FragCoord.xy / size);
  float patternMask = mod(pos.x + pos.y, 2.0) + 0.8;

  fragColor = patternMask * vec4(1.0, 1.0, 1.0, 1.0);
}