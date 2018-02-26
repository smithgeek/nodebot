function isLocked(){
	return document.pointerLockElement === controller;
}

function lockChangeAlert() {
	if (isLocked()) {
		console.log('The pointer lock status is now locked');
	} else {
		console.log('The pointer lock status is now unlocked');
		socket.disconnect();
	}
}

let socket = null;

document.addEventListener('pointerlockchange', lockChangeAlert, false);

const sendMouseMove = _.throttle(function(e){
	socket.emit("move", e);
	console.log(e);
}, 10);

document.onmousemove = ev => {
	if(isLocked()){
		sendMouseMove({x: ev.movementX, y: ev.movementY});
	}
}

const controller = document.querySelector("#control");

controller.onclick = ev => {
	if (!isLocked()) {
		socket = io();
		controller.requestPointerLock();
		socket.on("disconnect", () => {
			document.exitPointerLock();
		})
	}
}

controller.onmousedown = ev => {
	if (isLocked()) {
		ev.preventDefault();
		socket.emit("down", ev.which);
		console.log(ev);
	}
}

controller.onmouseup = ev => {
	if (isLocked()) {
		ev.preventDefault();
		socket.emit("up", ev.which);
		console.log(ev);
	}
}

document.onwheel = ev => {
	if(isLocked()){
		socket.emit("wheel", ev.deltaY);
		console.log(ev);
	}
}

document.onkeydown = ev => {
	if(isLocked()){
		ev.preventDefault();
		const {key, shiftKey, altKey, ctrlKey} = ev;
		socket.emit("key", {key, shiftKey, altKey, ctrlKey});
		console.log(ev);
	}
}

