import { frameWidth as width, frameHeight as height, loadImages } from "./data.js";
import { createTexture, createRenderTarget, createProgram, createQuad, createPass } from "./factory.js";

export default (context) =>
	createPass(context, {
		init: (context) => {
			const imageTexture = createTexture(context, { width, height, pixelate: true });
			imageTexture.upload(new Uint8Array(width * height * 4).fill(0xff));

			const renderTarget = createRenderTarget(context, { width, height, pixelate: true, float: true });

			const quad = createQuad(context);

			const program = createProgram(context, {
				vertex: `
							attribute vec2 aPos;
							varying vec2 vUV;

							void main() {
								vUV = aPos * 0.5 + 0.5;
								gl_Position = vec4(aPos, 0.0, 1.0);
							}
						`,
				fragment: `
							precision highp float;
							#define PI 3.14159265359
							varying vec2 vUV;
							// TODO: "lerp smoothing is broken" https://www.youtube.com/watch?v=LSNQuFEDOyQ
							uniform sampler2D uImageSampler;
							uniform sampler2D uStateSampler;

							void main() {
								float oldVoltage = texture2D(uStateSampler, vUV).a;

								vec3 goal = texture2D(uImageSampler, vUV).rgb;
								float goalVoltage = 0.0;
								bool r = goal.r > 0.0;
								bool g = goal.g > 0.0;
								bool b = goal.b > 0.0;
								bool w = r && g && b;

								float greenVoltage = 1.0;
								float blueVoltage = 1.5;
								float redVoltage = 2.2;
								float whiteVoltage = 2.5;

								float blend = 0.5;

								if (g) { goalVoltage = greenVoltage; }
								if (b) { goalVoltage = blueVoltage; }
								if (r) { goalVoltage = redVoltage; }
								if (w) { goalVoltage = whiteVoltage; }


								float voltage = mix(oldVoltage, goalVoltage, 0.09);

								vec3 color = vec3(
									smoothstep(0.0, 2.5, voltage)
								);

								gl_FragColor = vec4(color, voltage);
							}
						`,
			});

			return {
				imageTexture,
				renderTarget,
				program,
				quad,
			};
		},
		load: async (pass) => {
			const { imageTexture } = pass;
			const images = await loadImages();
			const totalFrames = images.length - 5;

			let currentFrame = -1;
			const changeFrame = (incr = 1) => {
				currentFrame = (((currentFrame + incr) % totalFrames) + totalFrames) % totalFrames;
				imageTexture.upload(images[currentFrame]);
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
			const { gl, imageTexture, renderTarget, program, quad } = pass;

			if (!program.built) {
				return;
			}

			gl.useProgram(program.program);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, imageTexture.texture);

			renderTarget.swap();
			renderTarget.toggle(true);

			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, renderTarget.texture);

			gl.bindBuffer(gl.ARRAY_BUFFER, quad);
			gl.vertexAttribPointer(program.locations.aPos, 2, gl.FLOAT, false, 0, 0);

			// gl.uniform2f(program.locations.uSize, width, height);
			gl.uniform1i(program.locations.uImageSampler, 0);
			gl.uniform1i(program.locations.uStateSampler, 1);

			gl.enableVertexAttribArray(program.locations.aPos);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.disableVertexAttribArray(program.locations.aPos);

			renderTarget.toggle(false);
		},
	});
