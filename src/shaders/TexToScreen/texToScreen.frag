#version 300 es

precision highp float;

in vec2 v_tex_coord;
out vec4 fragColor;

// With float textures iOS requires explicit precision or it will default to low
uniform mediump sampler2D textureSampler;

void main() {
  vec4 color = texture(textureSampler, v_tex_coord);

  if (color.a == 0.)
    discard;

  fragColor = color;
}
