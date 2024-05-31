#version 300 es

precision highp float;

in vec2 v_tex_coord;
out vec4 fragColor;

// With float textures iOS requires explicit precision or it will default to low
uniform highp sampler2D textureSampler;

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

void main() {
  vec4 color = texture(textureSampler, v_tex_coord);

  if (color.a == 0.)
    discard;

  color.rgb /= color.a;
  color.rgb = tosRGB(color.rgb);
  color.rgb *= color.a;

  fragColor = color;
}
