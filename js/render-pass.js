import { createTexture, createProgram, createQuad, createPass } from "./factory.js";

const [hsluv, snoise, voltage] = await Promise.all(
	["./lib/hsluv-glsl.fsh", "./lib/snoise2d.glsl", "./lib/voltage.glsl"].map((url) => fetch(url).then((r) => r.text())),
);

export default (context, initialDisplaySize, inputRenderTarget) =>
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
							#ifdef GL_OES_standard_derivatives
							#extension GL_OES_standard_derivatives: enable
							#endif

							precision highp float;
							#define PI 3.14159265359

							varying vec2 vUV;
							uniform vec2 uDisplaySize;
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
								vec2 nearestNeighborUV = floor(vUV * uDisplaySize) / uDisplaySize;
								vec3 color1 = voltage2HSLuv(bendVoltage(
									loadVoltage(texture2D(uSampler, nearestNeighborUV).w),
									vUV
								));
								vec2 pixel1 = abs(fract(vUV * uDisplaySize) - 0.5) * 2.0;
								float cover1 = clamp(0.9 - pow(max(pixel1.x, pixel1.y), 20.0), 0.75, 1.0);

								vec2 shadowUV = vUV + uShadowOffset;
								float shadowVoltageOffset = abs(shadowUV.x - 0.5) * 0.025;
								vec2 nearestNeighborShadowUV = floor(shadowUV * uDisplaySize) / uDisplaySize;
								vec3 color2 = voltage2HSLuv(bendVoltage(
									loadVoltage(texture2D(uSampler,  nearestNeighborShadowUV).w),
									shadowUV
								));
								vec2 pixel2 = fract(shadowUV * uDisplaySize);
								pixel2.x = 1.0 - pixel2.x;
								float cover2 = mix(0.9, 0.0, clamp(1.4 * (max(pixel2.x, pixel2.y) - 0.5), 0.0, 1.0));
								cover2 *= clamp(100.0 / uDisplaySize.x, 0.0, 1.0);

								vec2 shiftUV = vUV * 2.0 - 1.0;
								float shift = clamp(abs(shiftUV.x - shiftUV.y) - 1.5, 0.0, 1.0);
								color1 += shift * 0.4;
								color2 += shift * 0.4;

								float speckle = mix(-0.1, 0.2, randomFloat(vUV)) + snoise(vUV * uDisplaySize * 4.0) * 0.1;
								speckle = mix(0.0, speckle, (color1.z - 0.5) * 2.0);
								color1.z += speckle * mix(0.4, 0.2, color1.y);
								color2.z += speckle * mix(0.0, 0.2, color1.y);

								float shine = 0.0 * (vUV.x + (1.0 - vUV.y));
								color1.z += shine;
								color2.z += shine;

								vec4 outColor = vec4(
									min(
										mix(vec3(0.6, 0.7, 0.6), hsluvToRgb(color1 * vec3(1.0, 100.0, 100.0)), cover1),
										mix(vec3(1.0), hsluvToRgb(color2 * vec3(1.0, 100.0, 100.0)), cover2)
									),
									1.0
								);

								outColor += (dFdy(outColor) + dFdx(outColor)) * 0.1;
								gl_FragColor = outColor;
							}
						`,
			});

			return {
				displaySize: [...initialDisplaySize],
				program,
				quad,
			};
		},
		setSize: (pass, size) => {
			pass.displaySize = [...size];
		},
		update: (pass, time) => {
			const { gl, getViewportSize, program, quad, displaySize } = pass;

			if (!program.built) {
				return;
			}
			gl.viewport(0, 0, ...getViewportSize());
			program.use();
			gl.uniform2f(program.locations.uDisplaySize, ...displaySize);

			const [displayWidth, displayHeight] = displaySize;
			let shadowOffset = [0, 0];

			shadowOffset = [0.25 / displayWidth, -0.125 / displayHeight];
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
