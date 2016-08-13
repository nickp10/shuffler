var gulp = require("gulp");
var tsc = require("typescript");
var typescript = require("gulp-typescript");

var tsconfig = () => typescript.createProject("tsconfig.json", { typescript: tsc });

gulp.task("compile", () => {
	return gulp.src(["./src/**/*.ts", "!./src/**/*.d.ts"])
		.pipe(typescript(tsconfig()))
		.pipe(gulp.dest("./build"));
});
