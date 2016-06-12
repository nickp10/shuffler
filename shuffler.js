var argv = require("named-argv");
var PlayMusic = require("playmusic");
var Promise = require("promise");

const pm = new PlayMusic();
const cache = {};

function flattenArray(arr) {
	const flat = [];
	if (Array.isArray(arr)) {
		for (let i = 0; i < arr.length; i++) {
			const flatSubArray = flattenArray.call(this, arr[i]); 
			flat.push.apply(flat, flatSubArray);
		}
	} else if (arr) {
		flat.push(arr);
	}
	return flat;
}

function getAllPlaylistTracks(nextPageToken) {
	return new Promise((resolve, reject) => {
		if (cache.playlistTracks) {
			resolve(cache.playlistTracks);
		} else {
			pm.getPlayListEntries({nextPageToken: nextPageToken}, (error, data) => {
				if (error) {
					reject("The tracks associated with each playlist could not be retrieved.");
				} else {
					const nextPageToken = data.nextPageToken;
					const tracks = data.data.items;
					if (nextPageToken) {
						getAllPlaylistTracks(nextPageToken).done((nextPageTracks) => {
							cache.playlistTracks = tracks.concat(nextPageTracks);
							resolve(cache.playlistTracks);
						}, (error) => {
							reject(error);
						});
					} else {
						cache.playlistTracks = tracks;
						resolve(tracks);
					}
				}
			});
		}
	});
}

function getAllPlaylists() {
	return new Promise((resolve, reject) => {
		if (cache.playlists) {
			resolve(cache.playlists);
		} else {
			pm.getPlayLists((error, data) => {
				if (error) {
					reject("The playlists for the account could not be retrieved.");
				} else {
					cache.playlists = data.data.items;
					resolve(cache.playlists);
				}
			});
		}
	});
}

function getPlaylistsByName(playlistNames) {
	return new Promise((resolve, reject) => {
		getAllPlaylists().then((allPlaylists) => {
			const playlists = [];
			let errorPlaylistName = undefined;
			for (let i = 0; i < playlistNames.length; i++) {
				const playlistName = playlistNames[i];
				let foundPlaylist = undefined;
				for (let j = 0; j < allPlaylists.length; j++) {
					const playlistItem = allPlaylists[j];
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
		}, (error) => {
			reject(error);
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

function getOrCreatePlaylist(playlistName) {
	return new Promise((resolve, reject) => {
		getPlaylistsByName([playlistName]).done((playlists) => {
			populatePlaylistTracks(playlists).done(() => {
				const tracksToRemove = flattenArray(playlists.map(playlist => playlist.tracks));
				const ids = tracksToRemove.map(track => track.id);
				if (ids.length === 0) {
					resolve(playlists[0]);
				} else {
					pm.removePlayListEntry(ids, (error, data) => {
						if (error) {
							reject("The playlist could not be cleared of existing tracks: " + playlistName);
						} else {
							// Give Google enough time to propagate the deleted tracks
							setTimeout(() => {
								resolve(playlists[0]);
							}, 10000);
						}
					});
				}
			}, (error) => {
				reject(error);
			});
		}, (error) => {
			pm.addPlayList(playlistName, (error, data) => {
				if (error) {
					reject("The playlist could not be created: " + playlistName);
				} else {
					cache.playlists = undefined;
					getOrCreatePlaylist(playlistName).done((playlist) => {
						resolve(playlist);
					}, (error) => {
						reject(error);
					});
				}
			});
		});
	});
}

function addTracksToPlaylist(playlist, tracks) {
	return new Promise((resolve, reject) => {
		const trackIds = tracks.map((track) => track.trackId);
		pm.addTrackToPlayList(trackIds, playlist.id, (error, data) => {
			if (error) {
				reject(error);
			} else {
				resolve(data);
			}
		});
	});
}

function getOutputPlaylistNames(playlistsNeeded) {
	return new Promise((resolve, reject) => {
		getAllPlaylists().done((allPlaylists) => {
			const needsIdentifier = playlistsNeeded > output.length;
			const playlistNames = [];
			for (let i = 0; i < playlistsNeeded; i++) {
				const outputName = output[i % output.length];
				const identifier = Math.ceil((i + 1) / output.length);
				const playlistName = needsIdentifier ? outputName + " (" + identifier + ")" : outputName;
				if (!overwrite) {
					if (allPlaylists.filter((p) => p.name === playlistName).length > 0) {
						reject("A playlist with the name of '" + playlistName + "' already exists. Specify the -overwrite argument to overwrite the playlist.");
						return;
					}
				}
				playlistNames.push(playlistName);
			}
			resolve(playlistNames);
		}, (error) => {
			reject(error);
		});
	});
}

function getUniqueTracks(playlists) {
	const flags = {};
	const tracks = [];
	playlists.forEach((playlist) => {
		playlist.tracks.forEach((track) => {
			if (!flags[track.trackId]) {
				flags[track.trackId] = true;
				tracks.push(track);
			}
		});
	});
	return tracks;
}

function shuffleTracks(tracks) {
	let currentIndex = tracks.length;
	while (currentIndex !== 0) {
		const randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;
		const temporaryValue = tracks[currentIndex];
		tracks[currentIndex] = tracks[randomIndex];
		tracks[randomIndex] = temporaryValue;
	}
	return tracks;
}

function partitionTracks(tracks, playlistsNeeded) {
	const partitions = [];
	for (let i = 0; i < playlistsNeeded; i++) {
		const startIndex = i * maxTracksPerPlaylist;
		partitions[i] = tracks.slice(startIndex, startIndex + maxTracksPerPlaylist);
	}
	return partitions;
}

function shufflePlaylist(playlistName, playlistPartition) {
	return new Promise((resolve, reject) => {
		getOrCreatePlaylist(playlistName).done((playlist) => {
			addTracksToPlaylist(playlist, playlistPartition).done(() => {
				resolve();
			}, (error) => {
				reject(error);
			});
		}, (error) => {
			reject(error);
		});
	});
}

const maxTracksPerPlaylist = 1000;
const email = argv.opts.email;
const password = argv.opts.password;
const overwrite = argv.opts.overwrite === true;
let input = argv.opts.input;
let output = argv.opts.output;
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
output = flattenArray(output);
if (output.length === 0) {
	output = input.map((i) => i + " (shuffler)");
}

pm.init({email: email, password: password}, (initError) => {
	if (initError) {
		console.error("Authentication failed. Please check the email and password supplied.");
		process.exit();
	} else {
		getPlaylistsByName(input).done((playlists) => {
			populatePlaylistTracks(playlists).done(() => {
				const tracks = shuffleTracks(getUniqueTracks(playlists));
				const playlistsNeeded = Math.ceil(tracks.length / maxTracksPerPlaylist);
				getOutputPlaylistNames(playlistsNeeded).done((playlistNames) => {
					const playlistPartitions = partitionTracks(tracks, playlistsNeeded);
					let partitionIndex = 0;
					const allPromises = playlistNames.map((playlistName) => {
						const playlistPartition = playlistPartitions[partitionIndex++];
						return shufflePlaylist(playlistName, playlistPartition);
					});
					Promise.all(allPromises).done(() => {
						console.log("Playlists have been shuffled.");
						process.exit();
					}, (error) => {
						console.error(error);
						process.exit();
					});
				}, (error) => {
					console.error(error);
					process.exit();
				});
			}, (error) => {
				console.error(error);
				process.exit();
			});
		}, (error) => {
			console.error(error);
			process.exit();
		});
	}
});
