#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

// we need to declare an output for the fragment shader
out vec4 outColor;

uniform vec2 u_resolution;
uniform vec3 u_brush_color;
uniform float u_softness;
uniform float u_size;

// book of shaders
float random(vec2 st)
{
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main()
{
    float d = distance(u_resolution.xy * 0.5, gl_FragCoord.xy) / u_resolution.y * u_size;
    
    vec4 main_color = vec4(u_brush_color.rgb, 1.0);
    vec4 transparent = vec4(u_brush_color.rgb, 0.0);
   	
    float start = 0.;
    float mid = u_softness;
    float end = 1.;
    
    vec4 color = mix(main_color, transparent, smoothstep(start, mid, d));
    color = mix(main_color, transparent, smoothstep(mid, end, d));

    vec2 st = gl_FragCoord.xy / u_resolution.xy;

    float randomNumber = random(st);
    float amount = 0.01;

    float alpha = (randomNumber * (amount)) - (amount - 0.01);

    color.a = clamp(color.a + alpha, 0., 1.);
    
    outColor = color;
}