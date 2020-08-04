import * as argv from "argv";

class Args {
    maxTracksPerPlaylist: number;
    cookie: string;
    overwrite: boolean;
    singlePlaylist: boolean;
    input: string[];
    output: string[];

    constructor() {
        const args = argv
            .option({ name: "cookie", short: "c", type: "string" })
            .option({ name: "input", short: "i", type: "list,string" })
            .option({ name: "output", short: "o", type: "list,string" })
            .option({ name: "overwrite", type: "boolean" })
            .option({ name: "maxTracksPerPlaylist", short: "m", type: "number" })
            .option({ name: "singlePlaylist", type: "boolean" })
            .run();
        this.cookie = args.options["cookie"];
        this.input = args.options["input"];
        this.output = args.options["output"];
        this.overwrite = args.options["overwrite"] === true;
        this.maxTracksPerPlaylist = parseInt(args.options["maxTracksPerPlaylist"]) || 0;
        this.singlePlaylist = args.options["singlePlaylist"] === true;
        this.validate();
    }

    validate(): void {
        if (!this.cookie) {
            console.error("The -c or --cookie argument must be supplied.");
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
