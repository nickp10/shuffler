var gulp = require("gulp");
var typescript = require("gulp-typescript");

const tsconfig = typescript.createProject("tsconfig.json");

gulp.task("compile", () => {
	return gulp.src(["./src/**/*.ts", "!./src/**/*.d.ts"])
		.pipe(tsconfig())
		.pipe(gulp.dest("./build"));
});
