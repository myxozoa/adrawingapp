#version 300 es

precision highp float;

uniform vec2 u_size;

in vec2 a_position;
out vec2 v_tex_coord;

uniform mat3 u_matrix;

void main() {
  vec2 temp = a_position / u_size;
  v_tex_coord = temp;

  gl_Position = vec4((u_matrix * vec3(a_position, 1.)).xy, 0., 1.);
}