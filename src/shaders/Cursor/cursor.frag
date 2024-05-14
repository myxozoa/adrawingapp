#version 300 es

precision highp float;

in vec2 v_position;
out vec4 fragColor;

uniform vec3 u_point_size;

float circle(vec2 point)
{
    return length(point);
}

void main()
{
    vec2 u_point = u_point_size.xy;
    float u_size = u_point_size.z;

    float size = 1. / u_size;

    // Calculate brush circle
    vec2 b_position = gl_FragCoord.xy - u_point;
    vec2 b_point = b_position * size;
    float black_dist = (circle(b_point));

    vec2 w_position = gl_FragCoord.xy - vec2(u_point.x + 2., u_point.y);
    vec2 w_point = w_position * size;
    float white_dist = (circle(w_point));

    vec4 white = vec4(1., 1., 1., 1.);
    vec4 black = vec4(0., 0., 0., 1.);
    vec4 transparent = vec4(0., 0., 0., 0.);

    float black_inner = (smoothstep(0.99, 1.0, black_dist));
    float black_outer = (smoothstep(0.98, 0.99, black_dist));

    vec4 black_circle = mix(transparent, black, black_outer - black_inner);

    float white_inner = (smoothstep(0.99, 1.0, white_dist));
    float white_outer = (smoothstep(0.98, 0.99, white_dist));

    vec4 white_circle = mix(transparent, white, white_outer - white_inner);

    vec4 color = white_circle + black_circle;
    // Discarding here appears to be faster
    // if (color.a == 0.)
    //     discard;
      
    // fragColor = color;

    fragColor = vec4(1., 0., 1., 0.2);
}
