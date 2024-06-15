#version 300 es

precision highp float;

in vec2 v_tex_coord;
out vec4 fragColor;

uniform float u_opacity;
uniform bool u_clipping_mask;
uniform int u_blend_mode;

// With float textures iOS requires explicit precision or it will default to low
uniform highp sampler2D u_bottom_texture;
uniform highp sampler2D u_top_texture;
uniform highp sampler2D u_clipping_mask_texture;

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
vec4 tosRGB(vec4 linearRGB) {
    return vec4(
    tosRGBValue(linearRGB.r),
    tosRGBValue(linearRGB.g),
    tosRGBValue(linearRGB.b),
    tosRGBValue(linearRGB.a)
  );
}

float toLinearRGBValue(float sRGBValue) {
    return sRGBValue <= 0.04045 ? sRGBValue / 12.92 : pow((sRGBValue + 0.055) / 1.055, 2.4);
}
vec3 toLinearRGB(vec3 sRGB) {
  return vec3 (
    toLinearRGBValue(sRGB.r),
    toLinearRGBValue(sRGB.g),
    toLinearRGBValue(sRGB.b)
  );
}
vec4 toLinearRGB(vec4 sRGB) {
  return vec4 (
    toLinearRGBValue(sRGB.r),
    toLinearRGBValue(sRGB.g),
    toLinearRGBValue(sRGB.b),
    toLinearRGBValue(sRGB.a)
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

float overlayComponent(float base, float baseA, float blend, float blendA) {
  if (2. * base < baseA) {
    return base * blend * 2.;
  } else {
    // Sa × Da - 2 × (Da - Dca) × (Sa - Sca)
    return blendA * baseA - 2. * (baseA - base) * (blendA - blend);
  }
}

vec4 overlay(vec4 base, vec4 blend) {
  return vec4(overlayComponent(base.r, base.a, blend.r, blend.a), 
              overlayComponent(base.g, base.a, blend.g, blend.a),
              overlayComponent(base.b, base.a, blend.b, blend.a),
              overlayComponent(base.a, base.a, blend.a, blend.a));
}

vec4 darken(vec4 base, vec4 blend) {
  return min(blend * base.a, base * blend.a);
}

vec4 lighten(vec4 base, vec4 blend) {
  return max(blend * base.a, base * blend.a);
}

float colorDodgeComponent(float base, float baseA, float blend, float blendA) {
    if (blend == blendA && base == 0.) {
      return 0.;
    } else if (blend == blendA) {
      return baseA * blendA;
    } else if (blend < blendA) {
      // Sa × Da × min(1, Dca/Da × Sa/(Sa - Sca))
      return baseA * blendA *  min(1., base / baseA * blendA / (blendA - blend));
    }

    return 1.;
}

vec4 colorDodge(vec4 base, vec4 blend) {
  return vec4(colorDodgeComponent(base.r, base.a, blend.r, blend.a), 
              colorDodgeComponent(base.g, base.a, blend.g, blend.a),
              colorDodgeComponent(base.b, base.a, blend.b, blend.a),
              colorDodgeComponent(base.a, base.a, blend.a, blend.a));
}

float colorBurnComponent(float base, float baseA, float blend, float blendA) {
  if (blend == 0. && base == baseA) {
      return baseA * blendA;
  } else if (blend == 0.) {
    return 0.;
  } else if (blend > 0.) {
    // Sa × Da - Sa × Da × min(1, (1 - Dca/Da) × Sa/Sca)
    return blendA * baseA - blendA * baseA * min(1., (1. - base / baseA) * blendA / blend);
  }

  return 0.;
}

vec4 colorBurn(vec4 base, vec4 blend) {
  return vec4(colorBurnComponent(base.r, base.a, blend.r, blend.a), 
              colorBurnComponent(base.g, base.a, blend.g, blend.a),
              colorBurnComponent(base.b, base.a, blend.b, blend.a),
              colorBurnComponent(base.a, base.a, blend.a, blend.a));
}


float hardLightComponent(float base, float baseA, float blend, float blendA) {
  if (2. * blend <= blendA) {
    return 2. * base * blend;
  } else {
    //  Sa × Da - 2 × (Da - Dca) × (Sa - Sca)
    return baseA * blendA - 2. * (baseA - base) * (blendA - blend);
  }
}

vec4 hardLight(vec4 base, vec4 blend) {
  return vec4(hardLightComponent(base.r, base.a, blend.r, blend.a), 
              hardLightComponent(base.g, base.a, blend.g, blend.a),
              hardLightComponent(base.b, base.a, blend.b, blend.a),
              hardLightComponent(base.a, base.a, blend.a, blend.a));
}

float softLightComponent(float base, float baseA, float blend, float blendA) {
  float m = base / baseA;

  if (2. * blend <= blendA) {
    // Dca × (Sa + (2 × Sca - Sa) × (1 - m)) 
    return base * (blendA + (2. * blend - blendA) * (1. - m));

    // if 2 × Sca > Sa and 4 × Dca <= Da
  } else if (2. * blend > blendA && 4. * base <= baseA) {
    // Dca × Sa + Da × (2 × Sca - Sa) × (4 × m × (4 × m + 1) × (m - 1) + 7 × m)
    return  base * blendA + baseA * (2. * blend - blendA) * (4. * m * (4. * m + 1.) * (m - 1.) + 7. * m);

    // if 2 × Sca > Sa and 4 × Dca > Da
  } else if (2. * blend > blendA && 4. * base > baseA) {
    // Dca × Sa + Da × (2 × Sca - Sa) × (m^0.5 - m)
    return base * blendA + baseA * (2. * blend - blendA) * (pow(m, 0.5) - m);
  }

}

vec4 softLight(vec4 base, vec4 blend) {
  return vec4(softLightComponent(base.r, base.a, blend.r, blend.a), 
              softLightComponent(base.g, base.a, blend.g, blend.a),
              softLightComponent(base.b, base.a, blend.b, blend.a),
              softLightComponent(base.a, base.a, blend.a, blend.a));
}

vec4 difference(vec4 base, vec4 blend) {
  //  abs(Dca × Sa - Sca × Da)
  return abs(base * blend.a - blend * base.a);
}

vec4 exclusion(vec4 base, vec4 blend) {
  // (Sca × Da + Dca × Sa - 2 × Sca × Dca)
  return blend * base.a + base * blend.a - 2. * blend * base;
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

    // Overlay Mode
    case 4:
      result = overlay(base, blend);

      break;

    // Darken Mode
    case 5:
      result = darken(base, blend);

      break;
  
    // Lighten Mode
    case 6:
      result = lighten(base, blend);

      break;

    // Color Dodge Mode
    case 7:
      result = colorDodge(base, blend);
      
      break;

    // Color Burn Mode
    case 8:
      result = colorBurn(base, blend);

      break;

    // Hard Light Mode
    case 9:
      result = hardLight(base, blend);

      break;

    // Soft Light Mode
    case 10:
      result = softLight(base, blend);

      break;

    // Difference Mode
    case 11:
      result = difference(base, blend);

      break;

    // Exclusion Mode
    case 12:
      result = exclusion(base, blend);

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

// color dodge
// if Sca == Sa and Dca == 0
//   colors: Sca × (1 - Da) + Dca × (1 - Sa)
// otherwise if Sca == Sa
//   colors: Sa × Da + Sca × (1 - Da) + Dca × (1 - Sa)
// otherwise if Sca < Sa
//   colors: Sa × Da × min(1, Dca/Da × Sa/(Sa - Sca)) + Sca × (1 - Da) + Dca × (1 - Sa)
// alpha: Sa + Da - Sa × Da

// color burn
// if Sca == 0 and Dca == Da
//   colors: Sa × Da + Sca × (1 - Da) + Dca × (1 - Sa)
// otherwise if Sca == 0
//   colors: Sca × (1 - Da) + Dca × (1 - Sa)
// otherwise if Sca > 0
//   colors: Sa × Da - Sa × Da × min(1, (1 - Dca/Da) × Sa/Sca) + Sca × (1 - Da) + Dca × (1 - Sa)
// alpha: Sa + Da - Sa × Da

// hard light
// if 2 × Sca <= Sa
//   colors: 2 × Sca × Dca + Sca × (1 - Da) + Dca × (1 - Sa)
// otherwise
//   colors: Sa × Da - 2 × (Da - Dca) × (Sa - Sca) + Sca × (1 - Da) + Dca × (1 - Sa)
// alpha: Sa + Da - Sa × Da

// soft light
// if 2 × Sca <= Sa
//   colors: Dca × (Sa + (2 × Sca - Sa) × (1 - m)) + Sca × (1 - Da) + Dca × (1 - Sa)
// otherwise if 2 × Sca > Sa and 4 × Dca <= Da
//   colors: Dca × Sa + Da × (2 × Sca - Sa) × (4 × m × (4 × m + 1) × (m - 1) + 7 × m) + Sca × (1 - Da) + Dca × (1 - Sa)
// otherwise if 2 × Sca > Sa and 4 × Dca > Da
//   colors: Dca × Sa + Da × (2 × Sca - Sa) × (m^0.5 - m) + Sca × (1 - Da) + Dca × (1 - Sa)
// alpha: Sa + Da - Sa × Da
//   Where:
//     m = Dca/Da

// difference
// colors: abs(Dca × Sa - Sca × Da) + Sca × (1 - Da) + Dca × (1 - Sa)
// alpha: Sa + Da - Sa × Da

// exclusion
// colors: (Sca × Da + Dca × Sa - 2 × Sca × Dca) + Sca × (1 - Da) + Dca × (1 - Sa)
// alpha: Sa + Da - Sa × Da


// based on src-over
vec4 blendColor(vec4 base, vec4 blend) {
  // b = base
  // s = blend
  // Cs = (1 - αb) x Cs + αb x B(Cb, Cs)
  // Co = αs x Fa x Cs + αb x Fb x Cb

  // Co = αs x Cs + αb x (1 - αs) x Cb
  // Fa = 1; Fb = 1 - αs
  vec4 blended = vec4(1., 0., 1., 1.);

  if (u_blend_mode == 0) {
    // base * (1. - blend.a)
    blended = base * (1. - blend.a);


  } else {
    blended = pdOver(base, blend);
  }

  return blended;
}

void main() {
  vec4 bottom = texture(u_bottom_texture, v_tex_coord);
  vec4 top = texture(u_top_texture, v_tex_coord);

  if (bottom.a == 0. && top.a == 0.) {
    discard;
  }

  // bottom = max(min(bottom, 1.), 0.);
  // top = max(min(top, 1.), 0.);

  // bottom = toLinearRGB(bottom);
  // top = toLinearRGB(top);

  top *= u_opacity;
  
  if (u_clipping_mask) {
    vec4 clippingMask = texture(u_clipping_mask_texture, v_tex_coord);

    top *= clippingMask.a;
  }

  // Error Color
  vec4 outColor = vec4(1., 0., 1., 1.);

  vec4 blended = blendColor(bottom, top);

  outColor = blended;

  // outColor = max(min(outColor, 1.), 0.);

  // outColor = tosRGB(outColor);

  fragColor = outColor;
}
