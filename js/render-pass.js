import { frameWidth, frameHeight, loadImages } from "./data.js";
import { createTexture, createProgram, createQuad, createPass } from "./factory.js";

const hsluv = await fetch("./lib/hsluv-glsl.fsh").then((r) => r.text());
const snoise = await fetch("./lib/snoise2d.glsl").then((r) => r.text());

export default (context, inputRenderTarget) =>
	createPass(context, {
		init: (context) => {
			const quad = createQuad(context);

			const program = createProgram(context, {
				vertex: `
							attribute vec2 aPos;
							uniform vec2 uSize;

							varying vec2 vUV;

							void main() {
								vec2 aspectRatio = vec2(1.0, uSize.x / uSize.y);
								vUV = (aPos * aspectRatio) * 0.5 + 0.5;
								gl_Position = vec4(aPos * aspectRatio, 0.0, 1.0);
							}
						`,
				fragment: `
							precision highp float;
							#define PI 3.14159265359

							varying vec2 vUV;
							uniform vec2 uSize;
							uniform sampler2D uSampler;

							${hsluv}

							${snoise}

							highp float randomFloat( vec2 uv ) {
								const highp float a = 12.9898, b = 78.233, c = 43758.5453;
								highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
								return fract(sin(sn) * c);
							}

							void main() {

								vec2 aspectRatio = vec2(1.0, uSize.x / uSize.y);

								vec3 color1 = texture2D(uSampler, vUV).xyz;
								vec2 pixel1 = abs(fract(vUV * uSize) - 0.5) * 2.0;
								float cover1 = clamp(0.9 - pow(max(pixel1.x, pixel1.y), 20.0), 0.75, 1.0);

								vec2 shadowUV = vUV + vec2(0.003, -0.006);
								vec3 color2 = texture2D(uSampler, shadowUV).xyz;
								// float cover2 = clamp(0.0, 1.0, 0.7 * pow(fract(shadowUV * uSize + 0.01).y, 0.9));
								vec2 pixel2 = fract(shadowUV * uSize);
								pixel2.x = 1.0 - pixel2.x;
								float cover2 = mix(0.9, 0.0, clamp(1.4 * (max(pixel2.x, pixel2.y) - 0.5), 0.0, 1.0));

								vec2 shiftUV = vUV * 2.0 - 1.0;
								float shift = clamp(abs(shiftUV.x - shiftUV.y) - 1.5, 0.0, 1.0);
								color1 += shift * 0.4;
								color2 += shift * 0.4;

								float speckle = mix(-0.1, 0.2, randomFloat(vUV)) + snoise(vUV * uSize * 4.0) * 0.1;
								speckle = mix(0.0, speckle, (color1.z - 0.5) * 2.0);
								color1.z += speckle * mix(1.0, 0.4, color1.y);
								color2.z += speckle;

								float shine = mix(0.7, 1.0, vUV.x + (1.0 - vUV.y));

								gl_FragColor = vec4(
									min(
										mix(vec3(0.8), hsluvToRgb(color1 * vec3(1.0, 100.0, 100.0)), cover1),
										mix(vec3(1.0), hsluvToRgb(color2 * vec3(1.0, 100.0, 100.0)), cover2)
									) * shine,
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
		update: (pass, now) => {
			const { gl, getSize, program, quad } = pass;

			if (!program.built) {
				return;
			}

			gl.useProgram(program.program);

			gl.viewport(0, 0, ...getSize());

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, inputRenderTarget.texture);

			gl.bindBuffer(gl.ARRAY_BUFFER, quad);
			gl.vertexAttribPointer(program.locations.aPos, 2, gl.FLOAT, false, 0, 0);

			gl.uniform2f(program.locations.uSize, frameWidth, frameHeight);
			gl.uniform1i(program.locations.uSampler, 0);

			gl.enableVertexAttribArray(program.locations.aPos);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.disableVertexAttribArray(program.locations.aPos);
		},
	});
