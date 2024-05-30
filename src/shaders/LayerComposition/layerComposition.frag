#version 300 es

precision highp float;

in vec2 v_tex_coord;
out vec4 fragColor;

uniform float u_opacity;
uniform int u_blend_mode;

// With float textures iOS requires explicit precision or it will default to low
uniform highp sampler2D u_bottom_texture;
uniform highp sampler2D u_top_texture;

vec4 normal(vec4 base, vec4 blend) {
  return blend;
}

vec4 multiply(vec4 base, vec4 blend) {
  return base * blend;
}

vec4 screen(vec4 base, vec4 blend) {
  // Sca × Da + Dca × Sa - Sca × Dca
  return blend * base.a + base * blend.a - blend * base;
}

// blend = src
// base = dst
vec4 pdOver(vec4 base, vec4 blend) {
// vec3 pdOver(vec3 base, vec3 blend, float baseA, float blendA) {
  vec4 result;

  //Cr = (1 - αb) x Cs + αb x B(Cb, Cs)
  switch(u_blend_mode) {
    // Clear Mode
    case 0:
      result = base * (1.0 - blend.a);

      break;
    // Normal Mode
    case 1:
      result = normal(base, blend) * base.a;

      break;

    // Multiply Mode
    case 2:
      result = multiply(base, blend);

      break;

    // Screen Mode
    case 3:
      result = screen(base, blend);

      break;

  // Error value
    default:
      result = vec4(1., 0., 1., 1.);
  }

  // + Sca × (1 - Da) + Dca × (1 - Sa)
  return result + blend * (1. - base.a) + base * (1.0 - blend.a);
}

// From SVG spec

// Sc  - The source element color value.
// Sa  - The source element alpha value.
// Dc  - The canvas color value prior to compositing.
// Da  - The canvas alpha value prior to compositing.
// Dc' - The canvas color value post compositing.
// Da' - The canvas alpha value post compositing.

// dont seem to need alpha because of premultiplication
  
// normal
// colors: Sca × Da + Sca × (1 - Da) + Dca × (1 - Sa)
// alpha: Sa + Da - Sa × Da

// multiply
// colors: Sca × Dca + Sca × (1 - Da) + Dca × (1 - Sa)
// alpha: Sa + Da - Sa × Da

// screen
// colors: (Sca × Da + Dca × Sa - Sca × Dca) + Sca × (1 - Da) + Dca × (1 - Sa)
// alpha: Sa + Da - Sa × Da


// based on src-over
vec4 blendColor(vec4 base, vec4 blend) {
  // b = base
  // s = blend
  // Cs = (1 - αb) x Cs + αb x B(Cb, Cs)
  // Co = αs x Fa x Cs + αb x Fb x Cb

  // Co = αs x Cs + αb x (1 - αs) x Cb
  // Fa = 1; Fb = 1 - αs

  // alpha = (blend.a + (1. - blend.a) * base.a);

  // Sa + Da - Sa × Da
  // float alpha = blend.a + base.a - blend.a * base.a;

  vec4 blended = pdOver(base, blend);

  blended = max(min(blended, 1.), 0.);
  // alpha = max(min(alpha, 1.), 0.);

  // return vec4(blend.a * blended + base.a * (1. - blend.a) * base.rgb, alpha);
  return blended;
}

void main() {
  vec4 bottom = texture(u_bottom_texture, v_tex_coord);
  vec4 top = texture(u_top_texture, v_tex_coord);

  if (bottom.a == 0. && top.a == 0.) {
    discard;
  }

  // Error Color
  vec4 outColor = vec4(1., 0., 1., 1.);

  if (u_blend_mode == 0) {
    bottom.rgb /= bottom.a;
    bottom = max(min(bottom, 1.), 0.);

    top.a *= u_opacity;
    float alpha = bottom.a - top.a;

    alpha = max(min(alpha, 1.), 0.);
  
    outColor = vec4(bottom.rgb * alpha, alpha);
     
  } else if (bottom.a == 0.) {
    outColor = top * u_opacity;
  } else if (top.a == 0.) {
    outColor = bottom;
  } else {
    // bottom.rgb /= bottom.a;
    top *= u_opacity;
    // top.rgb /= top.a;

    bottom = max(min(bottom, 1.), 0.);
    top = max(min(top, 1.), 0.);
    outColor = blendColor(bottom, top);
  }

  fragColor = outColor;
}
