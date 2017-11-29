/** TETRICUBE V1
 * tombrown.xyz
 *  **/
"use strict";

(function () {
	var camera;
	var cubes;

	var cubeWidth = 10;
	var boundingCubeGridUnits = 16
	var boundingCubeWidth = boundingCubeGridUnits * cubeWidth;
	var boundingCubePoints, boundingCubeFaceShimmerPosition = 0, boundingCubeShimmerLinePathsAndDirections, boundingCubeLines;
	var gotoFrameCount = 5, rotationSpeed = 0.3, maxVerticalMovement = Math.PI / 2;
	var grid = [];

	var activeShape = null;
	var gravity = [1, 0, 0]; // x y z (each +/- 1)
	var clockTicks = 0;
	var frameCount = 0;
	var framesPerTick = 40;
	// var gameStates = ['startLevel', 'newShape','newShapeChooseAxis', 'newShapeDropping'];
	// var gameState = 'startLevel';
	var currentLevel = 1;//TODO !
	var playing = false, gaveOverScreen = false;

	// field of view
	var fieldSize = 400;
	var zoom = 200;

	var gameStartTime;

	var canvasContext;
	var canvasElement;

	var gameWidth, gameHeight;
        
        var touchLastX, touchLastY, touchStartX, touchStartY;

	var Camera = function () {
		this.cameraX = -0.5
		this.cameraY = 0.0;
		this.cameraZ = 0.0;
		this.gotoX = this.cameraX + 0.001;
		this.gotoY = this.cameraY + 0.001;
		this.gotoZ = this.cameraZ + 0.001;

		var cosY, sinY, cosX, sinX, cosZ, sinZ;
	}
	Camera.prototype.get2dProjection = function (x, y, z) {
//		var pointToCamera = this.transform3dPointByCameraPosition(x, y, z);
		return [(gameWidth * 0.5) + x * (fieldSize / (z + zoom)), (gameHeight * 0.5) + y * (fieldSize / (z + zoom))]
	};
	Camera.prototype.transform3dPointByCameraPosition = function (x, y, z) {
		return [this.cosY * (this.sinZ * y + this.cosZ * x) - this.sinY * z,
			this.sinX * (this.cosY * z + this.sinY * (this.sinZ * y + this.cosZ * x)) + this.cosX * (this.cosZ * y - this.sinZ * x),
			this.cosX * (this.cosY * z + this.sinY * (this.sinZ * y + this.cosZ * x)) - this.sinX * (this.cosZ * y - this.sinZ * x)];
	}
	Camera.prototype.update = function () {
		if (this.gotoX != this.cameraX) {
			this.cameraX -= (this.cameraX - this.gotoX) / gotoFrameCount;
			this.cameraX = Math.round(this.cameraX * 1000) / 1000;
			this.cosX = Math.cos(this.cameraX);
			this.sinX = Math.sin(this.cameraX);
		}
		if (this.gotoY != this.cameraY) {
			this.cameraY -= (this.cameraY - this.gotoY) / gotoFrameCount;
			this.cameraY = Math.round(this.cameraY * 1000) / 1000;
			this.cosY = Math.cos(this.cameraY);
			this.sinY = Math.sin(this.cameraY);
		}
		if (this.gotoZ != this.cameraZ) {
			this.cameraZ -= (this.cameraZ - this.gotoZ) / gotoFrameCount;
			this.cameraZ = Math.round(this.cameraZ * 1000) / 1000;
			this.cosZ = Math.cos(this.cameraZ);
			this.sinZ = Math.sin(this.cameraZ);
		}
	};




	var Point = function (parent, xyz) {
		this.worldX = xyz[0];
		this.worldY = xyz[1];
		this.worldZ = xyz[2];
		this.cube = parent;
	};
	Point.prototype.generateCoordinates = function () {
		var viewerCoords = camera.transform3dPointByCameraPosition(this.worldX, this.worldY, this.worldZ)
		this.viewerX = viewerCoords[0];
		this.viewerY = viewerCoords[1];
		this.viewerZ = viewerCoords[2];

		var projectionCoords = camera.get2dProjection(this.viewerX, this.viewerY, this.viewerZ);
		this.canvasX = projectionCoords[0];
		this.canvasY = projectionCoords[1];
	};

	var Face = function (cube, index, normalVector) {
		this.distanceToCamera = null;

		this.cube = cube;

		this.p0 = cube.points[index[0]];
		this.p1 = cube.points[index[1]];
		this.p2 = cube.points[index[2]];
		this.p3 = cube.points[index[3]];

		this.normal = new Point(this, normalVector);
	};
	Face.prototype.draw = function () {
		canvasContext.beginPath();
		canvasContext.moveTo(this.p0.canvasX, this.p0.canvasY);
		canvasContext.lineTo(this.p1.canvasX, this.p1.canvasY);
		canvasContext.lineTo(this.p2.canvasX, this.p2.canvasY);
		canvasContext.lineTo(this.p3.canvasX, this.p3.canvasY);
		canvasContext.closePath();

		//canvasContext.font = "10px Comic Sans MS";
		//canvasContext.fillStyle = "blue";
		//canvasContext.fillText(this.p0.viewerX + "x  "+this.p0.viewerY + "y  "+this.p0.viewerZ + "z  ", this.p0.canvasX, this.p0.canvasY); 


		this.normal.generateCoordinates();
		var red, green, blue, shade;
		// console.log(this.normal.viewerZ);
//		var coordsFromCamera = camera.transform3dPointByCameraPosition();
		shade = this.normal.viewerZ * 150;

		//if(shade < 0) shade = 0; // not sure how this happened????
		//else if(shade > 150) shade = 150

		if (this.cube.colourR == null) {
			red = blue = green = shade
		} else {
			red = shade + ((105 * this.cube.colourR) / 255);
			green = shade + ((105 * this.cube.colourG) / 255);
			blue = shade + ((105 * this.cube.colourB) / 255);

			if (!this.cube.active) {
				var maxDistFromCentre = Math.max(Math.abs(this.cube.gridPosX), Math.abs(this.cube.gridPosY), Math.abs(this.cube.gridPosZ));
				//maxDistFromCentre = maxDistFromCentre * cubeWidth;
				//           var red = Math.round(Math.min(255, shade + (255-shade)*(maxDistFromCentre/(boundingCubeWidth / 2))));
				var availableRed = 255 - red - 20;
				var availableBlue = 255 - blue - 20;
				var availableGreen = 255 - green - 20;
				var distToEdgeRatio = (maxDistFromCentre / (boundingCubeGridUnits / 2));

				red = red + distToEdgeRatio * availableRed;
				blue = blue + distToEdgeRatio * availableBlue;
				green = green + distToEdgeRatio * availableGreen;

				//canvasContext.fillStyle = "rgb("+red+","+shade+","+shade+")";
			}
		}
		red = Math.max(0, Math.min(235, Math.round(red)));
		green = Math.max(0, Math.min(235, Math.round(green)));
		blue = Math.max(0, Math.min(235, Math.round(blue)));
		canvasContext.fillStyle = "rgba(" + red + "," + green + "," + blue + ", " + (this.cube.active ? '0.5' : '1') + ")";

		// console.log(canvasContext.fillStyle );
		canvasContext.fill();
	};

	var Shape = function (startGridPosX, startGridPosY, startGridPosZ, relCubePositions, colourR, colourG, colourB) {
		this.colourR = colourR;
		this.colourG = colourG;
		this.colourB = colourB;
		this.relCubePositions = relCubePositions;
		this.shapePositionX = startGridPosX;
		this.shapePositionY = startGridPosY;
		this.shapePositionZ = startGridPosZ;

		this.calculateCubeGridPositions();
		this.makeCubes();
	}
	Shape.prototype.calculateCubeGridPositions = function () {
		this.relCubeGridPositions = []
		for (var i in this.relCubePositions) {
			this.relCubeGridPositions.push([this.shapePositionX + this.relCubePositions[i][0],
				this.shapePositionY + this.relCubePositions[i][1],
				this.shapePositionZ + this.relCubePositions[i][2]]);
		}
	}
	Shape.prototype.makeCubes = function () {
		this.shapeCubes = [];
		for (var i in this.relCubeGridPositions) {
			var newCube = new Cube(this.relCubeGridPositions[i][0], this.relCubeGridPositions[i][1], this.relCubeGridPositions[i][2], true, this.colourR, this.colourG, this.colourB);
			this.shapeCubes.push(newCube);
			cubes.push(newCube);
		}
	}
	Shape.prototype.gravitate = function () {
		this.move(gravity[0], gravity[1], gravity[2], true);
	}
	Shape.prototype.move = function (x, y, z, isGravitationalPull) {
		var moveOk = true;
		for (var i in this.relCubeGridPositions) {
			this.relCubeGridPositions[i][0] += x;
			this.relCubeGridPositions[i][1] += y;
			this.relCubeGridPositions[i][2] += z;
			this.shapePositionX += x;
			this.shapePositionY += y;
			this.shapePositionZ += z;
			if (moveOk !== null) {// even if we found a collision (moveOk==false), we still want to check for any nulls (off the grid)
				moveOk = moveOk && this.checkPositionsForRelCube(i, isGravitationalPull);
			}
		}
		if (moveOk) { // No collision, destroy and make at new position
			this.destroy(false);
			this.makeCubes();
		} else if (moveOk === false) { // collision
			// (We can get away without undoing the relCubeGridposition
			// moves if gravitational pull, as shape becomes frozen)
			if (isGravitationalPull) {
				this.solidify();
				newShape();
			} else {
				// reverse the move we started above
				for (i in this.relCubeGridPositions) {
					this.relCubeGridPositions[i][0] -= x;
					this.relCubeGridPositions[i][1] -= y;
					this.relCubeGridPositions[i][2] -= z;
					this.shapePositionX -= x;
					this.shapePositionY -= y;
					this.shapePositionZ -= z;
				}
			}
		} else { // move === null   off the grid. get rid of shape
			this.destroy(true);
			newShape();
		}
	}
	/* returns true (Ok), false (collision) or null (out of grid)*/
	Shape.prototype.checkPositionsForRelCube = function (i, isGravitationalPull) {
		// Check for non active cube position
		if (grid[this.relCubeGridPositions[i][0]][this.relCubeGridPositions[i][1]][this.relCubeGridPositions[i][2]] != null) {
			if (isGravitationalPull) {
				// Collision, if we are also outside the starting boundary.. Game Over
				// so check we have crossed starting boundary
				if ((Math.abs(this.relCubeGridPositions[i][0]) > boundingCubeGridUnits / 2
					&& (gravity[0] != 0 &&
						((gravity[0] > 0 && this.relCubeGridPositions[i][0] < 0)
							|| (gravity[0] < 0 && this.relCubeGridPositions[i][0] > 0))))
					|| (Math.abs(this.relCubeGridPositions[i][1]) > boundingCubeGridUnits / 2
						&& (gravity[1] != 0 &&
							((gravity[1] > 0 && this.relCubeGridPositions[i][1] < 0)
								|| (gravity[1] < 0 && this.relCubeGridPositions[i][1] > 0))))
					|| (Math.abs(this.relCubeGridPositions[i][2]) > boundingCubeGridUnits / 2
						&& (gravity[2] != 0 &&
							((gravity[2] > 0 && this.relCubeGridPositions[i][2] < 0)
								|| (gravity[2] < 0 && this.relCubeGridPositions[i][2] > 0))))
					) {
					gameOver();
				}
			}
			// just a regular collision
			return false;
		}

		// Check we haven't crossed boundary
		if ((Math.abs(this.relCubeGridPositions[i][0]) > boundingCubeGridUnits / 2
			&& (gravity[0] == 0
				|| (gravity[0] > 0 && this.relCubeGridPositions[i][0] > 0)
				|| (gravity[0] < 0 && this.relCubeGridPositions[i][0] < 0)))
			|| (Math.abs(this.relCubeGridPositions[i][1]) > boundingCubeGridUnits / 2
				&& (gravity[1] == 0
					|| (gravity[1] > 0 && this.relCubeGridPositions[i][1] > 0)
					|| (gravity[1] < 0 && this.relCubeGridPositions[i][1] < 0)))
			|| (Math.abs(this.relCubeGridPositions[i][2]) > boundingCubeGridUnits / 2
				&& (gravity[2] == 0
					|| (gravity[2] > 0 && this.relCubeGridPositions[i][2] > 0)
					|| (gravity[2] < 0 && this.relCubeGridPositions[i][2] < 0)))
			) {
			return null;
		}

		// All ok, move along
		return true;
	}
	Shape.prototype.destroy = function (withABang) {
		for (var i in this.shapeCubes) {
			destroyCube(this.shapeCubes[i], withABang);
		}
		this.shapeCubes = [];
	}
	Shape.prototype.solidify = function () {
		for (var i in this.shapeCubes) {
			this.shapeCubes[i].deactivate();
		}
//		tidyGrid();
		delete this;
	}
	Shape.prototype.flip = function (x, y, z) {
		for (var i in this.relCubeGridPositions) { // x,y,z will only ever be 1, 0 or -1
			//x && (this.relCubePositions[i][0] = -this.relCubePositions[i][0]);
			//y && (this.relCubePositions[i][1] = -this.relCubePositions[i][1]);
			//z && (this.relCubePositions[i][2] = -this.relCubePositions[i][2]);
			this.relCubePositions[i][0]++;
		}

		this.destroy(false);
		this.calculateCubeGridPositions();
		this.makeCubes();
	}


	var Cube = function (gridPosX, gridPosY, gridPosZ, active, colourR, colourB, colourG) {
		this.randCol = Math.random() * 255;
		this.wasActive = this.active = active;
		// add to grid (if not part of active shape).. otherwise verify position is available
		if (!active) {
			grid[gridPosX][gridPosY][gridPosZ] = this;
		} else {
			this.colourR = colourR;
			this.colourB = colourB;
			this.colourG = colourG;
		}

		var x = gridPosX * cubeWidth;
		var y = gridPosY * cubeWidth;
		var z = gridPosZ * cubeWidth;
		this.gridPosX = gridPosX;
		this.gridPosY = gridPosY;
		this.gridPosZ = gridPosZ;


		this.points = [
			new Point(this, [x - 0.1, y - 0.1, z - 0.1]),
			new Point(this, [x + cubeWidth, y - 0.1, z - 0.1]),
			new Point(this, [x + cubeWidth, y + cubeWidth, z - 0.1]),
			new Point(this, [x - 0.1, y + cubeWidth, z - 0.1]),
			new Point(this, [x - 0.1, y - 0.1, z + cubeWidth]),
			new Point(this, [x + cubeWidth, y - 0.1, z + cubeWidth]),
			new Point(this, [x + cubeWidth, y + cubeWidth, z + cubeWidth]),
			new Point(this, [x - 0.1, y + cubeWidth, z + cubeWidth])
		];
		this.faces = [
			new Face(this, [0, 1, 2, 3], [0, 0, 1]),
			new Face(this, [0, 4, 5, 1], [0, 1, 0]),
			new Face(this, [3, 2, 6, 7], [0, -1, 0]),
			new Face(this, [0, 3, 7, 4], [1, 0, 0]),
			new Face(this, [1, 5, 6, 2], [-1, 0, 0]),
			new Face(this, [5, 4, 7, 6], [0, 0, -1]),
		];
	};
	Cube.prototype.deactivate = function () {
		// add to grid
		this.active = false;
		this.wasActive = true;
		grid[this.gridPosX][this.gridPosY][this.gridPosZ] = this;
	}
	var destroyCube = function (cube, withABang) {
		for (var i in cube.faces) {
			if (withABang) {
				withABang = false; // only need to set the colour once
				cube.faces[i].cube.colourR = cube.faces[i].cube.colourG = cube.faces[i].cube.colourB = 255;
			}
			cube.faces[i].draw();
		}
		// Remove from cubes array
		var index = cubes.indexOf(cube);
		cubes.splice(index, 1);
		// remove from grid
		grid[cube.gridPosX][cube.gridPosY][cube.gridPosZ] = null;

//		delete cube; just del's reference anyway, garbage collector will deal with objects cos JS is sweet
	}
	var gameOver = function () {
		playing = false;
		gaveOverScreen = true;
		setTimeout(function () {
			gaveOverScreen = false
		}, 7000);
	}
	var startPlaying = function () {
		grid = [];
		cubes = [];

		gameStartTime = new Date().getTime();

		var i, j, k;
		for (i = -40; i <= 40; i++) {
			grid[i] = [];
			for (j = -40; j <= 40; j++) {
				grid[i][j] = [];
				for (k = -40; k <= 40; k++) {
					grid[i][j][k] = null;
				}
			}
		}
		cubes.push(new Cube(0, 0, 0, false));
		playing = true;
		newShape();
	}
	var newShape = function () {
		changeGravity();
		// start at point with max potential energy :)
		var startPosX = gravity[0] ? (gravity[0] * -10) : 0;
		var startPosY = gravity[1] ? (gravity[1] * -10) : 0;
		var startPosZ = gravity[2] ? (gravity[2] * -10) : 0;
		var shape;
		switch (Math.floor(Math.random() * 6)) {
			case 0:
				shape = new Shape(startPosX, startPosY, startPosZ, [[-1, -1, 0], [-1, 0, 0], [0, 0, 0]], 0, 255, 0);
				break;
			case 1:
				shape = new Shape(startPosX, startPosY, startPosZ, [[0, 0, -1], [0, 0, 0], [0, 0, 1], [0, 0, 2]], 255, 0, 0);
				break;
			case 2:
				shape = new Shape(startPosX, startPosY, startPosZ, [[0, 0, -1], [0, 0, 0]], 0, 0, 255);
				break;
			case 3:
				shape = new Shape(startPosX, startPosY, startPosZ, [[0, 0, -1], [0, 0, 0], [0, 0, 1], [0, 1, 0]], 255, 255, 0);
				break;
			case 4:
				shape = new Shape(startPosX, startPosY, startPosZ, [[0, 0, -1], [0, 0, 0], [0, 1, -1], [0, 1, 0]], 255, 0, 255);
				break;
			case 5:
				shape = new Shape(startPosX, startPosY, startPosZ, [[0, 0, 0]], 0, 255, 255);
				break;
		}
		activeShape = shape;

	}
	var changeGravity = function () {
		var randSign = Math.random() >= 0.5 ? 1 : -1;
		var randDimension = Math.floor(Math.random() * 3);
		gravity = [randDimension == 0 ? randSign : 0,
			randDimension == 1 ? randSign : 0,
			randDimension == 2 ? randSign : 0]
	}
	var tidyGrid = function () {
		var edgePositionAbs = Math.round(boundingCubeGridUnits / 2);
		var i, j, k;
//		console.log(grid);
		for (i = -edgePositionAbs; i <= edgePositionAbs; i++) {
			grid[i] = [];
			for (j = -edgePositionAbs; j <= edgePositionAbs; j++) {
				grid[i][j] = [];
				for (k = -edgePositionAbs; k <= edgePositionAbs; k++) {
					if (grid[i][j][k] instanceof Cube
						&& grid[i + 1][j][k] instanceof Cube
						&& grid[i][j + 1][k] instanceof Cube
						&& grid[i][j][k + 1] instanceof Cube
						&& grid[i + 1][j + 1][k] instanceof Cube
						&& grid[i + 1][j + 1][k + 1] instanceof Cube
						&& grid[i + 1][j][k + 1] instanceof Cube
						&& grid[i][j][k + 1] instanceof Cube)
					{
					console.log('hi');
						destroyCube(grid[i][j][k]);
						destroyCube(grid[i + 1][j][k]);
						destroyCube(grid[i][j + 1][k]);
						destroyCube(grid[i][j][k + 1]);
						destroyCube(grid[i + 1][j + 1][k]);
						destroyCube(grid[i + 1][j + 1][k + 1]);
						destroyCube(grid[i + 1][j][k + 1]);
						destroyCube(grid[i][j][k + 1]);
					}
				}
			}
		}
	}
	var init = function () {
		canvasElement = document.getElementById('tetricube');
		canvasContext = canvasElement.getContext("2d");
		camera = new Camera();
                canvasElement.addEventListener("click", function (e) {
		
                });
                
                canvasElement.addEventListener("touchstart", function (e) {

                    if (!playing) {
                            startPlaying();
                    } else {
                            if (activeShape) {
                                    activeShape.gravitate();
                            }
                            var touchobj = e.changedTouches[0] // reference first touch point for this event
                            touchLastX = touchStartX = parseInt(touchobj.clientX);
                            touchLastY = touchStartY = parseInt(touchobj.clientY);
                    }
                    e.preventDefault();
                });
                
                canvasElement.addEventListener("touchmove", function (e) {
                    if(playing) {
                        var touchobj = e.changedTouches[0] // reference first touch point for this event                        
			camera.gotoY += (parseInt(touchobj.clientX) - touchLastX)/150;
                        camera.gotoX -= (parseInt(touchobj.clientY) - touchLastY)/150;
                        touchLastX = parseInt(touchobj.clientX);
                        touchLastY = parseInt(touchobj.clientY);

                        //Limit X movement
                        camera.gotoX = Math.min(maxVerticalMovement, Math.max(-maxVerticalMovement, camera.gotoX));
                        
                        e.preventDefault();
                    }
                });
		document.addEventListener("keydown", function (e) {
			if (!playing) {
				switch (e.keyCode) {
					case 13:
						startPlaying();
						e.preventDefault();
						break;
					case 32:// still want to stop space key from scrolling page
						e.preventDefault();
						break;
				}
			} else {
				switch (e.keyCode) {
					case 37: // left
						if (e.ctrlKey) {

						} else {
							//gotoY += 0.5 * Math.PI;
							//gotoY = Math.round(gotoY*1000)/1000;
							camera.gotoY += rotationSpeed;
						}
						e.preventDefault();
						break;

					case 38: // up
						if (e.ctrlKey) {
							activeShape.flip(0, 1, 0)
						} else {
							//gotoX -= 0.5 * Math.PI;
							//gotoX = Math.round(gotoX*1000)/1000;
							camera.gotoX -= rotationSpeed;
							camera.gotoX = Math.min(maxVerticalMovement, Math.max(-maxVerticalMovement, camera.gotoX));
						}
						e.preventDefault();

						break;

					case 39: // right
						if (e.ctrlKey) {

						} else {
							// gotoY -= 0.5 * Math.PI;
							// gotoY = Math.round(gotoY*1000)/1000;
							camera.gotoY -= rotationSpeed;
						}
						e.preventDefault();

						break;

					case 40: // down
						if (e.ctrlKey) {

						} else {
							// gotoX += 0.5 * Math.PI;
							// gotoX = Math.round(gotoX*1000)/1000;
							camera.gotoX += rotationSpeed;
							camera.gotoX = Math.min(maxVerticalMovement, Math.max(-maxVerticalMovement, camera.gotoX));
						}
						e.preventDefault();

						break;

					case 65: // left (a)
						if (gravity[0]) {
							activeShape.move(0, 0, gravity[0]);
						}
						else if (gravity[1]) {
							activeShape.move(-gravity[1], 0, 0);
						}
						else if (gravity[2]) {
							activeShape.move(-gravity[2], 0, 0);
						}
						e.preventDefault();
						break;

					case 87: // up (w)
						if (gravity[0] > 0) {
							activeShape.move(0, -gravity[0], 0);
						}
						else if (gravity[0] < 0) {
							activeShape.move(0, gravity[0], 0);
						}
						else if (gravity[1]) {
							activeShape.move(0, 0, gravity[1]);
						}
						else if (gravity[2] > 0) {
							activeShape.move(0, -gravity[2], 0);
						}
						else if (gravity[2] < 0) {
							activeShape.move(0, gravity[2], 0);
						}
						e.preventDefault();
						break;

					case 68: // right (d)
						if (gravity[0]) {
							activeShape.move(0, 0, -gravity[0]);
						}
						if (gravity[1]) {
							activeShape.move(gravity[1], 0, 0);
						}
						if (gravity[2]) {
							activeShape.move(gravity[2], 0, 0);
						}
						e.preventDefault();
						break;

					case 83: // down (s)
						if (gravity[0] > 0) {
							activeShape.move(0, gravity[0], 0);
						}
						else if (gravity[0] < 0) {
							activeShape.move(0, -gravity[0], 0);
						}
						else if (gravity[1]) {
							activeShape.move(0, 0, -gravity[1]);
						}
						else if (gravity[2] > 0) {
							activeShape.move(0, gravity[2], 0);
						}
						else if (gravity[2] < 0) {
							activeShape.move(0, -gravity[2], 0);
						}
						e.preventDefault();
						break;

					case 32: // space
						if (activeShape) {
							activeShape.gravitate();
						}
						e.preventDefault();
						break;
				}

			}
		}, false);

		var scr = document.getElementById("gameContainer");
		gameWidth = scr.offsetWidth;
		gameHeight = scr.offsetHeight;
		canvasElement.width = gameWidth;
		canvasElement.height = gameHeight;
		canvasElement.style.width = gameWidth + 'px';
		canvasElement.style.height = gameHeight + 'px';

		//var boundingCubeCubeCoords = (boundingCubeWidth/2) * Math.sin(Math.PI/4);
		var boundingCubeCubeCoords = boundingCubeWidth / 2;
		boundingCubePoints = [
			new Point(null, [boundingCubeCubeCoords, boundingCubeCubeCoords, boundingCubeCubeCoords]),
			new Point(null, [boundingCubeCubeCoords, boundingCubeCubeCoords, -boundingCubeCubeCoords]),
			new Point(null, [boundingCubeCubeCoords, -boundingCubeCubeCoords, boundingCubeCubeCoords]),
			new Point(null, [boundingCubeCubeCoords, -boundingCubeCubeCoords, -boundingCubeCubeCoords]),
			new Point(null, [-boundingCubeCubeCoords, boundingCubeCubeCoords, boundingCubeCubeCoords]),
			new Point(null, [-boundingCubeCubeCoords, boundingCubeCubeCoords, -boundingCubeCubeCoords]),
			new Point(null, [-boundingCubeCubeCoords, -boundingCubeCubeCoords, boundingCubeCubeCoords]),
			new Point(null, [-boundingCubeCubeCoords, -boundingCubeCubeCoords, -boundingCubeCubeCoords])
		];

		boundingCubeLines = [
			[boundingCubePoints[0], boundingCubePoints[1]],
			[boundingCubePoints[0], boundingCubePoints[2]],
			[boundingCubePoints[0], boundingCubePoints[4]],
			[boundingCubePoints[4], boundingCubePoints[0]],
			[boundingCubePoints[4], boundingCubePoints[5]],
			[boundingCubePoints[4], boundingCubePoints[6]],
			[boundingCubePoints[3], boundingCubePoints[1]],
			[boundingCubePoints[3], boundingCubePoints[2]],
			[boundingCubePoints[3], boundingCubePoints[7]],
			[boundingCubePoints[6], boundingCubePoints[2]],
			[boundingCubePoints[6], boundingCubePoints[4]],
			[boundingCubePoints[6], boundingCubePoints[7]],
			[boundingCubePoints[5], boundingCubePoints[1]],
			[boundingCubePoints[5], boundingCubePoints[7]]
		];

		boundingCubeShimmerLinePathsAndDirections = [
			{fromBoundingCubePointIndex: 4, toBoundingCubePointIndex: 0, direction: [0, -1, 0]},
			{fromBoundingCubePointIndex: 0, toBoundingCubePointIndex: 1, direction: [0, -1, 0]},
			{fromBoundingCubePointIndex: 5, toBoundingCubePointIndex: 4, direction: [0, -1, 0]},
			{fromBoundingCubePointIndex: 1, toBoundingCubePointIndex: 5, direction: [0, -1, 0]},
			{fromBoundingCubePointIndex: 4, toBoundingCubePointIndex: 5, direction: [1, 0, 0]},
			{fromBoundingCubePointIndex: 3, toBoundingCubePointIndex: 2, direction: [-1, 0, 0]}
		];

		run();
	}


	var run = function () {
		canvasContext.fillStyle = 'rgba(0,0,0,0.3)';
		canvasContext.fillRect(0, 0, gameWidth, gameHeight);
		canvasContext.font = "30px Comic Sans MS";
		canvasContext.fillStyle = "red";
		canvasContext.fillText("TETRICUBE v1", 0, 30);

		var t = new Date().getTime();

		if (gaveOverScreen) {
			canvasContext.font = "40px Comic Sans MS";
			canvasContext.fillStyle = "orange";
			canvasContext.fillText("GAMEOVER", 140 + (t % 2), 170 - (t % 25));
			canvasContext.fillStyle = "purple";
			canvasContext.fillText("BITCH", 240 + (t % 2), 270 - (t % 25));
		}
		else if (!playing) {
			canvasContext.font = "25px Comic Sans MS";
			canvasContext.fillStyle = "blue";
			canvasContext.fillText("Press ENTER to begin", 140 + (t % 2), 170 - (t % 25));
			canvasContext.font = "20px Comic Sans MS";
			canvasContext.fillStyle = "red";
			canvasContext.fillText("if you dare to face the tetricube!", 380 + (t % 5), 120 + (t % 75));
			canvasContext.fillText("â†,â†‘,â†’,â†“ rotate outer cube...... Ctrl + â†,â†‘,â†’,â†“ rotate current shape", 100, 400);
			canvasContext.fillText("w,a,s,d move the shape", 300, 460);

		} else {

			var ms = t - gameStartTime;
			var min = (ms / 1000 / 60) << 0;
			var sec = Math.floor(ms / 1000) % 60;
			if (sec < 10) {
				sec = '0' + sec;
			}
			canvasContext.font = "30px Comic Sans MS";
			canvasContext.fillStyle = "red";
			canvasContext.fillText("--- " + min + ':' + sec, 220, 30);

			camera.update();


			// ---- points generateCoordinates ----
			var i = 0, c;
			while (c = cubes[i++]) {
				var j = 0, p;
//				console.log(c)
				while (p = c.points[j++]) {
					p.generateCoordinates();
				}
			}

			var allFaces = [];
			for (var i in cubes) {
				for (var j in cubes[i].faces) {
					var f = cubes[i].faces[j];
					f.distanceToCamera = Number.MIN_VALUE;
					allFaces.push(f);
					var dx = (f.p0.viewerX + f.p1.viewerX + f.p2.viewerX + f.p3.viewerX) * 0.25;
					var dy = (f.p0.viewerY + f.p1.viewerY + f.p2.viewerY + f.p3.viewerY) * 0.25;
					var dz = zoom + fieldSize + (f.p0.viewerZ + f.p1.viewerZ + f.p2.viewerZ + f.p3.viewerZ) / 4;
					f.distanceToCamera = Math.sqrt(dx * dx + dy * dy + dz * dz);
				}
			}

			allFaces.sort(function (face1, face2) {
				return face2.distanceToCamera > face1.distanceToCamera;
			});

			// boundng cube    

			var boundingCubeShimmerLines = [
			];

			for (i in boundingCubeShimmerLinePathsAndDirections) {
				var data = boundingCubeShimmerLinePathsAndDirections[i];
				//    console.log(data);
				var p1 = new Point(null, [boundingCubePoints[data.fromBoundingCubePointIndex].worldX + (data.direction[0] * boundingCubeFaceShimmerPosition),
					boundingCubePoints[data.fromBoundingCubePointIndex].worldY + (data.direction[1] * boundingCubeFaceShimmerPosition),
					boundingCubePoints[data.fromBoundingCubePointIndex].worldZ + (data.direction[2] * boundingCubeFaceShimmerPosition)
				]);
				var p2 = new Point(null, [boundingCubePoints[data.toBoundingCubePointIndex].worldX + (data.direction[0] * boundingCubeFaceShimmerPosition),
					boundingCubePoints[data.toBoundingCubePointIndex].worldY + (data.direction[1] * boundingCubeFaceShimmerPosition),
					boundingCubePoints[data.toBoundingCubePointIndex].worldZ + (data.direction[2] * boundingCubeFaceShimmerPosition)
				]);
				p1.generateCoordinates();
				p2.generateCoordinates();
				boundingCubeShimmerLines.push(
					[p1, p2]
					);
			}


			for (p in boundingCubePoints) {
				boundingCubePoints[p].generateCoordinates();

				//	canvasContext.fillText(boundingCubePoints[p].worldY, boundingCubePoints[p].canvasX, boundingCubePoints[p].canvasY);
			}

			canvasContext.strokeStyle = 'rgb(80,40,40)';
			for (i in boundingCubeShimmerLines) {
				//     if(boundingCubeShimmerLines[i][0].visible && boundingCubeShimmerLines[i][1].visible) {
				canvasContext.beginPath();
				canvasContext.moveTo(boundingCubeShimmerLines[i][0].canvasX, boundingCubeShimmerLines[i][0].canvasY);
				canvasContext.lineTo(boundingCubeShimmerLines[i][1].canvasX, boundingCubeShimmerLines[i][1].canvasY);
				canvasContext.stroke();
				//   }
			}
			canvasContext.strokeStyle = 'rgb(255,150,150)';
			for (i in boundingCubeLines) {
				// if(boundingCubeLines[i][0].visible && boundingCubeLines[i][1].visible) {
				canvasContext.beginPath();
				canvasContext.moveTo(boundingCubeLines[i][0].canvasX, boundingCubeLines[i][0].canvasY);
				canvasContext.lineTo(boundingCubeLines[i][1].canvasX, boundingCubeLines[i][1].canvasY);
				canvasContext.stroke();
				//}
			}
			boundingCubeFaceShimmerPosition += 70;
			boundingCubeFaceShimmerPosition = boundingCubeFaceShimmerPosition % (boundingCubeWidth);

			for (var i in allFaces) {
				allFaces[i].draw();
			}

			canvasContext.font = "15px Comic Sans MS";
			canvasContext.fillStyle = "red";
			canvasContext.fillText(camera.cameraX / Math.PI, 30, 400);
			canvasContext.fillText(camera.cameraY / Math.PI, 30, 420);
			canvasContext.fillText(camera.cameraZ / Math.PI, 30, 450);
			/*	DEBUG, (show x y z axies) 	
			 var origin = new Point(null, [0,0,0])
			 origin.generateCoordinates();
			 
			 var xp = new Point(null, [100,0,0])
			 var yp = new Point(null, [0,100,0])
			 var zp = new Point(null, [0,0,100])
			 
			 xp.generateCoordinates();
			 yp.generateCoordinates();
			 zp.generateCoordinates();
			 
			 canvasContext.strokeStyle = 'red';
			 canvasContext.beginPath();
			 canvasContext.moveTo(origin.canvasX,origin.canvasY);
			 canvasContext.lineTo(xp.canvasX, xp.canvasY);
			 canvasContext.stroke();
			 canvasContext.fillStyle = "red";
			 canvasContext.fillText("X", xp.canvasX, xp.canvasY);
			 
			 canvasContext.strokeStyle = 'blue';
			 canvasContext.beginPath();
			 canvasContext.moveTo(origin.canvasX,origin.canvasY);
			 canvasContext.lineTo(yp.canvasX, yp.canvasY);
			 canvasContext.stroke();
			 canvasContext.fillStyle = "blue";
			 canvasContext.fillText("Y", yp.canvasX, yp.canvasY);
			 
			 canvasContext.strokeStyle = 'red';
			 canvasContext.beginPath();
			 canvasContext.moveTo(origin.canvasX,origin.canvasY);
			 canvasContext.lineTo(zp.canvasX, zp.canvasY);
			 canvasContext.stroke();
			 canvasContext.fillStyle = "red";
			 canvasContext.fillText("Z", zp.canvasX, zp.canvasY);
			 */

			frameCount++;
			if (!(frameCount % framesPerTick)) {
				clockTicks++;
				if (activeShape) {
					activeShape.gravitate();
				}
			}
		}
		setTimeout(run, 20);
	}

	return {
		load: function () {
			window.addEventListener('load', function () {
				init();
			}, false);
		}
	}
})().load();
