const halfFloatExtensions = ["OES_texture_half_float", "OES_texture_half_float_linear", "EXT_color_buffer_half_float", "WEBGL_color_buffer_float"];

const createGLCanvas = ({ extensions: extensionNames, resize: resizeFunc, canvas }) => {
	if (canvas == null) {
		canvas = document.createElement("canvas");
	}

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
	const glTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, glTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, isPixelated ? gl.NEAREST : gl.LINEAR);

	const internalFormat = isFloat ? extensions.OES_texture_half_float.HALF_FLOAT_OES : gl.UNSIGNED_BYTE;
	const texArgs = [gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, internalFormat];
	const upload = (data) => {
		gl.bindTexture(gl.TEXTURE_2D, glTexture);
		gl.texImage2D(...texArgs, data);
	};

	upload();

	return {
		...params,
		// internalFormat,
		glTexture,
		upload,
	};
};

const createRenderTarget = (context, params) => {
	const { gl } = context;
	const { width, height } = params;

	let { glTexture: front, upload: upload1 } = createTexture(context, params);
	let { glTexture: back, upload: upload2 } = createTexture(context, params);
	let isOn = false;

	const upload = (data) => {
		upload1(data);
		upload2(data);
	};

	const glFramebuffer = gl.createFramebuffer();

	const update = () => {
		if (isOn) {
			gl.viewport(0, 0, width, height);
			gl.bindFramebuffer(gl.FRAMEBUFFER, glFramebuffer);
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
		glFramebuffer,
		toggle,
		swap,
		upload,
	};

	Object.defineProperty(renderTarget, "glTexture", { get: () => front });

	return renderTarget;
};

const createProgram = ({ gl }, { vertex: vertSource, fragment: fragSource }) => {
	const glVertShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(glVertShader, vertSource);
	gl.compileShader(glVertShader);
	const glFragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(glFragShader, fragSource);
	gl.compileShader(glFragShader);

	const glProgram = gl.createProgram();
	gl.attachShader(glProgram, glVertShader);
	gl.attachShader(glProgram, glFragShader);
	gl.linkProgram(glProgram);
	const built = gl.getProgramParameter(glProgram, gl.LINK_STATUS);

	if (!built) {
		console.warn("link failed", gl.getProgramInfoLog(glProgram));
		console.warn("vert info-log", gl.getShaderInfoLog(glVertShader));
		console.warn("frag info-log", gl.getShaderInfoLog(glFragShader));
	}

	const uniforms = Object.fromEntries(
		[...Array(gl.getProgramParameter(glProgram, gl.ACTIVE_UNIFORMS)).keys()]
			.map((i) => gl.getActiveUniform(glProgram, i))
			.map((uniform) => [
				uniform.name,
				{
					uniform,
					location: gl.getUniformLocation(glProgram, uniform.name),
				},
			]),
	);

	const attributes = Object.fromEntries(
		[...Array(gl.getProgramParameter(glProgram, gl.ACTIVE_ATTRIBUTES)).keys()]
			.map((i) => gl.getActiveAttrib(glProgram, i))
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

	const use = () => {
		gl.useProgram(glProgram);
	};

	return {
		glProgram,
		use,
		uniforms,
		attributes,
		locations,
		built,
	};
};

const createQuad = ({ gl }) => {
	const glBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
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
	return glBuffer;
};

const createPass = (context, { init, load, update: updateFunc }) => {
	const pass = {
		...context,
		...init(context),
		update: updateFunc == null ? (_) => _ : (timeMs) => updateFunc(pass, timeMs == null ? 0 : timeMs / 1000),
	};
	pass.ready = load == null ? Promise.resolve() : load(pass);
	return pass;
};

export { createGLCanvas, createTexture, createRenderTarget, createProgram, createQuad, createPass, halfFloatExtensions };
