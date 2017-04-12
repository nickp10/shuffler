/// <reference path="../typings/index.d.ts" />

import * as argv from "argv";
import * as Utils from "./utils";

class Args {
	maxTracksPerPlaylist: number;
	androidId: string;
	token: string;
	overwrite: boolean;
	input: string[];
	output: string[];

	constructor() {
		const args = argv
			.option({ name: "androidId", short: "a", type: "string" })
			.option({ name: "token", short: "t", type: "string" })
			.option({ name: "input", short: "i", type: "list,string" })
			.option({ name: "output", short: "o", type: "list,string" })
			.option({ name: "overwrite", type: "boolean" })
			.option({ name: "maxTracksPerPlaylist", type: "number" })
			.run();
		this.androidId = args.options["androidId"];
		this.token = args.options["token"];
		this.input = args.options["input"];
		this.output = args.options["output"];
		this.overwrite = args.options["overwrite"] === true;
		this.maxTracksPerPlaylist = args.options["maxTracksPerPlaylist"];
		this.validate();
	}

	validate(): void {
		if (!this.androidId) {
			console.error("The -a or --androidId argument must be supplied.");
			process.exit();
		}
		if (!this.token) {
			console.error("The -t or --token argument must be supplied.");
			process.exit();
		}
		if (!this.input) {
			console.error("The -i or --input argument must be supplied indicating the input playlists.");
			process.exit();
		}
		if (this.input.length === 0) {
			console.error("At least one -i or --input playlist must be supplied.");
			process.exit();
		}
		if (!this.output || this.output.length === 0) {
			this.output = this.input.map((i) => i + " (shuffler)");
		}
		if (typeof this.maxTracksPerPlaylist !== "number" || this.maxTracksPerPlaylist <= 0) {
			this.maxTracksPerPlaylist = 1000;
		}
	}
}

const args: Args = new Args();
export = args;
