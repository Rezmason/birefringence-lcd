import { frameWidth as width, frameHeight as height, loadImages } from "./data.js";
import { createTexture, createProgram, createQuad, createPass } from "./factory.js";

export default (context) =>
	createPass(context, {
		init: (context) => {
			const texture = createTexture(context, { width, height, pixelate: true });
			texture.upload(new Uint8Array(width * height * 4).fill(0xff));

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
							// TODO: "lerp smoothing is broken" https://www.youtube.com/watch?v=LSNQuFEDOyQ
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

								gl_FragColor = vec4(
									mix(vec3(0.8, 0.9, 0.8), color, cover) *
									mix(0.7, 1.0, speckle) +
									mix(0.0, 0.4, pow(speckle, 6.0)),
									1.0
								);
							}
						`,
			});

			return {
				texture,
				program,
				quad,
			};
		},
		load: async (pass) => {
			const { texture } = pass;
			const images = await loadImages();
			const totalFrames = images.length - 5;

			let currentFrame = -1;
			const changeFrame = (incr = 1) => {
				currentFrame = (((currentFrame + incr) % totalFrames) + totalFrames) % totalFrames;
				texture.upload(images[currentFrame]);
				console.log("Current frame:", currentFrame);
			};
			changeFrame();

			document.addEventListener("keydown", ({ repeat, code }) => {
				if (repeat) {
					return;
				}
				switch (code) {
					case "ArrowLeft":
					case "ArrowUp": {
						changeFrame(-1);
						break;
					}
					case "ArrowRight":
					case "ArrowDown": {
						changeFrame(1);
						break;
					}
				}
			});
		},
		update: (pass, now) => {
			const { gl, program, quad } = pass;
			gl.useProgram(program.program);

			gl.bindBuffer(gl.ARRAY_BUFFER, quad);
			gl.vertexAttribPointer(program.locations.aPos, 2, gl.FLOAT, false, 0, 0);

			// gl.bindTexture(gl.TEXTURE_2D, texture);

			gl.uniform2f(program.locations.uSize, width, height);
			gl.uniform1i(program.locations.uSampler, 0);

			gl.enableVertexAttribArray(program.locations.aPos);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.disableVertexAttribArray(program.locations.aPos);
		},
	});
