#version 300 es

precision highp float;

in vec2 a_position;

uniform vec3 u_point_random;
uniform vec4 u_brush_qualities;

void main() {
  float u_size = u_brush_qualities.w;

  vec2 u_point = u_point_random.xy;
  
  // Give enough pixels around quad to account for decent smooth edges
  float scale_by = (u_size) + 8.;
  mat3 translation_matrix = mat3(vec2(1., 0.), 0., vec2(0, 1.), 0., u_point, 1.);
  mat3 scale_matrix = mat3(
    translation_matrix[0][0] * scale_by, 
    translation_matrix[0][1] * scale_by, 
    translation_matrix[0][2] * scale_by,

    translation_matrix[1][0] * scale_by,
    translation_matrix[1][1] * scale_by,
    translation_matrix[1][2] * scale_by,

    translation_matrix[2][0],
    translation_matrix[2][1],
    translation_matrix[2][2]
    );

  gl_Position = vec4((scale_matrix * vec3(a_position, 0.)), 1.);
}