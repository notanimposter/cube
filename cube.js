
var camera, controls, scene, renderer, renderer2, scene2, camera2;
var cubes, textures;
var selected;
var tenum = {
	east: 0,
	west: 1,
	up: 2,
	down: 3,
	south: 4,
	north: 5
};

var tarray = [
	["east","west"],
	["up","down"],
	["south","north"]
];
var loadFiles = {
	mesh: "block/bookshelf"
}
var gui = new dat.GUI();

var loaders = gui.addFolder("Files");
loaders.open();
var loader = loaders.add(loadFiles, "mesh").onFinishChange(function() { loadModel(loadFiles.mesh, false) });
var importControl = loaders.add({Import: ""}, "Import").onFinishChange(importModel);
var exportControl = loaders.add({Export: exportModel}, "Export");
init();


loadModel(loadFiles.mesh, false);
var texControls = gui.addFolder("Textures");
texControls.open();


var editControls = gui.addFolder("Edit");
editControls.open();
var newBoxBtn = editControls.add({New: newCube}, "New");
var selectedControls = gui.addFolder("Selected");
selectedControls.open();

//put stuff here
function init() {
	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth - 400, window.innerHeight - 10 );
	renderer.setClearColor( 0x99ccff, 1 );
	document.body.appendChild(renderer.domElement);
	
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.z = 50;
	scene = new THREE.Scene();
	scene.add( new THREE.AmbientLight( 0xbbbbbb ) );
	var light = new THREE.DirectionalLight( 0xffffff, .1 );
	light.position.set( 0, 1, 0 );
	scene.add( light );
	
	
	
	controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.addEventListener( 'change', render );

	
	// renderer
	renderer2 = new THREE.WebGLRenderer({ alpha: true });
	renderer2.setSize( 128, 128);
	renderer2.setClearAlpha(0);
	// scene
	scene2 = new THREE.Scene();

	// camera
	camera2 = new THREE.PerspectiveCamera( 75, 1, 1, 1000 );
	camera2.up = camera.up; // important!
	scene2.add( camera2 );
	
	var threeZeros = new THREE.Vector3((0,0,0))
	var color = 0xff0000;
	for (var i=0; i<3;i++) {
		var to = new THREE.Vector3(i===0|0,i===1|0,i===2|0);
		scene2.add(new THREE.ArrowHelper( to, threeZeros, 5, color, 2,1));
		
		var canvas = document.createElement("canvas")
		var context = canvas.getContext("2d");
		canvas.width = 128;
		canvas.height = 128;
		context.textAlign = 'center';
		context.font = '32px sans-serif';
		context.fillStyle = "#"+Array(i*2+1).join("0")+color.toString(16);
		context.fillText(tarray[i][0], 64, 64);
		mat = new THREE.SpriteMaterial({
			map: new THREE.Texture(canvas),
			transparent: true,
			useScreenCoordinates: false,
			color: 0xffffff // CHANGED
		});
		mat.map.needsUpdate = true;
		var sprite = new THREE.Sprite(mat);
		to.multiplyScalar(5)
		sprite.position.set(to.x,to.y,to.z)
		sprite.scale.set( 5, 5, 1 );
		scene2.add(sprite);
		color /= 256;
	}
	
	
	
	
	//scene2.add( new THREE.AxisHelper(5) );
	
	
	document.body.appendChild(renderer2.domElement);
	$(renderer2.domElement).css({position: "relative", top: -(window.innerHeight - 10)+128+"px", left: -128+"px"});
	
	scene.add(camera);
	
	
	
	var axisHelper = new THREE.AxisHelper( 30 );
	scene.add( axisHelper );
}

function render() {
	camera2.position.copy( camera.position );
	camera2.position.sub( controls.target ); // added by @libe
	camera2.position.setLength( 10 );

	camera2.lookAt( scene2.position );
	renderer2.render( scene2, camera2 );
	
	renderer.render( scene, camera );
	
}
(function animate() {
	requestAnimationFrame( animate );
	
	
	render();
})();
function loadModel(model, compound) {
	//console.log("beep boop");
	if (!compound) {
		scene.remove(cubes);
		cubes = new THREE.Object3D();
		textures = {};
	}
	function parseModel(json) {
		getTextures(json.textures);
		var mats = makeMats();
		if (json.elements !== void(0)) {
			$.each( json.elements, function( key, obj) {
			
				var ftsg = fromToSizeGeo(obj);
				
				var faces = makeFaces(obj, mats, ftsg.geo);

				var mesh = new THREE.Mesh( ftsg.geo, new THREE.MeshFaceMaterial(faces, {transparent: true}) );
				
				var temp = ftsg.from.add(ftsg.size.divideScalar(2));
				
				mesh.position.set(temp.x,temp.y,temp.z);
				mesh.obj = obj;
				cubes.add(mesh);
			});
			cubes.position.set(-8,-8,-8);
			scene.add(cubes);
			render();
		}
		if (json.parent !== void(0)) {
			loadModel(json.parent, true)
		}
	}
	if (typeof model === "string") {
		$.ajax({
			dataType: "text",
			url: "models/"+ model+".json",
			success: function(data) {
				var json;
				eval("json = "+data);
				//console.log("boop bop");
				
				parseModel(json);
		}});
	} else {
		parseModel(model);
	}
}
renderer.domElement.addEventListener( 'mousedown', function( event ) {
	if (event.button === 0) {
		event.preventDefault();
		console.log("boop boop bop");
		var mouseX = ( event.clientX / renderer.domElement.offsetWidth ) * 2 - 1;
		var mouseY = -( event.clientY / renderer.domElement.offsetHeight ) * 2 + 1;
		var vector = new THREE.Vector3( mouseX, mouseY, camera.near );
		//var projector = new THREE.Projector();
		//projector.unprojectVector( vector, camera );
		vector.unproject(camera);
		var raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
		var intersects = raycaster.intersectObjects( cubes.children, true );
		if (intersects[0] != null) {
			select(intersects[0].object.id);
		}
	}
});

function select(id) {
		
		for (var g in selectedControls.__controllers) {
			try {
				selectedControls.__controllers[g].remove();
			} catch (e) {}
		}

		for (var name in selectedControls.__folders) {
			try {
				selectedControls.__folders[name].close();
				selectedControls.__folders[name].domElement.parentNode.parentNode.removeChild(selectedControls.__folders[name].domElement.parentNode);
				delete selectedControls.__folders[name];
				gui.onResize();
			} catch (e) {}
		}
		
		if (selected != null) {
			selected.remove(selected.children[0]);
		}
		selected = cubes.getObjectById(id);
		if (selected === null) return;
		var mat = new THREE.MeshBasicMaterial( { color: '#ff00ff', wireframe: true} );
		var mesh = new THREE.Mesh( selected.geometry, mat );
		selected.add(mesh);

		var f = {};
		var jkl = JSON.stringify(selected.obj.from);
		f.from = jkl.substring(1, jkl.length-1);
		var ctrl = selectedControls.add(f, 'from');
		ctrl.onFinishChange(function(val) {
			selected.obj.from = JSON.parse("["+val+"]");
			updateFromObj(selected);
		});
		var t = {};
		var jkl = JSON.stringify(selected.obj.to);
		t.to = jkl.substring(1, jkl.length-1);
		var ctrl2 = selectedControls.add(t, 'to');
		ctrl2.onFinishChange(function(val) {
			selected.obj.to = JSON.parse("["+val+"]");
			updateFromObj(selected);
		});
		for (var key in tenum) {
			var f = selectedControls.addFolder(key);
			if (selected.obj.faces[key] === void(0)) {
				

				f.add({Add: function(){}}, "Add").onChange(function() {
					selected.obj.faces[this.__gui.name] = {"uv":[0,0,16,16],"texture":"#"+Object.keys(textures)[0],"rotation":0};

					updateFromObj(selected);
					select(selected.id);
				});
			}
		}
		for (var key in selected.obj.faces) {
			var face = selected.obj.faces[key];
			
			var folder = selectedControls.__folders[key];

			var fd = {};
			var jkl = JSON.stringify(face.uv);
			fd[key] = jkl.substring(1, jkl.length-1);
			var ctrl3 = folder.add(fd, key).listen();
			ctrl3.onFinishChange(function(val) {
				//selected.obj.to = JSON.parse("["+val+"]");
				//console.log(this.property);
				//console.log("running the thing");
				selected.obj.faces[this.property].uv = JSON.parse("["+val+"]");
				updateFromObj(selected.id);
			});


			var tList = {}
			for (var t in textures) {
				tList[t] = "#"+t;
			}
			var ctrl4 = folder.add(selected.obj.faces[key], "texture", tList);
			ctrl4.onFinishChange(function(val) {	
				updateFromObj(selected);
			});
			var ctrl5 = folder.add(selected.obj.faces[key], "rotation",0,270).step(90);
			ctrl4.onFinishChange(function(val) {
				updateFromObj(selected);
			});
			var ctrl5 = folder.add({Delete: function() {}}, "Delete").onChange(function() {
				delete selected.obj.faces[this.__gui.name];
				updateFromObj(selected);
				select(selected.id);
			});
		}
		var delBtn = selectedControls.add({Delete: function() {cubes.remove(selected)}}, "Delete");
		render();
}
function importModel() {
	var json;
	eval("json = "+this.object.Import);
	loadModel(json, false);
}
function exportModel() {
	var json = { 'textures': textures, 'elements': []};
	for (var c in cubes.children) {
		json['elements'][json['elements'].length] = cubes.children[c].obj;
	}
	window.open('data:application/json;' + (window.btoa?'base64,'+btoa(JSON.stringify(json, null, 2)):JSON.stringify(json, null, 2)));
}
function newCube() {
	var obj = {
		"from":[0,0,0],
		"to":[16,16,16],
		"rotation": {"origin": [ 0,0,0 ], "axis": "y", "angle": 0},
		"faces": {
			/*"up":{"uv":[0,0,16,16],"texture":"#"+Object.keys(textures)[0],"rotation":0},
			"down":{"uv":[0,0,16,16],"texture":"#"+Object.keys(textures)[0],"rotation":0},
			"north":{"uv":[0,0,16,16],"texture":"#"+Object.keys(textures)[0],"rotation":0},
			"south":{"uv":[0,0,16,16],"texture":"#"+Object.keys(textures)[0],"rotation":0},
			"west":{"uv":[0,0,16,16],"texture":"#"+Object.keys(textures)[0],"rotation":0},
			"east":{"uv":[0,0,16,16],"texture":"#"+Object.keys(textures)[0],"rotation":0}*/
		}
	};
	var mats = makeMats();
	var ftsg = fromToSizeGeo(obj);
	
	var faces = makeFaces(obj, mats, ftsg.geo);

	var mesh = new THREE.Mesh( ftsg.geo, new THREE.MeshFaceMaterial(faces, {transparent: true}) );
	
	var temp = ftsg.from.add(ftsg.size.divideScalar(2));
	
	mesh.position.set(temp.x,temp.y,temp.z);
	mesh.obj = obj;
	cubes.add(mesh);
	select(mesh.id);
	render();
}
function updateFromObj(box) {
	var obj = box.obj;
	box.geometry.verticesNeedUpdate = true;
	box.geometry.elementsNeedUpdate = true;
	box.geometry.uvsNeedUpdate = true;
	box.geometry.normalsNeedUpdate = true;
	box.geometry.tangentsNeedUpdate = true;
	box.geometry.colorsNeedUpdate = true;
	box.geometry.lineDistancesNeedUpdate = true;
	var ftsg = fromToSizeGeo(obj);
	
	box.geometry.vertices = ftsg.geo.vertices;
	
	var mats = makeMats();
	
	var faces = makeFaces(obj, mats, box.geometry);
	
	box.material = new THREE.MeshFaceMaterial(faces, {transparent: true});
	var temp = ftsg.from.add(ftsg.size.divideScalar(2));
	box.position.set(temp.x,temp.y,temp.z);
	render();
	//console.log("bop");
}
function getTextures(jsTex) {
	if (jsTex !== void(0)) {
		for (var key in jsTex) {
			if (jsTex.hasOwnProperty(key)) {
				textures[key] = jsTex[key];
			}
		}
	}
	for (var g in texControls.__controllers) {
		try {
			texControls.__controllers[g].remove();
		} catch (e) {}
	}
	for (var t in textures) {
		texControls.add(textures, t).onFinishChange(function() {
			for (var c in cubes.children) {
				updateFromObj(cubes.children[c]);
			}
		});
	}
}
function makeMats() {
	var mats = {};
	for (var key in textures) {
		if (textures.hasOwnProperty(key)) {
			var g = textures[key];
			if (g[0] === '#') {
				g = textures[g.sub(1)];
			}
			var tex = THREE.ImageUtils.loadTexture("textures/"+g+".png", THREE.UVMapping);
			tex.wrapS = THREE.RepeatWrapping;
			tex.wrapT = THREE.RepeatWrapping;
			tex.magFilter= THREE.NearestFilter;
			tex.minFilter = THREE.LinearMipMapLinearFilter;

			var mat = new THREE.MeshPhongMaterial( { map: tex, transparent:true })
			//mat.polygonOffset = true;
			//mat.polygonOffsetFactor = -.1;
			mats[key] = mat;
		}
	}
	return mats;
}
function fromToSizeGeo(obj) {
	var from = new THREE.Vector3(obj.from[0], obj.from[1]*.75, obj.from[2]);
	var to = new THREE.Vector3(obj.to[0], obj.to[1]*.75, obj.to[2]);
	var size = new THREE.Vector3(0,0,0).copy(to).sub(from);
	var geo = new THREE.BoxGeometry(size.x,size.y,size.z);
	return {from:from,to:to,size:size,geo:geo};
}
function makeFaces(obj, mats, geo) {
	var faces = [];
	geo.faceVertexUvs[0] = [];
	for (var k in obj.faces) {
		var face = obj.faces[k];
		
		if (face.rotation === void(0))
			face.rotation = 0;
		if (face.uv === void(0))
			face.uv = [0,0,16,16];
		var newUvs = face.uv.slice();
		
		for (var i=1;i<=(face.rotation/90);i++) {
			//if (tenum[k] === 0) {
			//	var e = newUvs.shift();
			//	newUvs[3] = e;
			//} else {
				newUvs.unshift(newUvs[3]);
				newUvs.length = 4;
			//}
		}
		var uvCoords = [
			new THREE.Vector2(((tenum[k]===1 && face.rotation !== 0)*-2+1)*newUvs[2]/16, (1-newUvs[1]/16)*((tenum[k]===0 && face.rotation !== 0)*-2+1)),
			new THREE.Vector2(((tenum[k]===1 && face.rotation !== 0)*-2+1)*newUvs[0]/16, (1-newUvs[1]/16)*((tenum[k]===0 && face.rotation !== 0)*-2+1)),
			new THREE.Vector2(((tenum[k]===1 && face.rotation !== 0)*-2+1)*newUvs[0]/16, (1-newUvs[3]/16)*((tenum[k]===0 && face.rotation !== 0)*-2+1)),
			new THREE.Vector2(((tenum[k]===1 && face.rotation !== 0)*-2+1)*newUvs[2]/16, (1-newUvs[3]/16)*((tenum[k]===0 && face.rotation !== 0)*-2+1))
		];
		function sind(a) {
			return Math.sin(a/180*Math.PI);
		}
		function cosd(a) {
			return Math.cos(a/180*Math.PI);
		}
		var r = face.rotation //+ ((tenum[k]===0|0)*180);
		for (var i=0;i<4;i++)
			uvCoords[i].set(uvCoords[i].x*cosd(r) - uvCoords[i].y*sind(r),uvCoords[i].x*sind(r) + uvCoords[i].y*cosd(r));
		
		geo.faceVertexUvs[0][tenum[k]*2] = [uvCoords[1], uvCoords[2], uvCoords[0]];
		geo.faceVertexUvs[0][tenum[k]*2+1] = [uvCoords[2], uvCoords[3], uvCoords[0]];
		//console.log(tenum[k]);
		faces[tenum[k]] = mats[face.texture.substr(1)]
	}
	faces.length = 6;
	for (var f=0;f < faces.length;f++) {
		if ( faces[f] === void(0)) {
			faces[f] = new THREE.MeshBasicMaterial({color: 0x000, transparent: true, opacity: 0,depthWrite: false, depthTest: false});
			//mat.polygonOffset = true;
			//mat.polygonOffsetFactor = 1;
		}
	}
	return faces;
}
renderer.domElement.addEventListener( 'keydown', function(event) {
	//console.log("bop boop");
	if (event.keyCode === 46) {
		
		cubes.remove(selected);
		selected = null;
	}
	render();
});