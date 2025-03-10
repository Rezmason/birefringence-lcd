const fetchImageSheet = async (src, [width, height]) => {
	const imageSheet = new Image();
	imageSheet.src = src;
	await imageSheet.decode();
	const canvas = document.createElement("canvas");
	canvas.width = imageSheet.width;
	canvas.height = imageSheet.height;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	ctx.drawImage(imageSheet, 0, 0);
	const imageData = [];
	for (let i = 0; i < imageSheet.height; i += height) {
		for (let j = 0; j < imageSheet.width; j += width) {
			imageData.push(ctx.getImageData(j, i, width, height).data.map((n) => (n > 0x80 ? 0xff : 0x00)));
		}
	}
	return imageData;
};

export { fetchImageSheet };
