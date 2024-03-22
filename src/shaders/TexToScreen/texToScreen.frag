#version 300 es

precision mediump float;

in vec2 v_tex_coord;
out vec4 fragColor;

// With float textures iOS requires explicit precision or it will default to low
uniform mediump sampler2D textureSampler;

void main() {
  vec4 color = texture(textureSampler, v_tex_coord);

  fragColor = color;
}
