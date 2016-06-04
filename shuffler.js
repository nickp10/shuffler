var argv = require("named-argv");
var PlayMusic = require("playmusic");
var Promise = require("promise");

function flattenArray(arr) {
	const flat = [];
	if (Array.isArray(arr)) {
		for (let i = 0; i < arr.length; i++) {
			const flatSubArray = flattenArray.call(this, arr[i]); 
			flat.push.apply(flat, flatSubArray);
		}
	} else {
		flat.push(arr);
	}
	return flat;
}

function getAllPlaylistTracks(nextPageToken) {
	return new Promise((resolve, reject) => {
		pm.getPlayListEntries({nextPageToken: nextPageToken}, (error, data) => {
			if (error) {
				reject("The tracks associated with each playlist could not be retrieved.");
			} else {
				const nextPageToken = data.nextPageToken;
				const tracks = data.data.items;
				if (nextPageToken) {
					getAllPlaylistTracks(nextPageToken).done((nextPageTracks) => {
						resolve(tracks.concat(nextPageTracks));
					}, (error) => {
						reject(error);
					});
				} else {
					resolve(tracks);
				}
			}
		});
	});
}

function getPlaylistsByName(playlistNames) {
	return new Promise((resolve, reject) => {
		pm.getPlayLists((error, data) => {
			if (error) {
				reject("The playlists for the account could not be retrieved.");
			} else {
				const playlists = [];
				let errorPlaylistName = undefined;
				for (let i = 0; i < playlistNames.length; i++) {
					const playlistName = playlistNames[i];
					let foundPlaylist = undefined;
					for (let j = 0; j < data.data.items.length; j++) {
						const playlistItem = data.data.items[j];
						if (playlistItem.name === playlistName) {
							foundPlaylist = playlistItem;
							break;
						}
					}
					if (foundPlaylist) {
						playlists.push(foundPlaylist);
					} else {
						errorPlaylistName = playlistName;
						break;
					}
				}
				if (errorPlaylistName) {
					reject("Could not find the specified playlist: " + errorPlaylistName);
				} else {
					resolve(playlists);
				}
			}
		});
	});
}

function populatePlaylistTracks(playlists) {
	return new Promise((resolve, reject) => {
		getAllPlaylistTracks().done((tracks) => {
			playlists.forEach((playlist) => {
				playlist.tracks = tracks.filter((track) => playlist.id === track.playlistId);
			});
			resolve(playlists);
		}, (error) => {
			reject(error);
		});
	});
}

const email = argv.opts.email;
const password = argv.opts.password;
const input = argv.opts.input;
if (!email) {
	console.error("The -email argument must be supplied.");
	process.exit();
}
if (!password) {
	console.error("The -password argument must be supplied.");
	process.exit();
}
if (!input) {
	console.error("The -input argument must be supplied indicating the input playlists.");
	process.exit();
}
input = flattenArray(input);
if (input.length === 0) {
	console.error("At least one -input playlist must be supplied.");
	process.exit();
}

const pm = new PlayMusic();
pm.init({email: email, password: password}, (initError) => {
	if (initError) {
		console.error("Authentication failed. Please check the email and password supplied.");
	} else {
		getPlaylistsByName(input).done((playlists) => {
			populatePlaylistTracks(playlists).done(() => {
				
			}, (error) => {
				console.error(error);
			});
		}, (error) => {
			console.error(error);
		});
	}
});
