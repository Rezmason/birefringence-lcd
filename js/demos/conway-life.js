import createDemo from "./demo.js";
import VoltMap from "../volt-map.js";

const randomize = (back) => {
	back.forEach((row) => row.forEach((_, i) => (row[i] = Math.random() < 0.5 ? Math.ceil(Math.random() * 100) : 0)));
};

const colorIndices = [0, 2, 8, 15];

const step = (size, front, back, image) => {
	const [width, height] = size;
	const skewX = Math.floor(width / 3);
	const skewY = Math.floor(height / 3);
	let numChanged = 0;
	for (let i = 0; i < height; i++) {
		const up = i === 0 ? height - 1 : i - 1;
		const down = i === height - 1 ? 0 : i + 1;

		const upX = i === 0 ? skewX : 0;
		const downX = i === height - 1 ? width - skewX : 0;

		for (let j = 0; j < width; j++) {
			const left = j === 0 ? width - 1 : j - 1;
			const right = j === width - 1 ? 0 : j + 1;

			const leftY = j === 0 ? skewY : 0;
			const rightY = j === width - 1 ? height - skewY : 0;

			let sum;
			// prettier-ignore
			{
				sum =
					(front[(  up +  leftY) % height][( left +   upX) % width] ? 1 : 0) +
					(front[(  up +      0) % height][(    j +   upX) % width] ? 1 : 0) +
					(front[(  up + rightY) % height][(right +   upX) % width] ? 1 : 0) +
					(front[(   i +  leftY) % height][( left +     0) % width] ? 1 : 0) +
					(front[(   i + rightY) % height][(right +     0) % width] ? 1 : 0) +
					(front[(down +  leftY) % height][( left + downX) % width] ? 1 : 0) +
					(front[(down +      0) % height][(    j + downX) % width] ? 1 : 0) +
					(front[(down + rightY) % height][(right + downX) % width] ? 1 : 0) ;
			}
			let value;
			if (front[i][j]) {
				value = sum === 2 || sum === 3 ? front[i][j] + 1 : 0;
			} else {
				value = sum === 3 ? 1 : 0;
			}
			if ((back[i][j] === 0) !== (value === 0)) {
				numChanged++;
			}
			back[i][j] = value;
			let color = colorIndices.findIndex((n) => value <= n);
			if (color == -1) {
				color = Math.floor(((value - 15) * 0.02) % 3) + 1;
			}
			image.data[i * width + j] = color;
		}
	}
	if (numChanged === 0) {
		randomize(back);
	}
	return numChanged;
};

export default () => {
	let startTime = null;
	let timeout = null;
	let postFrame = null;
	let size = [1, 1];
	let front, back, image;

	const setSize = (s) => {
		startTime = performance.now();
		size = s;
		const [width, height] = size;
		[front, back] = Array(2)
			.fill()
			.map(() =>
				Array(height)
					.fill()
					.map(() => Array(width).fill(0)),
			);
		image = new VoltMap(width, height);
		randomize(back);
	};

	const start = (f) => {
		postFrame = f;
		update();
	};

	const stop = () => {
		postFrame = null;
		clearTimeout(timeout);
		timeout = null;
	};

	const update = () => {
		clearTimeout(timeout);
		if (startTime != null) {
			const startProgress = Math.min(1, (performance.now() - startTime) / 500);
			const [width, height] = size;
			for (let i = 0; i < height; i++) {
				for (let j = 0; j < width; j++) {
					if (i / height < startProgress) {
						const value = back[i][j];
						let color = colorIndices.findIndex((n) => value <= n);
						if (color == -1) {
							color = Math.floor(((value - 15) * 0.02) % 3) + 1;
						}
						image.data[i * width + j] = color;
					} else {
						image.data[i * width + j] = 0;
					}
				}
			}
			if (startProgress >= 1) {
				startTime = null;
			}
			postFrame(image);
			timeout = setTimeout(update, 100);
		} else {
			[front, back] = [back, front];
			const numChanged = step(size, front, back, image);
			postFrame(image);
			timeout = setTimeout(update, 35 + Math.min(70, (300 / (size[0] * size[1])) * numChanged));
		}
	};

	return createDemo({ start, stop, setSize });
};
