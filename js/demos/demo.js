export default (params) => {
	const { start: startFunc, stop: stopFunc, setSize: setSizeFunc, requiredSize, createUI } = params;
	let running = false;
	let nextFrame = null;
	let size = [1, 1];

	const start = () => {
		if (running) {
			return;
		}
		running = true;
		if (startFunc != null) {
			startFunc((frame) => (nextFrame = frame));
		}
	};

	const stop = () => {
		if (!running) {
			return;
		}
		running = false;
		if (stopFunc != null) {
			stopFunc();
		}
	};

	const setSize = (s) => {
		size = [...s];
		demo.size = size;
		nextFrame = null;
		if (setSizeFunc != null) {
			setSizeFunc(s);
		}
	};

	const getNextFrame = () => {
		if (!running) {
			return null;
		}
		const frame = nextFrame;
		nextFrame = null;
		// checkFrameFormat(frame);
		return frame;
	};

	const checkFrameFormat = (frame) => {
		if (frame == null) {
			return;
		}
		if (Array.isArray(frame)) {
			const columnLengths = new Set(frame.map((a) => a.length));
			if (columnLengths.size !== 1) {
				throw new Error("Incorrectly formatted frame.");
			}
		}
		const length = Array.isArray(frame) ? frame.length * frame[0].length : frame.length / 4;
		if (length !== size[0] * size[1]) {
			throw new Error("Incorrectly sized frame.");
		}
	};

	const demo = { start, stop, setSize, getNextFrame };
	if (requiredSize != null) {
		demo.requiredSize = requiredSize;
	}
	if (createUI != null) {
		demo.createUI = createUI;
	}

	return demo;
};
