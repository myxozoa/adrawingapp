#version 300 es

precision mediump float;

in vec2 v_position;
out vec4 fragColor;

uniform float u_size;
uniform vec2 u_point;
uniform vec3 u_brush_color;
uniform float u_softness;
uniform float u_flow;
uniform float u_roughness;
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
    vec2 st = ((gl_FragCoord.xy * (1./u_size)) + u_random);

    // Vary the size for rougher brush edges
    float size_random_amount = u_roughness;
    float size_random = random(st);

    float size_adjustment = (size_random * (size_random_amount)) - (size_random_amount - 0.01);

    float size = 1. / clamp(u_size + size_adjustment, 1., 100.);

    // Calculate brush circle
    vec2 position = gl_FragCoord.xy - u_point;
    vec2 point = position * size;
    float dist = circle(point);

    // Color brush circle with transparent falloff
    vec4 main_color = vec4(u_brush_color.rgb, u_flow);
    vec4 transparent = vec4(u_brush_color.rgb, 0.);

    float edge = 1. - (4. - (u_softness * 4.));
    vec4 color = mix(main_color, transparent, smoothstep(edge - (size * 2.), 1., dist));

    // Discarding here appears to be faster
    if (color.a == 0.)
        discard;

    // Add a small amount of noise to the alpha channel

    float alpha_random = random(st);

    float noise_amount = 0.005;

    float alpha = (alpha_random * (noise_amount)) - (noise_amount - 0.01);

    color.a = clamp(color.a - alpha, 0., 1.);
    
    fragColor = color;
}



// #version 300 es

// precision mediump float;

// out vec4 fragColor;

// uniform vec2 u_size;
// uniform vec2 u_point;
// uniform vec3 u_brush_color;
// uniform float u_softness;
// uniform float u_size;
// uniform float u_flow;
// uniform float u_random;

// // book of shaders
// float random(vec2 st)
// {
//     return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
// }

// vec2 skew(vec2 v)
// {
// 	return vec2(-v.y, v.x);
// }

// float aabb(vec2 point, vec2 size)
// {
// 	vec2 d = abs(point) - size;
// 	return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
// }

// float box(vec2 point, vec2 size, vec2 orientation)
// {
//     mat2 matrix = transpose(mat2(orientation, skew(orientation)));
//     return aabb(matrix * point, size);
// }

// float circle(vec2 point)
// {
//     return length(point);
// }

// void main()
// {
//     vec2 position = (gl_FragCoord.xy - u_point + (u_size * .5));
//     vec2 point = ((2. * position) - u_size.xy) * (1. / u_size.y);
//     float rot = 0.9;
//     // float dist = box(point, vec2(0., 1.), vec2(cos(rot), sin(rot)));
//     float dist = circle(point);

//     vec4 main_color = vec4(u_brush_color.rgb, u_flow);
//     vec4 transparent = vec4(u_brush_color.rgb, 0.);

//     float edge = 1. - (4. - (u_softness * 4.));
//     float delta = fwidth(dist);
//     vec4 color = mix(main_color, transparent, smoothstep(clamp(edge - delta, 0., 1.), 1. + delta, dist));

//     // Add a small amount of noise to the alpha channel
//     vec2 st = (gl_FragCoord.xy * (1. / u_size.xy)) + u_random;

//     float randomNumber = random(st);

//     float amount = 0.001;

//     float alpha = (randomNumber * (amount)) - (amount - 0.01);

//     color.a = clamp(color.a - alpha, 0., 1.);
    
//     fragColor = color;
// }