#version 300 es

precision highp float;

out vec4 fragColor;

uniform vec2 u_resolution;
uniform vec2 u_point;
uniform vec3 u_brush_color;
uniform float u_softness;
uniform float u_size;
uniform float u_flow;

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

    // vec2 st = gl_FragCoord.xy / u_resolution.xy;

    // float randomNumber = random(st);

    // float amount = 0.01;

    // float alpha = (randomNumber * (amount)) - (amount - 0.01);

    // color.a = clamp(color.a + alpha, 0., 1.);

    // uvec4 temp = uvec4(0, 0, 0, 0);

    // temp.r = floatBitsToUint(color.r);
    // temp.g = floatBitsToUint(color.g);
    // temp.b = floatBitsToUint(color.b);
    // temp.a = floatBitsToUint(color.a);

    // fragColor = temp;

    if (color.a == 0.0)
        discard;
    
    fragColor = color;
}