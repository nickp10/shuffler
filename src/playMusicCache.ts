import * as PlayMusic from "playmusic";
import * as Utils from "./utils";

interface IPlayMusicCache {
	libraryTracks?: pm.LibraryItem[];
	playlists?: pm.PlaylistListItem[];
	playlistTracks?: pm.PlaylistItem[];
}

export interface IPlaylistTrackContainer {
	playlist: pm.PlaylistListItem;
	tracks: pm.PlaylistItem[];
}

export default class PlayMusicCache {
	cache: IPlayMusicCache = {};
	pm: pm.PlayMusicObject = new PlayMusic();

	/**
	 * Retrieves an array of all the tracks from the library.
	 * 
	 * @param nextPageToken This parameter should NOT be specified. It is used internally to handle
	 * multiple pages of library tracks.
	 * @returns A promise that will resolve to an array of all the tracks from the library.
	 */
	getAllLibraryTracks(nextPageToken?: string): Promise<pm.LibraryItem[]> {
		return new Promise<pm.LibraryItem[]>((resolve, reject) => {
			if (this.cache.libraryTracks) {
				resolve(this.cache.libraryTracks);
			} else {
				this.pm.getLibrary({nextPageToken: nextPageToken}, (error, data) => {
					if (error) {
						reject("The tracks associated with the library could not be retrieved.");
					} else {
						const nextPageToken = data.nextPageToken;
						const tracks = data.data.items;
						if (nextPageToken) {
							this.getAllLibraryTracks(nextPageToken).then((nextPageTracks) => {
								this.cache.libraryTracks = tracks.concat(nextPageTracks);
								resolve(this.cache.libraryTracks);
							}, (error) => {
								reject(error);
							});
						} else {
							this.cache.libraryTracks = tracks;
							resolve(tracks);
						}
					}
				});
			}
		});
	}

	/**
	 * Retrieves an array of all the tracks from all playlists.
	 * 
	 * @param nextPageToken This parameter should NOT be specified. It is used internally to handle
	 * multiple pages of playlist tracks.
	 * @returns A promise that will resolve to an array of all the tracks from all playlists.
	 */
	getAllPlaylistTracks(nextPageToken?: string): Promise<pm.PlaylistItem[]> {
		return new Promise<pm.PlaylistItem[]>((resolve, reject) => {
			if (this.cache.playlistTracks) {
				resolve(this.cache.playlistTracks);
			} else {
				this.pm.getPlayListEntries({nextPageToken: nextPageToken}, (error, data) => {
					if (error) {
						reject("The tracks associated with each playlist could not be retrieved.");
					} else {
						const nextPageToken = data.nextPageToken;
						const tracks = data.data.items;
						if (nextPageToken) {
							this.getAllPlaylistTracks(nextPageToken).then((nextPageTracks) => {
								this.cache.playlistTracks = tracks.concat(nextPageTracks);
								resolve(this.cache.playlistTracks);
							}, (error) => {
								reject(error);
							});
						} else {
							this.cache.playlistTracks = tracks;
							resolve(tracks);
						}
					}
				});
			}
		});
	}

	/**
	 * Retrieves an array of all the playlists.
	 * 
	 * @returns A promise that will resolve to an array of all the playlists.
	 */
	getAllPlaylists(): Promise<pm.PlaylistListItem[]> {
		return new Promise<pm.PlaylistListItem[]>((resolve, reject) => {
			if (this.cache.playlists) {
				resolve(this.cache.playlists);
			} else {
				this.pm.getPlayLists((error, data) => {
					if (error) {
						reject("The playlists for the account could not be retrieved.");
					} else {
						this.cache.playlists = data.data.items;
						resolve(this.cache.playlists);
					}
				});
			}
		});
	}

	/**
	 * Retrieves an array of all the playlists that match one of the specified names.
	 * 
	 * @param playlistNames The names of the playlists to retrieve.
	 * @returns A promise that will resolve to an array of the matching playlists by name.
	 */
	getPlaylistsByName(playlistNames: string[]): Promise<pm.PlaylistListItem[]> {
		return new Promise<pm.PlaylistListItem[]>((resolve, reject) => {
			this.getAllPlaylists().then((allPlaylists) => {
				const playlists: pm.PlaylistListItem[] = [];
				let errorPlaylistName: string;
				for (let i = 0; i < playlistNames.length; i++) {
					const playlistName = playlistNames[i];
					let foundPlaylist: pm.PlaylistListItem;
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

	/**
	 * Populates each of the specified playlists with an array of all the tracks in that playlist.
	 * 
	 * @param playlists An array of the playlists to populate the tracks for. This will add a tracks
	 * property to each playlists which will be an array of the tracks contained within it.
	 * @returns A promise that will resolve when the playlists have been populated with their corresponding tracks.
	 */
	populatePlaylistTracks(playlists: pm.PlaylistListItem[]): Promise<IPlaylistTrackContainer[]> {
		return new Promise<IPlaylistTrackContainer[]>((resolve, reject) => {
			this.getAllLibraryTracks().then((libraryTracks) => {
				this.getAllPlaylistTracks().then((playlistTracks) => {
					resolve(playlists.map<IPlaylistTrackContainer>((playlist) => {
						const tracksForPlaylist = playlistTracks.filter((playlistTrack) => playlist.id === playlistTrack.playlistId);
						tracksForPlaylist.forEach((track) => {
							if (!track.track) {
								const libraryTrack = libraryTracks.filter((libraryTrack) => track.trackId === libraryTrack.id);
								if (libraryTrack.length > 0) {
									track.track = this.cloneLibrayItemToPlaylistItem(libraryTrack[0]);
								}
							}
						});
						return {
							playlist: playlist,
							tracks: tracksForPlaylist
						};
					}));
				}, (error) => {
					reject(error);
				});
			}, (error) => {
				reject(error);
			});
		});
	}

	/**
	 * Clones the information returned from the library item and makes a compatible playlist item.
	 * 
	 * @param source The library item to clone into a playlist item.
	 * @returns The playlist item that was cloned from the library item.
	 */
	cloneLibrayItemToPlaylistItem(source: pm.LibraryItem): pm.PlaylistTrack {
		return {
			album: source.album,
			albumArtist: source.albumArtist,
			albumArtRef: source.albumArtRef,
			artist: source.artist,
			artistArtRef: source.artistArtRef,
			artistId: source.artistId,
			composer: source.composer,
			discNumber: source.discNumber,
			durationMillis: source.durationMillis,
			estimatedSize: source.estimatedSize,
			genre: source.genre,
			kind: source.kind,
			nid: source.nid,
			playCount: source.playCount,
			storeId: source.storeId,
			title: source.title,
			trackNumber: source.trackNumber,
			year: source.year
		};
	}

	/**
	 * Retrieves or create the playlist with the specified name. If the playlist already exists, then any existing
	 * tracks will be removed from the playlist to guarantee that an empty playlist will be returned.
	 * 
	 * @param playlistName The name of the playlist to get or create.
	 * @param deleteTimeoutMillis The number of milliseconds to wait after removing the tracks from an existing playlist
	 * before continuing on. This should allow Google enough time to propagate the track removals.
	 * @returns A promise that will resolve to the empty playlist.
	 */
	getOrCreatePlaylist(playlistName: string, deleteTimeoutMillis: number = 30000): Promise<pm.PlaylistListItem> {
		return new Promise<pm.PlaylistListItem>((resolve, reject) => {
			this.getPlaylistsByName([playlistName]).then((playlists) => {
				this.populatePlaylistTracks(playlists).then((newPlaylists) => {
					const tracksToRemove = Utils.flattenArray<pm.PlaylistItem>(newPlaylists.map(playlist => playlist.tracks));
					const ids = tracksToRemove.map(track => track.id);
					if (ids.length === 0) {
						resolve(playlists[0]);
					} else {
						this.pm.removePlayListEntry(ids, (error, data) => {
							if (error) {
								reject("The playlist could not be cleared of existing tracks: " + playlistName);
							} else {
								setTimeout(() => {
									resolve(playlists[0]);
								}, deleteTimeoutMillis);
							}
						});
					}
				}, (error) => {
					reject(error);
				});
			}, (error) => {
				this.pm.addPlayList(playlistName, (error, data) => {
					if (error) {
						reject("The playlist could not be created: " + playlistName);
					} else {
						this.cache.playlists = undefined;
						this.getOrCreatePlaylist(playlistName).then((playlist) => {
							resolve(playlist);
						}, (error) => {
							reject(error);
						});
					}
				});
			});
		});
	}

	/**
	 * Adds the specified array of tracks to the given playlist.
	 * 
	 * @param playlist The playlist to add the tracks to.
	 * @param tracks The array of tracks to add to the playlist.
	 * @returns A promise that will resolve when the tracks have been added to the playlist.
	 */
	addTracksToPlaylist(playlist: pm.PlaylistListItem, tracks: pm.PlaylistItem[]): Promise<pm.MutateResponses> {
		return new Promise<pm.MutateResponses>((resolve, reject) => {
			const trackIds = tracks.map((track) => track.trackId);
			this.pm.addTrackToPlayList(trackIds, playlist.id, (error, data) => {
				if (error) {
					reject(error);
				} else {
					resolve(data);
				}
			});
		});
	}

	/**
	 * Logs into the play music API with the specified email and password. The playlists and associated tracks will
	 * be correlated with the user that has logged in via this function call.
	 * 
	 * @param email The email address of the user to login with.
	 * @param password The password of the user to login with.
	 * @returns A promise that will resolve when the user has logged in.
	 */
	login(email: string, password: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.pm.init({ email: email, password: password }, (error) => {
				if (error) {
					reject("Authentication failed. Please check the email and password supplied.");
				} else {
					resolve(undefined);
				}
			});
		});
	}

	/**
	 * Logs into the play music API with the specified android ID and token. The playlists and associated tracks will
	 * be correlated with the user that has logged in via this function call.
	 * 
	 * @param androidId The Android device ID to login with.
	 * @param token A pre-authorized token for the device ID to login with.
	 * @returns A promise that will resolve when the user has logged in.
	 */
	loginWithToken(androidId: string, token: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.pm.init({ androidId: androidId, masterToken: token }, (error) => {
				if (error) {
					reject("Authentication failed. Please check the android ID and master token supplied.");
				} else {
					resolve(undefined);
				}
			});
		});
	}
}
