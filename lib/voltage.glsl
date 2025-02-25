float greenVoltage = 1.0;
float blueVoltage  = 2.3;
float redVoltage   = 3.2;
float whiteVoltage = 3.5;
float offVoltage = 4.0;
float    orangeVoltage = mix(  redVoltage,  whiteVoltage, 0.50);
float turquoiseVoltage = mix(greenVoltage,   blueVoltage, 0.75);
float    purpleVoltage = mix( blueVoltage,    redVoltage, 0.50);
float  darkBlueVoltage = mix( blueVoltage, purpleVoltage, 0.50);

float greenHue = 127.7 + 16.0;
float  blueHue = 265.9 + -3.0;
float   redHue = 312.2 + 63.0;
float whiteHue = 312.2 + 80.0;

float halfFloatPrecisionFix = 10.0;

float loadVoltage(vec4 color) {
	if (color.a < 0.0) {
		return offVoltage;
	}
	float voltage = (color.b + color.a) / halfFloatPrecisionFix;
	return voltage;
}

vec4 storeVoltage(float voltage) {
	voltage *= halfFloatPrecisionFix;
	return vec4( 0.0, 0.0, floor(voltage), fract(voltage) );
}

float bendVoltage(float voltage, vec2 uv) {
	uv = pow(abs(uv - 0.5) * 2.0, vec2(10.0));
	float bendStrength = uv.x * smoothstep(orangeVoltage, greenVoltage, voltage);
	float bentVoltage = -bendStrength + voltage;

	return bentVoltage;
}

vec4 voltage2HSLuv(float voltage) {

	float power = smoothstep(offVoltage, whiteVoltage, voltage);

	float hue = greenHue;
	hue += smoothstep(greenVoltage,  blueVoltage, voltage) * ( blueHue - greenHue);
	hue += smoothstep( blueVoltage,   redVoltage, voltage) * (  redHue -  blueHue);
	hue += smoothstep(  redVoltage, whiteVoltage, voltage) * (whiteHue -  redHue);

	float saturation = mix(1.0, 0.0, smoothstep(mix(redVoltage, whiteVoltage, 0.5), whiteVoltage, voltage));

	float reflectance =
		4.0 +
		mix(6.0, 0.0, smoothstep(turquoiseVoltage, darkBlueVoltage, voltage)) +
		mix(0.0, 7.0, smoothstep(purpleVoltage, whiteVoltage, voltage));
	reflectance /= 11.0;

	float whiteScatter = smoothstep(redVoltage, whiteVoltage, voltage) * 0.8;

	float lightness = mix(0.0, 1.0, reflectance * 0.6 + whiteScatter * 0.25);

	float opacity = power;

	return vec4(
		hue,
		saturation,
		lightness,
		opacity
	);
}
