import { frameWidth, frameHeight } from "./data.js";
import { createTexture, createProgram, createQuad, createPass } from "./factory.js";

const [hsluv, snoise, voltage] = await Promise.all(
	["./lib/hsluv-glsl.fsh", "./lib/snoise2d.glsl", "./lib/voltage.glsl"].map((url) => fetch(url).then((r) => r.text())),
);

export default (context, inputRenderTarget) =>
	createPass(context, {
		init: (context) => {
			const quad = createQuad(context);

			const program = createProgram(context, {
				vertex: `
							attribute vec2 aPos;
							uniform vec2 uFrameSize, uSize;

							varying vec2 vUV;

							void main() {
								vUV = (aPos + 1.0) * 0.5;

								// float viewportAspectRatio = uSize.x / uSize.y;
								// float frameAspectRatio = uFrameSize.x / uFrameSize.y;
								vec2 scale = vec2(1.0);
								// if (viewportAspectRatio > frameAspectRatio) {
								// 	scale.x = frameAspectRatio / viewportAspectRatio;
								// } else {
								// 	scale.y = viewportAspectRatio / frameAspectRatio;
								// }

								gl_Position = vec4(aPos * scale, 0.0, 1.0);
							}
						`,
				fragment: `
							precision highp float;
							#define PI 3.14159265359

							varying vec2 vUV;
							uniform vec2 uFrameSize;
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

								vec2 nearestNeighborUV = floor(vUV * uFrameSize) / uFrameSize;
								vec3 color1 = voltage2HSLuv(bendVoltage(
									loadVoltage(texture2D(uSampler, nearestNeighborUV).w),
									vUV
								));
								vec2 pixel1 = abs(fract(vUV * uFrameSize) - 0.5) * 2.0;
								float cover1 = clamp(0.9 - pow(max(pixel1.x, pixel1.y), 20.0), 0.75, 1.0);

								vec2 shadowUV = vUV + vec2(0.003, -0.006);
								float shadowVoltageOffset = abs(shadowUV.x - 0.5) * 0.025;
								vec2 nearestNeighborShadowUV = floor(shadowUV * uFrameSize) / uFrameSize;
								vec3 color2 = voltage2HSLuv(bendVoltage(
									loadVoltage(texture2D(uSampler,  nearestNeighborShadowUV).w),
									shadowUV
								));
								vec2 pixel2 = fract(shadowUV * uFrameSize);
								pixel2.x = 1.0 - pixel2.x;
								float cover2 = mix(0.9, 0.0, clamp(1.4 * (max(pixel2.x, pixel2.y) - 0.5), 0.0, 1.0));

								vec2 shiftUV = vUV * 2.0 - 1.0;
								float shift = clamp(abs(shiftUV.x - shiftUV.y) - 1.5, 0.0, 1.0);
								color1 += shift * 0.4;
								color2 += shift * 0.4;

								float speckle = mix(-0.1, 0.2, randomFloat(vUV)) + snoise(vUV * uFrameSize * 4.0) * 0.1;
								speckle = mix(0.0, speckle, (color1.z - 0.5) * 2.0);
								color1.z += speckle * mix(0.4, 0.3, color1.y);
								color2.z += speckle * mix(0.0, 0.2, color1.y);

								float shine = 0.0 * (vUV.x + (1.0 - vUV.y));
								color1.z += shine;
								color2.z += shine;

								gl_FragColor = vec4(
									min(
										mix(vec3(0.6, 0.7, 0.6), hsluvToRgb(color1 * vec3(1.0, 100.0, 100.0)), cover1),
										mix(vec3(1.0), hsluvToRgb(color2 * vec3(1.0, 100.0, 100.0)), cover2)
									),
									1.0
								);
							}
						`,
			});

			return {
				program,
				quad,
			};
		},
		update: (pass, time) => {
			const { gl, getSize, program, quad } = pass;

			if (!program.built) {
				return;
			}

			const size = getSize();
			gl.viewport(0, 0, ...size);
			program.use();
			gl.uniform2f(program.locations.uFrameSize, frameWidth, frameHeight);
			gl.uniform2f(program.locations.uSize, ...size);

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
