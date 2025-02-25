import createDemo from "./demo.js";

const mix = (a, b, x) => a * (1 - x) + b * x;

const [width, height] = [95, 32];

export default () => {
	const image = Array(height)
		.fill()
		.map(() => Array(width).fill(0));

	for (let i = 0; i < height; i++) {
		for (let j = 0; j < width; j++) {
			image[i][j] = mix(1, 3.5, j / width);
		}
	}

	let postFrame = null;

	const start = (f) => {
		postFrame = f;
		postFrame(image);
	};

	const stop = () => (postFrame = null);

	const setSize = (size) => {
		if (postFrame != null) {
			postFrame(image);
		}
	};

	return createDemo({ start, stop, setSize, requiredSize: [width, height], analog: true });
};
