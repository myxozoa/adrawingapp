#version 300 es

in vec2 a_position;
in vec2 a_tex_coord;
out vec2 texCoords;

void main() {
  texCoords = a_tex_coord;

  gl_Position = vec4(a_position, 0, 1.0);
}