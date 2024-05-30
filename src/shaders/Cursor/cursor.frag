#version 300 es

precision highp float;

in vec2 v_position;
in vec2 v_tex_coords;
out vec4 fragColor;

uniform float u_opacity;

float circle(vec2 point)
{
    return length(point);
}

void main()
{
    // Calculate brush circle
    vec2 centeredUV = v_tex_coords * 2.0 - 1.0;

    float white_dist = circle(centeredUV);
    float offset = fwidth(white_dist);
    float black_dist = circle(centeredUV);

    vec3 white = vec3(1., 1., 1.);
    vec3 black = vec3(0., 0., 0.);

    float black_inner = step(black_dist, 1. - offset * 2.);
    float black_outer = step(black_dist, 1. - offset);

    float black_circle_alpha = mix(0., 1., black_outer - black_inner) * u_opacity;

    vec4 black_circle = vec4(black * black_circle_alpha, black_circle_alpha);

    float white_inner = step(white_dist, 1. - offset);
    float white_outer = step(white_dist, 1.);

    float white_circle_alpha  = mix(0., 1., white_outer - white_inner) * u_opacity;
    vec4 white_circle = vec4(white * white_circle_alpha, white_circle_alpha);

    vec4 color = black_circle + white_circle;

    // Discarding here appears to be faster
    if (color.a == 0.)
        discard;
      
    fragColor = color;
}
