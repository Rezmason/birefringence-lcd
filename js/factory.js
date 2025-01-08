const halfFloatExtensions = ["OES_texture_half_float", "OES_texture_half_float_linear", "EXT_color_buffer_half_float", "WEBGL_color_buffer_float"];

const createGLCanvas = ({ extensions: extensionNames, resize: resizeFunc }) => {
	const canvas = document.createElement("canvas");
	document.body.append(canvas);

	const gl = canvas.getContext("webgl", {
		alpha: false,
		antialias: false,
		depth: false,
	});

	const extensions = Object.fromEntries(extensionNames.map((ext) => [ext, gl.getExtension(ext)]));
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

	let [width, height] = [1, 1];

	const resize = () => {
		const newSize = resizeFunc();
		[width, height] = newSize;
		[canvas.width, canvas.height] = newSize;
	};

	const getSize = () => [width, height];

	window.addEventListener("resize", resize);
	resize();

	return { canvas, gl, extensions, resize, getSize };
};

const createTexture = ({ gl, extensions }, params) => {
	const { width, height, pixelate: isPixelated, float: isFloat } = params;
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, isPixelated ? gl.NEAREST : gl.LINEAR);

	const internalFormat = isFloat ? extensions.OES_texture_half_float.HALF_FLOAT_OES : gl.UNSIGNED_BYTE;
	const texArgs = [gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, internalFormat];
	const upload = (data) => {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(...texArgs, data);
	};

	upload();

	return {
		...params,
		// internalFormat,
		texture,
		upload,
	};
};

const createRenderTarget = (context, params) => {
	const { gl } = context;
	const { width, height } = params;

	let { texture: front, upload: upload1 } = createTexture(context, params);
	let { texture: back, upload: upload2 } = createTexture(context, params);
	let isOn = false;

	const upload = (data) => {
		upload1(data);
		upload2(data);
	};

	const framebuffer = gl.createFramebuffer();

	const update = () => {
		if (isOn) {
			gl.viewport(0, 0, width, height);
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, back, 0);
		} else {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		}
	};

	const toggle = (on) => {
		isOn = on;
		update();
	};

	const swap = () => {
		[front, back] = [back, front];
		update();
	};

	update();

	const renderTarget = {
		...params,
		framebuffer,
		toggle,
		swap,
		upload,
	};

	Object.defineProperty(renderTarget, "texture", { get: () => front });

	return renderTarget;
};

const createProgram = ({ gl }, { vertex: vertSource, fragment: fragSource }) => {
	const vertShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertShader, vertSource);
	gl.compileShader(vertShader);
	const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragShader, fragSource);
	gl.compileShader(fragShader);

	const program = gl.createProgram();
	gl.attachShader(program, vertShader);
	gl.attachShader(program, fragShader);
	gl.linkProgram(program);
	const built = gl.getProgramParameter(program, gl.LINK_STATUS);

	if (!built) {
		console.warn("link failed", gl.getProgramInfoLog(program));
		console.warn("vert info-log", gl.getShaderInfoLog(vertShader));
		console.warn("frag info-log", gl.getShaderInfoLog(fragShader));
	}

	gl.useProgram(program.program); // TODO: necessary?

	const uniforms = Object.fromEntries(
		[...Array(gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)).keys()]
			.map((i) => gl.getActiveUniform(program, i))
			.map((uniform) => [
				uniform.name,
				{
					uniform,
					location: gl.getUniformLocation(program, uniform.name),
				},
			]),
	);

	const attributes = Object.fromEntries(
		[...Array(gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES)).keys()]
			.map((i) => gl.getActiveAttrib(program, i))
			.map((attrib, location) => [
				attrib.name,
				{
					attrib,
					location,
				},
			]),
	);

	const locations = {
		...Object.fromEntries(Object.entries(uniforms).map(([name, { location }]) => [name, location])),
		...Object.fromEntries(Object.entries(attributes).map(([name, { location }]) => [name, location])),
	};

	return {
		program,
		uniforms,
		attributes,
		locations,
		built,
	};
};

const createQuad = ({ gl }) => {
	const buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array(
			[
				[1, 1],
				[-1, 1],
				[1, -1],
				[-1, -1],
			].flat(),
		),
		gl.STATIC_DRAW,
	);
	return buffer;
};

const createPass = (context, { init, load, update: updateFunc }) => {
	const pass = {
		...context,
		...init(context),
		update: updateFunc == null ? (_) => _ : (now) => updateFunc(pass, now),
	};
	pass.ready = load == null ? Promise.resolve() : load(pass);
	return pass;
};

export { createGLCanvas, createTexture, createRenderTarget, createProgram, createQuad, createPass, halfFloatExtensions };
