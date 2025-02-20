import createDemo from "./demo.js";
import { frameWidth, frameHeight } from "../data.js";

const mod = (n, d) => ((n % d) + d) % d;

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

const globeRadius = 18;
const globeDiameter = globeRadius * 2 + 1;

// based on: http://fredericgoset.ovh/informatique/oldschool/en/spheremap.html
const globeUVs = Array(globeDiameter)
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

// console.log(globeUVs.map(row => row.map(i => i === -1 ? " " : Math.floor(i % 10)).join("")).join("\n"));

const stars = Array(frameWidth)
	.fill()
	.map(() => [Math.floor(Math.random() * frameHeight), Math.floor(Math.random() * frameWidth)]);

const image = Array(frameHeight)
	.fill()
	.map(() => Array(frameWidth).fill(0));

export default () => {
	let scroll = 0;
	let animationFrameRequest = null;
	let postFrame = null;

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

		const centerX = Math.floor((frameWidth - globeDiameter) / 2);
		for (let i = 0; i < frameHeight; i++) {
			for (let j = 0; j < frameWidth; j++) {
				const value = Math.random() < 0.3 ? 1 : 2;
				image[i][j] = value;
			}
		}

		for (const [y, x] of stars) {
			const starX = Math.floor(mod(x + scroll, frameWidth));
			image[y][starX] = 0;
			image[y][(starX + 1) % frameWidth] = 0;
		}

		for (let i = 0; i < frameHeight; i++) {
			for (let j = 0; j < globeDiameter; j++) {
				const long = globeUVs[i][j];
				if (long === -1) {
					continue;
				}
				const x = Math.floor(mod(long + scroll, globeImageWidth));
				let value = globeImage[Math.floor((i * (globeDiameter / globeImageWidth + 1)) / 2) + 6][x];
				if (image[i][j + centerX] === 3 && value === 2) {
					value = 0;
				}
				if (Math.random() * long > globeImageWidth / 3) {
					value = 0;
				}
				image[i][j + centerX] = value;
			}
		}

		if (postFrame != null) {
			postFrame(image);
		}
		animationFrameRequest = requestAnimationFrame(update);
	};

	return createDemo(start, stop);
};
