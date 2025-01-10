vec3 hsv2Hue(float h) {
	vec3 n = vec3(0.0, 8.0, 4.0);
	vec3 k = mod(n + h / 30.0, 12.0);
	return max(min(vec3(1.0), min(k - 3.0, 9.0 - k)), vec3(-1.0));
}

vec3 hsv2rgb(vec3 hsv) {
	vec3 h = hsv2Hue(hsv.x);
	vec3 s = vec3(hsv.y);
	vec3 v = vec3(hsv.z);
	vec3 rgb = v - v * s * h;
	return rgb;
}
