#version 300 es

precision highp float;

in vec2 v_tex_coord;
out vec4 fragColor;

uniform float u_opacity;
uniform int u_blend_mode;

// With float textures iOS requires explicit precision or it will default to low
uniform highp sampler2D u_bottom_texture;
uniform highp sampler2D u_top_texture;

float tosRGBValue(float linearRGBValue) {
    return linearRGBValue <= 0.0031308 ? linearRGBValue * 12.92 :( 1.055 * pow(linearRGBValue, 1. / 2.4)) - 0.055;
}
vec3 tosRGB(vec3 linearRGB) {
  return vec3(
    tosRGBValue(linearRGB.r),
    tosRGBValue(linearRGB.g),
    tosRGBValue(linearRGB.b)
  );
}

float toLinearRGBValue(float sRGBValue) {
    return sRGBValue <= 0.04045 ? sRGBValue * (1. / 12.92) : pow((sRGBValue + 0.055) * (1. / 1.055), 2.4);
}
vec3 toLinearRGB(vec3 sRGB) {
  return vec3 (
    toLinearRGBValue(sRGB.r),
    toLinearRGBValue(sRGB.g),
    toLinearRGBValue(sRGB.b)
  );
}

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
  vec4 result;

  //Cr = (1 - αb) x Cs + αb x B(Cb, Cs)
  switch(u_blend_mode) {
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
  return result + blend * (1. - base.a) + base * (1. - blend.a);
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

// overlay
// if 2 × Dca <= Da
//   colors: 2 × Sca × Dca + Sca × (1 - Da) + Dca × (1 - Sa)
// otherwise
//   colors: Sa × Da - 2 × (Da - Dca) × (Sa - Sca) + Sca × (1 - Da) + Dca × (1 - Sa)
// alpha: Sa + Da - Sa × Da

// darken
// colors: min(Sca × Da, Dca × Sa) + Sca × (1 - Da) + Dca × (1 - Sa)
// alpha:  Sa + Da - Sa × Da 

// lighten
// colors:max(Sca × Da, Dca × Sa) + Sca × (1 - Da) + Dca × (1 - Sa)
// alpha: Sa + Da - Sa × Da 

// based on src-over
vec4 blendColor(vec4 base, vec4 blend) {
  // b = base
  // s = blend
  // Cs = (1 - αb) x Cs + αb x B(Cb, Cs)
  // Co = αs x Fa x Cs + αb x Fb x Cb

  // Co = αs x Cs + αb x (1 - αs) x Cb
  // Fa = 1; Fb = 1 - αs

  vec4 blended = pdOver(base, blend);

  return blended;
}

void main() {
  vec4 bottom = texture(u_bottom_texture, v_tex_coord);
  vec4 top = texture(u_top_texture, v_tex_coord);

  if (bottom.a == 0. && top.a == 0.) {
    discard;
  }

  bottom = max(min(bottom, 1.), 0.);
  top = max(min(top, 1.), 0.);

  bottom.rgb = toLinearRGB(bottom.rgb);
  top.rgb = toLinearRGB(top.rgb);

  bottom.a = toLinearRGBValue(bottom.a);
  top.a = toLinearRGBValue(top.a);

  top *= u_opacity;

  // Error Color
  vec4 outColor = vec4(1., 0., 1., 1.);

  if (u_blend_mode == 0) {
    bottom.rgb /= bottom.a;

    // base * (1. - blend.a)
    vec4 blended = vec4(bottom.rgb, bottom.a * (1. - top.a));

    blended.rgb *= blended.a;

    outColor = blended;
  } else {
    vec4 blended = blendColor(bottom, top);

    outColor = blended;
  }

  outColor = max(min(outColor, 1.), 0.);

  outColor.a = tosRGBValue(outColor.a);
  outColor.rgb = tosRGB(outColor.rgb);

  fragColor = outColor;
}
