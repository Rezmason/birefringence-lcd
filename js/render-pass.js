import { frameWidth, frameHeight, loadImages } from "./data.js";
import { createTexture, createProgram, createQuad, createPass } from "./factory.js";

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

							highp float randomFloat( vec2 uv ) {
								const highp float a = 12.9898, b = 78.233, c = 43758.5453;
								highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
								return fract(sin(sn) * c);
							}

							void main() {
								vec2 aspectRatio = vec2(1.0, uSize.x / uSize.y);
								vec3 color = texture2D(uSampler, vUV).rgb;

								vec2 pixel = abs(fract(vUV * uSize) - 0.5) * 2.0;
								float cover = clamp(1.0 - pow(max(pixel.x, pixel.y), 10.0), 0.0, 1.0);
								float speckle = randomFloat(vUV);

								vec3 screenTint = vec3(0.6, 0.7, 0.7);
								normalize(screenTint);

								gl_FragColor = vec4(
									mix(vec3(0.8), color, cover) * screenTint *
									mix(0.7, 1.0, speckle) +
									mix(0.0, 0.4, pow(speckle, 6.0)),
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
