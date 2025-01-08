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

	const resize = () => {
		const [width, height] = resizeFunc();
		canvas.width = width;
		canvas.height = height;
		gl.viewport(0, 0, width, height);
	};

	window.addEventListener("resize", resize);
	resize();

	return { canvas, gl, extensions, resize };
};

const createTexture = ({ gl }, { width, height, pixelate: isPixelated, float: isFloat }) => {
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, isPixelated ? gl.NEAREST : gl.LINEAR);

	// TODO: isFloat
	const texArgs = [gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE];
	const upload = (data) => {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(...texArgs, data);
	};

	return {
		texture,
		upload,
	};
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

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
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

const createPass = (context, { init, load, update }) => {
	const pass = { ...context, ...init(context) };
	const ready = (load == null ? Promise.resolve() : load(pass)).then(() => pass);
	return { ready, update: update == null ? (_) => _ : (now) => update(pass, now) };
};

export { createGLCanvas, createTexture, createProgram, createQuad, createPass, halfFloatExtensions };
