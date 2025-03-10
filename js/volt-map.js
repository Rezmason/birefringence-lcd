export default class VoltMap {
	data;
	width;
	height;

	constructor(width, height, isAnalog = false) {
		this.width = width;
		this.height = height;
		this.isAnalog = isAnalog;
		this.data = Array(width * height);
	}

	fill(value) {
		this.data.fill(value);
	}

	blitTo(dst, srcX, srcY, dstX, dstY, width, height, compositeFunc = null) {
		const src = this;

		if (compositeFunc == null) {
			compositeFunc = (x) => x;
		}

		srcX = Math.max(0, Math.min(src.width - 1, srcX));
		srcY = Math.max(0, Math.min(src.height - 1, srcY));
		dstX = Math.max(0, Math.min(dst.width - 1, dstX));
		dstY = Math.max(0, Math.min(dst.height - 1, dstY));
		width = Math.min(width, src.width - srcX, dst.width - dstX);
		height = Math.min(height, src.height - srcY, dst.height - dstY);

		for (let i = 0; i < height; i++) {
			for (let j = 0; j < width; j++) {
				const srcIndex = srcX + j + src.width * (srcY + i);
				const dstIndex = dstX + j + dst.width * (dstY + i);
				dst.data[dstIndex] = compositeFunc(src.data[srcIndex], dst.data[dstIndex]);
			}
		}
	}
}
