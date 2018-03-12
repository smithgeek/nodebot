import * as express from 'express';
import {Server} from 'http';
import * as fs from 'fs';
import * as robot from 'robotjs';
import * as socketIo from 'socket.io';
import {exec} from 'child_process';

const app = express();
const http = new Server(app);
const io = socketIo(http);

let config: {port?: string};
try {
	config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
}
catch {
	console.warn("could not read config file");
	config = {};
}

app.use(express.static("./src/views"));


function standardExec(cmd: string, res: express.Response){
	exec(cmd, (error, stdout, stderr) => {
		if(error){
			res.json({error, stdout, stderr}).status(500);
			res.send();
		}
		else{
			res.json({error, stderr, stdout}).status(200);
			res.send();
		}
	});
}

const mouseButtons = ["", "left", "middle", "right"];
const ignoreKeys = ["Shift", "Alt", "Control"];
const removePrefixes = ["Arrow"];

let connected = false;
io.on("connection", socket => {
	if(connected){
		socket.emit("msg", "Machine already under control.")
		socket.disconnect();
	}
	else{
		debug("connected");
		connected = true;
		socket.on("disconnect", () => {
			debug("disconnected");
			connected = false;
		});
		socket.on("move", delta => {
			debug("move", delta);
			const position = robot.getMousePos();
			robot.moveMouse(position.x + delta.x, position.y + delta.y);
		});
		socket.on("wheel", delta => {
			debug("wheel", delta);
			if(process.platform === "win32"){
				robot.scrollMouse(-delta, 0 as any);
			}
			else{
				robot.scrollMouse(0, -delta as any);
			}
		});
		socket.on("down", which => {
			debug("down", which);
			robot.mouseToggle("down", mouseButtons[which]);
		});
		socket.on("up", which => {
			debug("up", which);
			robot.mouseToggle("up", mouseButtons[which]);
		});
		socket.on("key", (event: {key?: string, shiftKey: boolean, ctrlKey: boolean, altKey: boolean}) => {
			debug(event);
			if(event.key && ignoreKeys.indexOf(event.key) < 0){
				for(let i = 0; i < removePrefixes.length; ++i){
					if(event.key.startsWith(removePrefixes[i])){
						event.key = event.key.substr(removePrefixes[i].length);
					}
				}
				if(event.ctrlKey && event.altKey && event.key.toLowerCase() === 'e'){
					robot.keyTap("escape");
				}
				else{
					if(event.shiftKey){
						robot.keyToggle("shift", "down");
					}
					if(event.ctrlKey){
						robot.keyToggle("control", "down");
					}
					if(event.altKey){
						robot.keyToggle("alt", "down");
					}
					debug("key", event.key);
					try{
						robot.keyTap(event.key.toLowerCase())
					}
					catch(error){
						debug(error);
					}
					if(event.shiftKey){
						robot.keyToggle("shift", "up");
					}
					if(event.ctrlKey){
						robot.keyToggle("control", "up");
					}
					if(event.altKey){
						robot.keyToggle("alt", "up");
					}
				}
			}
		})
	}
});

app.get('/api/DisconnectAll', (_req, res) => {
	for(let socket in io.sockets.sockets){
		io.sockets.sockets[socket].disconnect(true);
	}
	res.status(200).send();
});

app.get("/api/Update", (_req, res) => {
	standardExec("npm run update", res);
});

app.get("/api/UpdateServer", (_req, res) => {
	standardExec("~/update.sh", res);
});

app.get("/api/RebootServer", (_req, res) => {
	standardExec("sudo reboot", res);
});

app.get("/api/Restart", () => {
	process.exit(1);
});

app.get("/api/Stop", (_req, res) => {
	standardExec("pm2 stop nodebot", res);
});

app.get("/api/Poweroff", (_req, res) => {
    standardExec("sudo poweroff", res);
});

const port = config.port || 3000;
http.listen(port, () => {
	// tslint:disable-next-line:no-console
	console.log(`listening on *:${port}`);
});

const enableDebug = false;
function debug(message?: any, ...optionalParams: any[]){
	if(enableDebug){
		console.debug(message, ...optionalParams);
	}
}
