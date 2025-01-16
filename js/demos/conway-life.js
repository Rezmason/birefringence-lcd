import { frameWidth, frameHeight } from "../data.js";

let [front, back, image] = Array(3)
	.fill()
	.map(() =>
		Array(frameHeight)
			.fill()
			.map(() => Array(frameWidth).fill(0)),
	);

const randomize = () => {
	back.forEach((row) => row.forEach((_, i) => (row[i] = Math.random() < 0.5 ? Math.ceil(Math.random() * 100) : 0)));
};
randomize();

const colorIndices = [0, 2, 8, 15];

const update = async () => {
	const skewX = Math.floor(frameWidth / 3);
	const skewY = Math.floor(frameHeight / 3);
	[front, back] = [back, front];
	let numChanged = 0;
	for (let i = 0; i < frameHeight; i++) {
		const up = i === 0 ? frameHeight - 1 : i - 1;
		const down = i === frameHeight - 1 ? 0 : i + 1;

		const upX = i === 0 ? skewX : 0;
		const downX = i === frameHeight - 1 ? frameWidth - skewX : 0;

		for (let j = 0; j < frameWidth; j++) {
			const left = j === 0 ? frameWidth - 1 : j - 1;
			const right = j === frameWidth - 1 ? 0 : j + 1;

			const leftY = j === 0 ? skewY : 0;
			const rightY = j === frameWidth - 1 ? frameHeight - skewY : 0;

			let sum;
			// prettier-ignore
			{
				sum =
					(front[(  up +  leftY) % frameHeight][( left +   upX) % frameWidth] ? 1 : 0) +
					(front[(  up +      0) % frameHeight][(    j +   upX) % frameWidth] ? 1 : 0) +
					(front[(  up + rightY) % frameHeight][(right +   upX) % frameWidth] ? 1 : 0) +
					(front[(   i +  leftY) % frameHeight][( left +     0) % frameWidth] ? 1 : 0) +
					(front[(   i + rightY) % frameHeight][(right +     0) % frameWidth] ? 1 : 0) +
					(front[(down +  leftY) % frameHeight][( left + downX) % frameWidth] ? 1 : 0) +
					(front[(down +      0) % frameHeight][(    j + downX) % frameWidth] ? 1 : 0) +
					(front[(down + rightY) % frameHeight][(right + downX) % frameWidth] ? 1 : 0) ;
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
			image[i][j] = color;
		}
	}
	if (numChanged === 0) {
		randomize();
	}
	await new Promise((resolve) => setTimeout(resolve, 35 + Math.min(70, 0.1 * numChanged)));
	return image;
};

export { randomize, update, image };
