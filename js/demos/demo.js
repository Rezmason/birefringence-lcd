export default (startFunc, stopFunc) => {
	let running = false;
	let nextFrame = null;

	const start = () => {
		if (running) {
			return;
		}
		running = true;
		startFunc((frame) => (nextFrame = frame));
	};

	const stop = () => {
		if (!running) {
			return;
		}
		running = false;
		stopFunc();
	};

	const getNextFrame = () => {
		if (!running) {
			return null;
		}
		const frame = nextFrame;
		nextFrame = null;
		return frame;
	};

	return { start, stop, getNextFrame };
};
