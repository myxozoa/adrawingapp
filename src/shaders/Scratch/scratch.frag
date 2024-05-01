#version 300 es

precision mediump float;

in vec2 v_tex_coord;
out vec4 fragColor;

// With float textures iOS requires explicit precision or it will default to low
uniform lowp sampler2D u_source_texture;
uniform lowp sampler2D u_destination_texture;


vec4 pdOver(vec4 a, vec4 b){
  return (b*(1. - a.a)) + a;
}

void main() {
  vec4 source = texture(u_source_texture, v_tex_coord);
  vec4 dest = texture(u_destination_texture, v_tex_coord);

  if (source.a == 0. && dest.a == 0.) {
    discard;
  }
  
  if (source.a == 0.) {
    fragColor = dest;
  } else if (dest.a == 0.) {
    fragColor = source;
  } else {
    fragColor = pdOver(source, dest);
  }
}
