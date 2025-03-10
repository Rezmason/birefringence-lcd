import VoltMap from "./volt-map.js";

const fetchImageSheet = async (src, [width, height]) => {
	const imageSheet = new Image();
	imageSheet.src = src;
	await imageSheet.decode();
	const canvas = document.createElement("canvas");
	canvas.width = imageSheet.width;
	canvas.height = imageSheet.height;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	ctx.drawImage(imageSheet, 0, 0);
	const voltMaps = [];
	for (let i = 0; i < imageSheet.height; i += height) {
		for (let j = 0; j < imageSheet.width; j += width) {
			const imageData = [...new Uint32Array(ctx.getImageData(j, i, width, height).data.map((n) => (n > 0x80 ? 1 : 0)).buffer)].map((i) => {
				const [r, g, b] = [0, 8, 16].map((n) => (i >> n) & 1);
				return r & g & (b === 1) ? 0 : r ? 1 : g ? 3 : 2;
			});
			const image = new VoltMap(width, height);
			image.data.splice(0, width * height, ...imageData);
			voltMaps.push(image);
		}
	}
	return voltMaps;
};

const buildFont = ({ size, glyphs }) => {
	const [width, height] = size;
	return {
		size,
		glyphs: Object.fromEntries(
			Object.entries(glyphs).map(([char, glyph]) => {
				const image = new VoltMap(...size);
				image.data.splice(
					0,
					width * height,
					...glyph
						.join("")
						.split("")
						.map((c) => (c === " " ? 0 : 1)),
				);
				return [char, image];
			}),
		),
	};
};

const writeTextToImage = (dst, font, text, x, y, spacing, compositeFunc) => {};

export { fetchImageSheet, writeTextToImage, buildFont };
