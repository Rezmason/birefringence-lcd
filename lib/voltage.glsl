float greenVoltage = 1.0;
float blueVoltage  = 2.3;
float redVoltage   = 3.2;
float whiteVoltage = 3.5;
float    orangeVoltage = mix(  redVoltage,  whiteVoltage, 0.50);
float turquoiseVoltage = mix(greenVoltage,   blueVoltage, 0.75);
float    purpleVoltage = mix( blueVoltage,    redVoltage, 0.50);
float  darkBlueVoltage = mix( blueVoltage, purpleVoltage, 0.50);

float greenHue = 127.7 + 16.0;
float  blueHue = 265.9 + -3.0;
float   redHue = 312.2 + 63.0;
float whiteHue = 312.2 + 80.0;

float halfFloatPrecisionFix = 10.0;

float loadVoltage(float voltage) {
	voltage *= halfFloatPrecisionFix;
	if (voltage < 0.0) {
		voltage = whiteVoltage;
	}
	return voltage;
}

float storeVoltage(float voltage) {
	return voltage / halfFloatPrecisionFix;
}

float bendVoltage(float voltage, vec2 uv) {
	uv = pow(abs(uv - 0.5) * 2.0, vec2(10.0));
	float bendStrength = uv.x * smoothstep(orangeVoltage, greenVoltage, voltage);
	float bentVoltage = -bendStrength + voltage;

	return bentVoltage;
}

vec3 voltage2HSLuv(float voltage) {

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

	float whiteScatter = smoothstep(redVoltage, whiteVoltage, voltage);

	float lightness = mix(0.0, 1.0, reflectance * 0.6 + whiteScatter * 0.25);

	return vec3(
		hue,
		saturation,
		lightness
	);
}
