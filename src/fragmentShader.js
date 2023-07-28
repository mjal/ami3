/*const fragmentShader = `
uniform float iTime;
uniform vec2 iResolution;
varying vec2 vUv;

vec3 colorA = vec3(0.912,0.191,0.652);
vec3 colorB = vec3(1.000,0.777,0.052);

void main() {
  // "Normalizing" with an arbitrary value
  // We'll see a cleaner technique later :)   
  vec2 normalizedPixel = gl_FragCoord.xy/600.0;
  vec3 color = mix(colorA, colorB, normalizedPixel.x);

  gl_FragColor = vec4(color,1.0);

  vec2 uv = gl_FragCoord.xy/iResolution.xy;
  gl_FragColor = vec4(sin(iTime),uv.y,.0,1.0);
}
`
*/
const fragmentShader = `
uniform float iTime;
uniform vec2 iResolution;

// I am a newbie, exploring ray marching and diffuse lightning with help from
// Jamie Wong (https://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/) and
// Michael Walczyk (https://michaelwalczyk.com/blog-ray-marching.html)
// Helpful comments welcome.


const float EPSILON = 0.0001;


// Rigid body transforms

mat4 rotate_y(float theta) {
    float c = cos(theta);
    float s = sin(theta);

    return mat4(
        vec4(c,  0., s,  0.),
        vec4(0., 1., 0., 0.),
        vec4(-s, 0., c,  0.),
        vec4(0., 0., 0., 1.)
    );
}


// Constructive solid geometry

float sdf_intersection(float sdf_A, float sdf_B) {
    return max(sdf_A, sdf_B);
}

float sdf_union(float sdf_A, float sdf_B) {
    return min(sdf_A, sdf_B);
}

float sdf_difference(float sdf_A, float sdf_B) {
    return max(sdf_A, -sdf_B);
}


// Signed distance functions

float sdf_cube(vec3 position, float side) {
    vec3 d = abs(position) - vec3(side);
    float inside_dist = min(max(d.x, max(d.y, d.z)), 0.0);
    float outside_dist = length(max(d, 0.0));
    
    return inside_dist + outside_dist;
}

float sdf_sphere(vec3 position, float radius) {
    return length(position) - radius;
}

float sdf_scene(vec3 position) {
    float displacement = sin(sin(3. * iTime) * 5. * position.x) * 
                         sin(sin(2. * iTime) * 3. * position.y) * 
                         sin(sin(5. * iTime) * 2. * position.z) * 0.25;
    float sphere = sdf_sphere(position, 1.3);
    float cube = sdf_cube(position, 1.);
    
    return sdf_intersection(cube + displacement, sphere);
}


// Lighting

vec3 estimate_normal(vec3 p) {
    const vec3 small_step = vec3(EPSILON, 0., 0.);
    
    float gradient_x = sdf_scene(p + small_step.xyy) - sdf_scene(p - small_step.xyy);
    float gradient_y = sdf_scene(p + small_step.yxy) - sdf_scene(p - small_step.yxy);
    float gradient_z = sdf_scene(p + small_step.yyx) - sdf_scene(p - small_step.yyx);
    
    return normalize(vec3(gradient_x, gradient_y, gradient_z));
}

vec3 light_position = vec3(2., -5., 0.);

float diffuse_lighting(vec3 position) {
    vec3 light_direction = normalize(light_position - position);
    vec3 normal = estimate_normal(position);
    float lambertian = max(dot(normal, light_direction), 0.);
    return lambertian;
}

float blinn_phong_lighting(vec3 position) {
    float shininess = 16.;
    float specular_intensity = 0.;

    vec3 light_direction = normalize(light_position - position);
    light_direction = normalize(light_direction);
    vec3 normal = estimate_normal(position);
    float lambertian = max(dot(light_direction, normal), 0.);

    if (lambertian > 0.) {
        vec3 view_direction = normalize(- position);
        vec3 half_direction = normalize(view_direction + light_direction);
        float specular_angle = max(dot(half_direction, normal), 0.);
        specular_intensity = pow(specular_angle, shininess); 
    }

    return specular_intensity;
}

// Gamma correction, suggested by Spalmer
vec3 gamma_correction(vec3 color) {
    float gamma = 2.2; // TO DO: what about sqrt() instead of pow()?
                       // 2 is almost 2.2 ;-) --- but is it worth it?
    return pow(color, vec3(1. / gamma));
}



// Camera and views

vec3 ray_direction(float field_of_view, vec2 size, vec2 fragCoord) {
    vec2 xy = fragCoord - size / 2.0;
    float z = size.y / tan(radians(field_of_view) / 2.0);
    return normalize(vec3(xy, -z));
}

mat4 view_matrix(vec3 eye, vec3 center, vec3 up) {
    vec3 f = normalize(center - eye);
	vec3 s = normalize(cross(f, up));
	vec3 u = cross(s, f);
	return mat4(
		vec4(s,        0.),
		vec4(u,        0.),
		vec4(-f,       0.),
		vec4(vec3(0.), 1.));
}


// Ray marching

vec3 ray_march(vec3 origin, vec3 direction) {
    const int STEPS_MAX = 255;
    const float HIT_DIST_MIN = EPSILON;
    const float TRACE_DIST_MAX = 100.;
    float total_distance_traveled = 0.;
    float distance_to_closest;
    vec3 current_position;

    for (int i = 0; i < STEPS_MAX; i++) {
        current_position = direction * total_distance_traveled + origin;
        distance_to_closest = sdf_scene(current_position);
        if ((distance_to_closest < HIT_DIST_MIN) || (total_distance_traveled > TRACE_DIST_MAX))
            break;
        total_distance_traveled += distance_to_closest;
    }
    
    if (distance_to_closest < HIT_DIST_MIN)
        return current_position;
    else
        return vec3(0.);
}


// Main image

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy)/iResolution.xx;
    
    vec3 view_direction = ray_direction(45., iResolution.xy, fragCoord);
    vec3 eye = (rotate_y(-iTime) * vec4(8., 5., 7., 1.)).xyz;  
    mat4 view_to_world = view_matrix(eye, vec3(0.), vec3(0., 1., 0.));
    vec3 world_direction = (view_to_world * vec4(view_direction, 0.)).xyz;
    
    vec3 position = ray_march(eye, world_direction);
    vec3 color_linear = vec3(0.) + // ambient color
                        diffuse_lighting(position) * vec3(1., 0., 0.) +
                        blinn_phong_lighting(position) * vec3(1.);
    vec3 color_corrected = gamma_correction(color_linear);
    
    fragColor = vec4(color_corrected, 1.);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`
export default fragmentShader