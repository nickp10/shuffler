var PlayMusic = require("playmusic");
var argv = require("named-argv");

var email = argv.opts.email;
var password = argv.opts.password;
if (!email) {
	console.error("The -email argument must be supplied.");
	process.exit();
}
if (!password) {
	console.error("The -password argument must be supplied.");
	process.exit();
}

const pm = new PlayMusic();
pm.init({email: email, password: password}, (initError) => {
	if (initError) {
		console.error(initError);
		process.exit();
	}
	pm.getPlayLists((playlistsError, data) => {
		if (playlistsError) {
			console.error(playlistsError);
			process.exit();
		}
		console.log(data.data.items);
	});
});
