#version 300 es

in vec2 a_position;
out vec2 v_position;

uniform mat3 u_matrix;

void main() {
  v_position = a_position;
  gl_Position = vec4((u_matrix * vec3(a_position, 1.)).xy, 0., 1.);
}