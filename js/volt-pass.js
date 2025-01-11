import { frameWidth as width, frameHeight as height, loadImages } from "./data.js";
import { createTexture, createRenderTarget, createProgram, createQuad, createPass } from "./factory.js";

export default (context) =>
	createPass(context, {
		init: (context) => {
			const imageTexture = createTexture(context, { width, height, pixelate: true });
			imageTexture.upload(new Uint8Array(width * height * 4).fill(0xff));

			const renderTarget = createRenderTarget(context, { width, height, pixelate: true, float: true });

			renderTarget.upload(
				new Uint16Array(width * height * 4).map(
					(_, i) =>
						i % 4 === 3
							? 0xbc00 //  -1
							: 0x3c00, //  1
				),
			);

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

							uniform float uTime, uDeltaTime;
							uniform sampler2D uStateSampler;
							uniform sampler2D uImageSampler;

							highp float randomFloat( vec2 uv ) {
								const highp float a = 12.9898, b = 78.233, c = 43758.5453;
								highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
								return fract(sin(sn) * c);
							}

							void main() {
								vec3 goal = texture2D(uImageSampler, vUV).rgb;
								float goalVoltage = 0.0;
								bool r = goal.r > 0.0;
								bool g = goal.g > 0.0;
								bool b = goal.b > 0.0;
								bool w = r && g && b;

								float greenVoltage = 0.0;
								float blueVoltage  = 1.3;
								float redVoltage   = 2.2;
								float whiteVoltage = 2.5;

								if (g) { goalVoltage = greenVoltage; }
								if (b) { goalVoltage = blueVoltage; }
								if (r) { goalVoltage = redVoltage; }
								if (w) { goalVoltage = whiteVoltage; }

								float halfFloatPrecisionFix = 10.0;
								float oldVoltage = texture2D(uStateSampler, vUV).a * halfFloatPrecisionFix;

								if (oldVoltage < 0.0) {
									oldVoltage = whiteVoltage;
								}

								// TODO: frame independent lerp, new mix(old, goal, 1.0 - pow(r, uDeltaTime))
								float rate = 0.11;
								float voltage = mix(oldVoltage, goalVoltage, rate);
								voltage = mix(oldVoltage, voltage, mix(0.7, 1.0, randomFloat(vUV)));

								// voltage = vUV.x * (whiteVoltage - greenVoltage) + greenVoltage;

								float greenHue = 127.7 + 16.0;
								float  blueHue = 265.9 + -3.0;
								float   redHue = 312.2 + 63.0;
								float whiteHue = 312.2 + 80.0;

								float hue = greenHue;
								hue += smoothstep(greenVoltage,  blueVoltage, voltage) * ( blueHue - greenHue);
								hue += smoothstep( blueVoltage,   redVoltage, voltage) * (  redHue -  blueHue);
								hue += smoothstep(  redVoltage, whiteVoltage, voltage) * (whiteHue -  redHue);

								float saturation = mix(1.0, 0.0, smoothstep(mix(redVoltage, whiteVoltage, 0.5), whiteVoltage, voltage));

								float turquoiseVoltage = mix(greenVoltage,   blueVoltage, 0.75);
								float    purpleVoltage = mix( blueVoltage,    redVoltage, 0.50);
								float  darkBlueVoltage = mix( blueVoltage, purpleVoltage, 0.50);

								float reflectance =
									4.0 +
									mix(6.0, 0.0, smoothstep(turquoiseVoltage, darkBlueVoltage, voltage)) +
									mix(0.0, 7.0, smoothstep(purpleVoltage, whiteVoltage, voltage));
								reflectance /= 11.0;

								float whiteScatter = smoothstep(redVoltage, whiteVoltage, voltage);

								float lightness = mix(0.0, 1.0, reflectance * 0.6 + whiteScatter * 0.25);

								gl_FragColor = vec4(
									hue,
									saturation,
									lightness,
									voltage / halfFloatPrecisionFix
								);
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

			const deltaTime = pass.lastTime == null ? 0 : now - pass.lastTime;
			pass.lastTime = now;

			gl.useProgram(program.program);

			renderTarget.swap();
			renderTarget.toggle(true);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, renderTarget.texture);

			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, imageTexture.texture);

			gl.bindBuffer(gl.ARRAY_BUFFER, quad);
			gl.vertexAttribPointer(program.locations.aPos, 2, gl.FLOAT, false, 0, 0);

			// gl.uniform2f(program.locations.uSize, width, height);
			gl.uniform1i(program.locations.uStateSampler, 0);
			gl.uniform1i(program.locations.uImageSampler, 1);

			gl.uniform1f(program.locations.uTime, now);
			gl.uniform1f(program.locations.uDeltaTime, deltaTime);

			gl.enableVertexAttribArray(program.locations.aPos);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.disableVertexAttribArray(program.locations.aPos);

			renderTarget.toggle(false);
		},
	});
