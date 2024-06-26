#version 300 es

precision highp float;

in vec2 a_position;
out vec2 v_tex_coords;

uniform mat3 u_matrix;

void main() {
  vec2 position = (u_matrix * vec3(a_position, 1.)).xy;
  gl_Position = vec4(position, 0., 1.);

  vec2 temp = (a_position + 1.) * 0.5;
  temp.y = 1. - temp.y;
  v_tex_coords = temp;
}