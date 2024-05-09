#version 300 es

precision highp float;

in vec2 v_tex_coord;
out vec4 fragColor;

uniform float u_opacity;
uniform int u_blend_mode;

// With float textures iOS requires explicit precision or it will default to low
uniform highp sampler2D u_bottom_texture;
uniform highp sampler2D u_top_texture;

vec3 normal(vec3 base, vec3 blend) {
  return blend;
}

vec3 multiply(vec3 base, vec3 blend) {
  return base * blend;
}

vec3 pdOver(vec3 base, vec3 blend, float opacity) {
  vec3 result;

  //Cr = (1 - αb) x Cs + αb x B(Cb, Cs)
  switch(u_blend_mode) {
    case 0:
      result = normal(base, blend) + (base * (1.0 - opacity));

      break;

  // Error value
    default:
      result = vec3(1., 0., 1.);
  }

  return result;
}

// vec4 pdOver(vec4 a, vec4 b){
//   return a + (b*(1. - a.a));
// }

vec4 blendColor(vec4 base, vec4 blend, float opacity) {
  blend *= opacity;

  // Cs = (1 - αb) x Cs + αb x B(Cb, Cs)
  // Co = αs x Fa x Cs + αb x Fb x Cb

  // Fa = 1; Fb = 1 – αs

  float alpha = (blend.a + (1. - blend.a) * base.a);

  vec3 blended = pdOver(base.rgb, blend.rgb, blend.a);

  return vec4(blended, alpha);
}

void main() {
  vec4 bottom = texture(u_bottom_texture, v_tex_coord);
  vec4 top = texture(u_top_texture, v_tex_coord);

  if (bottom.a == 0. && top.a == 0.) {
    discard;
  }
  
  if (bottom.a == 0.) {
    fragColor = top * u_opacity;
  } else if (top.a == 0.) {
    fragColor = bottom;
  } else {
    fragColor = blendColor(bottom, top, u_opacity);
  }
}
