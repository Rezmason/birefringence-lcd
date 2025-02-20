import { frameWidth as width, frameHeight as height } from "./data.js";
import { createTexture, createRenderTarget, createProgram, createQuad, createPass } from "./factory.js";

const [voltage] = await Promise.all(["./lib/voltage.glsl"].map((url) => fetch(url).then((r) => r.text())));

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

							${voltage}

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

								if (g) { goalVoltage = greenVoltage; }
								if (b) { goalVoltage = blueVoltage; }
								if (r) { goalVoltage = redVoltage; }
								if (w) { goalVoltage = whiteVoltage; }

								float oldVoltage = loadVoltage(texture2D(uStateSampler, vUV).a);

								float rate = mix(0.03, 0.04, randomFloat(vUV));
								float voltage = mix(oldVoltage, goalVoltage, 1.0 - exp(-rate * uDeltaTime * 200.0));

								float powerUp = mix(0.05, 1.0, clamp(pow(uTime, 2.0) / 2.0, 0.0, 1.0));
								voltage = mix(oldVoltage, voltage, powerUp);

								// voltage = vUV.x * (whiteVoltage - greenVoltage) + greenVoltage;

								vec3 hsl = voltage2HSLuv(voltage);

								gl_FragColor = vec4(hsl, storeVoltage(voltage));
							}
						`,
			});

			const bytes = new Uint8ClampedArray(width * height * 4);

			const blits = [
				[0xff, 0xff, 0xff, 0xff],
				[0xff, 0x00, 0x00, 0x00],
				[0x00, 0x00, 0xff, 0x00],
				[0x00, 0xff, 0x00, 0x00],
			];

			const pass = {
				imageTexture,
				renderTarget,
				program,
				quad,
				blitFunc: (n) => {
					let result = blits[n];
					if (result == null) {
						result = blits[Math.floor(Math.random() * 4)];
					}
					return result;
				},
				setBlitFunc: (f) => (pass.blitFunc = f),
				blit: (image) => {
					if (Array.isArray(image)) {
						bytes.set(image.flat().map(pass.blitFunc).flat(), 0);
					} else {
						bytes.set(image, 0);
					}
					imageTexture.upload(bytes);
				},
			};

			return pass;
		},
		update: (pass, time) => {
			const { gl, imageTexture, renderTarget, program, quad } = pass;

			if (!program.built) {
				return;
			}

			const deltaTime = pass.lastTime == null ? 0 : time - pass.lastTime;
			pass.lastTime = time;

			renderTarget.swap();
			renderTarget.toggle(true);
			program.use();
			gl.uniform1f(program.locations.uTime, time);
			gl.uniform1f(program.locations.uDeltaTime, deltaTime);

			gl.uniform1i(program.locations.uStateSampler, 0);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, renderTarget.glTexture);

			gl.uniform1i(program.locations.uImageSampler, 1);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, imageTexture.glTexture);

			gl.bindBuffer(gl.ARRAY_BUFFER, quad);
			gl.vertexAttribPointer(program.locations.aPos, 2, gl.FLOAT, false, 0, 0);

			gl.enableVertexAttribArray(program.locations.aPos);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.disableVertexAttribArray(program.locations.aPos);

			renderTarget.toggle(false);
		},
	});
