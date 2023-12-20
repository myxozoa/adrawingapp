#version 300 es

precision highp float;

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

void main()
{
    float d = (distance(u_point.xy, gl_FragCoord.xy) / (u_resolution.x * 2.)) * u_size;
    
    vec4 main_color = vec4(u_brush_color.rgb, u_flow);
    vec4 transparent = vec4(u_brush_color.rgb, 0.0);
   	
    float start = 0.;
    float mid = u_softness;
    float end = 1.;
    
    vec4 color = mix(main_color, transparent, smoothstep(start, mid, d));
    color = mix(main_color, transparent, smoothstep(mid, end, d));

    if (color.a == 0.0)
        discard;

    // Add a small amount of noise to the alpha channel
    vec2 st = (gl_FragCoord.xy / u_resolution.xy) + u_random;

    float randomNumber = random(st);

    float amount = 0.001;

    float alpha = (randomNumber * (amount)) - (amount - 0.01);

    color.a = clamp(color.a - alpha, 0., 1.);
    
    fragColor = color;
}