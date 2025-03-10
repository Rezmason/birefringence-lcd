import createDemo from "./demo.js";
import VoltMap from "../volt-map.js";

const mod = (n, d) => ((n % d) + d) % d;

const mix = (a, b, x) => a * (1 - x) + b * x;

const oldGlobeImage = `
  -- -  ----------------  ---- -          -----  -------- -------
  ---------------------    -  ----       --------------- -----
     -   -----    --   -  - - -----      -------------- --  -
             -          ------   --     ---------    --- -
              -         --   --  --   --- ------
             -- --          -------- ------- --  -
         -- -------         --   --------- - -  -
       ---  --------         -    ---------  ---
        -- --- ------             -----------
       --------------            - ---------
      - -------------           -----------
     -- -------------          ------- ----   - -
    --  --------------        ----------------------
    - ----------------       ---------------    -
   --------------------   --- -------------        -
 -------------- --------   ----------------         -    -    -
--- ---------------------   - ------------           - ----  ---
 --- -----------------------  - ----------            ------ ----
-- ---------------------------     --------            ------ --
- - - -----------------------         ---------       -----------
-- ---  ------ --------------          --------      ---------- -
 -- ---- -- ------------------         ---------     -----------
----- - -----------------------       ----------     - ----------
---      -----------------------      ---------     -- ----------
--        ---------------------      ----------     -------------
--        ---------------------     ------------    -------------
--- --   ---- -----------------    -------------   --------------
------------- ----------------   --------------------------------
-------- --- -----------------   --------------------------------
------------------------------  ---------------------------------
------------------------------  ---------------------------------
-----------------------------------------------------------------
`;

const globeImage = `
----------------------------------      -------------------------|
  -- -  ----------------  ---- -          -----  -------- -------|
  ---------------------    -  ----       --------------- -----   |
     -   -----    --   -  - - -----      -------------- --  -    |
             -          ------   --     ---------    --- -       |
              -         --   --  --   --- ------                 |
             -- --          -------- ------- --  -               |
         -- -------         --   --------- - -  -                |
       ---  --------         -    ---------  ---                 |
        -- --- ------             -----------                    |
       --------------            - ---------                     |
      - -------------           -----------                      |
     -- -------------          ------- ----   - -                |
    --  --------------        ----------------------             |
    - ----------------       ---------------    -                |
   --------------------   --- -------------        -             |
 -------------- --------   ----------------         -    -    -  |
--- ---------------------   - ------------           - ----  --- |
 --- -----------------------  - ----------            ------ ----|
-- ---------------------------     --------            ------ -- |
- - - -----------------------         ---------       -----------|
-- ---  ------ --------------          --------      ---------- -|
 -- ---- -- ------------------         ---------     ----------- |
----- - -----------------------       ----------     - ----------|
---      -----------------------      ---------     -- ----------|
--        ---------------------      ----------     -------------|
--        ---------------------     ------------    -------------|
--- --   ---- -----------------    -------------   --------------|
------------- ----------------   --------------------------------|
-------- --- -----------------   --------------------------------|
------------------------------  ---------------------------------|
------------------------------  ---------------------------------|
-----------------------------------------------------------------|
-----------------------------------------------------------------|
--------------------------------- -------------------------------|
          ---------------------  ----------------  -             |
         ------------            -------                         |
                                    -                            |
                                                                 |
                                                                 |
`
	.replaceAll("|", "")
	.split("\n")
	.filter((line) => line.length > 0)
	.map((s) => s.split("").map((c) => (c === " " ? 3 : 2)));
const globeImageWidth = globeImage[0].length;
const globeImageHeight = globeImage.length;

// console.log(globeUVs.map(row => row.map(i => i === -1 ? " " : Math.floor(i % 10)).join("")).join("\n"));

export default (analog) => {
	let scroll = 0;
	let animationFrameRequest = null;
	let postFrame = null;
	let stars, image;
	let size = [1, 1];
	let globeRadius, globeDiameter, globeUVs;

	const setSize = (s) => {
		size = s;
		const [width, height] = size;

		stars = Array(width)
			.fill()
			.map(() => [Math.floor(Math.random() * height), Math.random() * width]);

		image = new VoltMap(width, height, analog);
		image.fill(0);

		globeRadius = Math.ceil(0.5625 * height);
		globeDiameter = globeRadius * 2 + 1;

		// based on: http://fredericgoset.ovh/informatique/oldschool/en/spheremap.html
		globeUVs = Array(globeDiameter)
			.fill()
			.map((_, i) =>
				Array(globeDiameter)
					.fill()
					.map((_, j) => {
						const [cx, cy] = [j - globeRadius, i - globeRadius];
						const sineLongitude = cx / (globeRadius * Math.cos(Math.asin(cy / globeRadius)));
						if (Math.abs(sineLongitude) > 1) {
							return -1;
						}
						const longitude = Math.asin(sineLongitude) + Math.PI / 2;
						return (longitude * globeImageWidth) / 2 / Math.PI;
					}),
			);
	};

	const start = (f) => {
		postFrame = f;
		update(0);
	};

	const stop = () => {
		cancelAnimationFrame(animationFrameRequest);
		animationFrameRequest = null;
	};

	const update = (time) => {
		scroll = -0.002 * time;
		const [width, height] = size;

		const centerX = Math.floor((width - globeDiameter) / 2);
		for (let i = 0; i < height; i++) {
			for (let j = 0; j < width; j++) {
				if (analog) {
					image.data[i * width + j] = 2.6;
				} else {
					image.data[i * width + j] = Math.random() < 0.3 ? 1 : 2;
				}
			}
		}

		for (const [y, x] of stars) {
			if (analog) {
				const starX = mod(x + scroll, width);
				image.data[y * width + Math.floor(starX)] = mix(4.0, 2.6, starX % 1);
				image.data[y * width + Math.floor((starX + 1) % width)] = mix(2.6, 4.0, starX % 1);
			} else {
				const starX = Math.floor(mod(x + scroll, width));
				image.data[y * width + starX] = 0;
				image.data[y * width + ((starX + 1) % width)] = 0;
			}
		}

		for (let i = 0; i < height; i++) {
			for (let j = 0; j < globeDiameter; j++) {
				if (j + centerX < 0 || j + centerX >= width) {
					continue;
				}
				const long = globeUVs[i][j];
				if (long === -1) {
					continue;
				}
				const x = Math.floor(mod(long + scroll, globeImageWidth));
				const y = Math.floor((0.1 + (i / (globeDiameter + 1)) * 0.75) * globeImageHeight);
				let value = globeImage[y][x];
				if (analog) {
					const fade = Math.max(0, long - globeImageWidth / 3);
					if (value === 3) {
						value = 0.0 + fade * 0.3;
					} else {
						value = 2.3 + fade * 0.05;
					}
				} else {
					if (Math.random() * long > globeImageWidth / 3) {
						value = 0;
					}
				}
				image.data[i * width + j + centerX] = value;
			}
		}

		if (postFrame != null) {
			postFrame(image);
		}
		animationFrameRequest = requestAnimationFrame(update);
	};

	return createDemo({ start, stop, setSize });
};
