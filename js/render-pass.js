import { createTexture, createProgram, createQuad, createPass } from "./factory.js";

const [hsluv, snoise, voltage] = await Promise.all(
	["./lib/hsluv-glsl.fsh", "./lib/snoise2d.glsl", "./lib/voltage.glsl"].map((url) => fetch(url).then((r) => r.text())),
);

export default (context, initialDisplaySize, displayMargin, inputRenderTarget) =>
	createPass(context, {
		init: (context) => {
			const quad = createQuad(context);

			const program = createProgram(context, {
				vertex: `
							attribute vec2 aPos;
							varying vec2 vUV;

							void main() {
								vUV = (aPos + 1.0) * 0.5;
								gl_Position = vec4(aPos, 0.0, 1.0);
							}
						`,
				fragment: `
							precision highp float;
							#define PI 3.14159265359

							varying vec2 vUV;
							uniform vec2 uDisplaySize, uDisplayMargin;
							uniform vec2 uShadowOffset;
							uniform sampler2D uSampler;

							${voltage}
							${hsluv}
							${snoise}

							highp float randomFloat( vec2 uv ) {
								const highp float a = 12.9898, b = 78.233, c = 43758.5453;
								highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
								return fract(sin(sn) * c);
							}

							void main() {
								vec2 displayUV = vUV;
								displayUV -= 0.5;
								displayUV *= (uDisplaySize + uDisplayMargin) / uDisplaySize;
								displayUV += 0.5;

								bool outOfBounds = min(displayUV.x, displayUV.y) < 0.0 || max(displayUV.x, displayUV.y) > 1.0;
								vec2 nearestNeighborUV = floor(displayUV * uDisplaySize) / uDisplaySize;
								vec4 color1 = voltage2HSLuv(bendVoltage(
									loadVoltage(texture2D(uSampler, nearestNeighborUV).w),
									displayUV
								));
								vec2 pixel1 = abs(fract(displayUV * uDisplaySize) - 0.5) * 2.0;
								float cover1 = clamp(0.9 - pow(max(pixel1.x, pixel1.y), 20.0), 0.75, 1.0);
								if (outOfBounds) {
									color1 = vec4(0.0, 0.0, 1.0, 0.0);
									cover1 = 0.0;
								}

								vec2 shadowUV = displayUV + uShadowOffset;
								vec2 nearestNeighborShadowUV = floor(shadowUV * uDisplaySize) / uDisplaySize;
								vec4 color2 = voltage2HSLuv(bendVoltage(
									loadVoltage(texture2D(uSampler,  nearestNeighborShadowUV).w),
									shadowUV
								));

								vec2 pixel2 = fract(shadowUV * uDisplaySize);
								pixel2.x = 1.0 - pixel2.x;
								float cover2 = mix(0.9, 0.0, clamp(1.4 * (max(pixel2.x, pixel2.y) - 0.5), 0.0, 1.0));
								cover2 *= clamp(100.0 / uDisplaySize.x, 0.0, 1.0);
								if (outOfBounds) {
									cover2 *= 1.5;
								}
								if (min(shadowUV.x, shadowUV.y) < 0.0 || max(shadowUV.x, shadowUV.y) > 1.0) {
									cover2 = 0.0;
								}

								vec2 shiftUV = vUV * 2.0 - 1.0;
								float shift = clamp(abs(shiftUV.x - shiftUV.y) - 1.5, 0.0, 1.0);
								color1 += shift * 0.4;
								color2 += shift * 0.4;

								vec3 background = vec3(150.0, 0.3, 0.7);
								if (displayUV.x < 0.0 && clamp(displayUV.y, 0.0, 1.0) == displayUV.y) {
									background.z += (1.0 - pixel1.y) * 0.02;
								}

								if (displayUV.y > 1.0 && clamp(displayUV.x, 0.0, 1.0) == displayUV.x) {
									background.z += (1.0 - pixel1.x) * 0.02;
								}

								float shadow1 = min((1.0 - displayUV.x) * uDisplaySize.x * 0.5, (displayUV.y) * uDisplaySize.y * 0.5) + 1.5;
								shadow1 = clamp(shadow1, 0.0, 1.0);
								background.z *= mix(0.6, 1.0, shadow1);

								float shadow2 = min((displayUV.x) * uDisplaySize.x * 0.8, (1.0 - displayUV.y) * uDisplaySize.y * 0.8) + 2.5;
								shadow2 = clamp(shadow2, 0.0, 1.0);
								background.z *= mix(0.8, 1.0, shadow2);

								float speckle = mix(-0.1, 0.2, randomFloat(vUV)) + snoise(vUV * uDisplaySize * 4.0) * 0.1;
								speckle = mix(0.0, speckle, (color1.z - 0.5) * 2.0);
								color1.z += speckle * mix(0.4, 0.2, color1.y);
								color2.z += speckle * mix(0.0, 0.2, color1.y);
								background.z -= speckle * 0.2;

								float shine = 0.0 * (vUV.x + (1.0 - vUV.y));
								color1.z += shine;
								color2.z += shine;
								background.z += shine;

								vec4 outColor = vec4(
									min(
										mix(
											hsluvToRgb(background * vec3(1.0, 100.0, 100.0)),
											hsluvToRgb(color1.xyz * vec3(1.0, 100.0, 100.0)),
											cover1 * color1.w
										),
										mix(
											vec3(1.0),
											hsluvToRgb(color2.xyz * vec3(1.0, 100.0, 100.0)),
											cover2 * color2.w
										)
									),
									1.0
								);

								gl_FragColor = outColor;
							}
						`,
			});

			return {
				displaySize: [...initialDisplaySize],
				displayMargin,
				program,
				quad,
			};
		},
		setSize: (pass, size) => {
			pass.displaySize = [...size];
		},
		update: (pass, time) => {
			const { gl, getViewportSize, program, quad, displaySize, displayMargin } = pass;

			if (!program.built) {
				return;
			}
			gl.viewport(0, 0, ...getViewportSize());
			program.use();
			const [displayWidth, displayHeight] = displaySize;
			gl.uniform2f(program.locations.uDisplaySize, ...displaySize);
			gl.uniform2f(program.locations.uDisplayMargin, displayMargin, displayMargin);

			const shadowOffset = [0.25 / displayWidth, -0.125 / displayHeight];
			gl.uniform2f(program.locations.uShadowOffset, ...shadowOffset);

			gl.uniform1i(program.locations.uSampler, 0);
			gl.activeTexture(gl.TEXTURE0 + 0);
			gl.bindTexture(gl.TEXTURE_2D, inputRenderTarget.glTexture);

			gl.bindBuffer(gl.ARRAY_BUFFER, quad);
			gl.vertexAttribPointer(program.locations.aPos, 2, gl.FLOAT, false, 0, 0);

			gl.enableVertexAttribArray(program.locations.aPos);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.disableVertexAttribArray(program.locations.aPos);
		},
	});
