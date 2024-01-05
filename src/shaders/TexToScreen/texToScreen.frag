#version 300 es

precision mediump float;

out vec4 fragColor;

// With float textures iOS requires explicit precision or it will default to low
uniform mediump sampler2D textureSampler;
in vec2 texCoords;

void main() {
  vec4 color = texture(textureSampler, texCoords);

  fragColor = color;
}