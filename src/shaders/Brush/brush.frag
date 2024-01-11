#version 300 es

precision mediump float;

out vec4 fragColor;

uniform vec2 u_resolution;
uniform vec2 u_point;
uniform vec3 u_brush_color;
uniform float u_softness;
uniform float u_size;
uniform float u_flow;
uniform float u_random;

// book of shaders
float random(vec2 st)
{
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float circle(vec2 point)
{
    return length(point);
}

void main()
{
    vec2 position = (gl_FragCoord.xy - u_point + (u_resolution * .5));
    vec2 point = ((2. * position) - u_resolution.xy) * (1. / u_resolution.y);
    float rot = 0.9;
    float dist = circle(point);

    vec4 main_color = vec4(u_brush_color.rgb, u_flow);
    vec4 transparent = vec4(u_brush_color.rgb, 0.);

    float edge = 1. - (4. - (u_softness * 4.));
    float delta = fwidth(dist);
    vec4 color = mix(main_color, transparent, smoothstep(clamp(edge - delta, 0., 1.), 1. + delta, dist));

    // Add a small amount of noise to the alpha channel
    vec2 st = (gl_FragCoord.xy * (1. / u_resolution.xy)) + u_random;

    float randomNumber = random(st);

    float amount = 0.001;

    float alpha = (randomNumber * (amount)) - (amount - 0.01);

    color.a = clamp(color.a - alpha, 0., 1.);
    
    fragColor = color;
}