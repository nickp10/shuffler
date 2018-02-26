const argv = require("argv");
const gulp = require("gulp");
const path = require("path");
const sourcemaps = require("gulp-sourcemaps");
const typescript = require("gulp-typescript");

const args = argv.option({name: "env", short: "e", type: "string"}).run();
const isDebug = args.options["env"] === "debug";
const destDirname = isDebug ? "debug" : "build"
const dest = `./${destDirname}`;
const tsconfig = typescript.createProject("tsconfig.json");

gulp.task("compile", () => {
    const src = gulp.src(["./src/**/*.ts", "!./src/**/*.d.ts"], { base: "./src" });
    if (isDebug) {
        return src.pipe(sourcemaps.init())
            .pipe(tsconfig())
            .pipe(sourcemaps.mapSources((sourcePath, file) => {
                const from = path.resolve(path.join(__dirname, destDirname));
                const to = path.dirname(file.path);
                return path.join(path.relative(from, to), sourcePath);
            }))
            .pipe(sourcemaps.write(""))
            .pipe(gulp.dest(dest));
    } else {
        return src.pipe(tsconfig())
            .pipe(gulp.dest(dest));
    }
});

gulp.task("build", ["compile"]);
