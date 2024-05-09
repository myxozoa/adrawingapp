#version 300 es

precision highp float;

in vec2 a_position;
in vec2 a_tex_coord;
out vec2 v_tex_coord;

uniform mat3 u_matrix;

void main() {
  v_tex_coord = vec2(a_tex_coord.x, 1.-a_tex_coord.y);

  gl_Position = vec4((u_matrix * vec3(a_position, 1.)).xy, 0., 1.);
}