import { createTexture, createRenderTarget, createProgram, createQuad, createPass } from "./factory.js";

const [voltage] = await Promise.all(["./lib/voltage.glsl"].map((url) => fetch(url).then((r) => r.text())));

export default (context, initialDisplaySize) =>
	createPass(context, {
		init: (context) => {
			const [width, height] = initialDisplaySize;
			const imageTexture = createTexture(context, { width, height, pixelate: true });
			imageTexture.upload(new Uint8Array(width * height * 4).fill(0x0));

			const renderTarget = createRenderTarget(context, { width, height, pixelate: true, float: true });

			renderTarget.upload(new Uint16Array(width * height * 4).fill(0xbc00));

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

							uniform float uTime, uDeltaTime, uShiftRate;
							uniform sampler2D uStateSampler;
							uniform sampler2D uImageSampler;

							${voltage}

							highp float randomFloat( vec2 uv ) {
								const highp float a = 12.9898, b = 78.233, c = 43758.5453;
								highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
								return fract(sin(sn) * c);
							}

							float loadGoalVoltage(vec2 uv) {
								float goalVoltage = 0.0;
								vec4 color = texture2D(uImageSampler, uv);
								if (color.a == 1.0) {
									bool r = color.r > 0.0;
									bool g = color.g > 0.0;
									bool b = color.b > 0.0;
									bool w = r && g && b;

									if (g) { goalVoltage = greenVoltage; }
									if (b) { goalVoltage = blueVoltage; }
									if (r) { goalVoltage = redVoltage; }
									if (w) { goalVoltage = whiteVoltage; }
								} else {
									goalVoltage = color.r * 7.0;
								}
								return goalVoltage;
							}

							void main() {
								float goalVoltage = loadGoalVoltage(vUV);
								float oldVoltage = loadVoltage(texture2D(uStateSampler, vUV));

								float rate = mix(0.03, 0.031, randomFloat(vUV));
								if (oldVoltage > whiteVoltage) {
									rate = 0.1;
								}
								float voltage = mix(oldVoltage, goalVoltage, 1.0 - exp(-rate * uDeltaTime * uShiftRate * 200.0));

								gl_FragColor = storeVoltage(voltage);
							}
						`,
			});

			const digitalValues = [
				[0xff, 0xff, 0xff, 0xff],
				[0xff, 0x00, 0x00, 0xff],
				[0x00, 0x00, 0xff, 0xff],
				[0x00, 0xff, 0x00, 0xff],
			];
			const encodeDigital = (n, i) => {
				let result = digitalValues[n];
				if (result == null) {
					result = digitalValues[i % digitalValues.length];
				}
				return result;
			};
			const encodeAnalog = (n, i) => {
				const r = Math.floor((n * 0xff) / 7);
				// const rDiff = n - r * 7 / 0xFF;
				// const g = Math.floor(rDiff * 0xFF / 0.02);
				return [r, 0 /*g*/, 0x00, 0x00];
			};

			const pass = {
				displaySize: [...initialDisplaySize],
				imageTexture,
				renderTarget,
				bytes: new Uint8ClampedArray(width * height * 4),
				program,
				quad,
				setFrame: (frame) => {
					pass.bytes.set(frame.data.flatMap(frame.isAnalog ? encodeAnalog : encodeDigital));
					imageTexture.upload(pass.bytes);
				},
				shiftRate: 1,
				setShiftRate: (rate) => {
					pass.shiftRate = Math.max(0, rate);
				},
			};

			return pass;
		},
		setSize: (pass, size) => {
			pass.powerUpTime = pass.lastTime;
			pass.displaySize = [...size];
			const [width, height] = size;
			pass.bytes = new Uint8ClampedArray(width * height * 4);
			const { imageTexture, renderTarget } = pass;
			imageTexture.setSize(size);
			imageTexture.upload(new Uint8Array(width * height * 4).fill(0x0));
			renderTarget.setSize(size);
			renderTarget.upload(new Uint16Array(width * height * 4).fill(0xbc00));
		},
		update: (pass, time) => {
			const { gl, imageTexture, renderTarget, program, quad, shiftRate } = pass;

			if (!program.built) {
				return;
			}

			const deltaTime = pass.lastTime == null ? 0 : Math.min(1000 / 30, time - pass.lastTime);

			pass.lastTime = time;
			if (pass.powerUpTime == null) {
				pass.powerUpTime = time;
			}

			renderTarget.swap();
			renderTarget.toggle(true);
			program.use();
			gl.uniform1f(program.locations.uTime, time - pass.powerUpTime);
			gl.uniform1f(program.locations.uDeltaTime, deltaTime);
			gl.uniform1f(program.locations.uShiftRate, shiftRate);

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
