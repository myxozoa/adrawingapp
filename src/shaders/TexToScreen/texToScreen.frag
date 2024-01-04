#version 300 es

precision highp float;

out vec4 fragColor;

// With float textures iOS requires explicit highp or it will default to low
uniform highp sampler2D textureSampler;
in vec2 texCoords;

void main() {
  vec4 color = texture(textureSampler, texCoords);

  fragColor = color;
}