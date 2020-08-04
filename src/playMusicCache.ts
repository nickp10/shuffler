import YouTubeMusic from "youtube-music-ts-api";
import { IYouTubeMusicAuthenticated } from "youtube-music-ts-api/interfaces-primary";
import { IPlaylistDetail, IPlaylistSummary, ITrackDetail } from "youtube-music-ts-api/interfaces-supplementary";

export default class PlayMusicCache {
    cachedPlaylists: IPlaylistSummary[];
    cookiesStr: string;
    ytma: IYouTubeMusicAuthenticated;

    constructor(cookiesStr: string) {
        this.cookiesStr = cookiesStr;
    }

    /**
     * Retrieves an array of all the playlists.
     * 
     * @returns A promise that will resolve to an array of all the playlists.
     */
    async getAllPlaylists(): Promise<IPlaylistSummary[]> {
        if (this.cachedPlaylists) {
            return this.cachedPlaylists;
        }
        const ytma = await this.login();
        this.cachedPlaylists = await ytma.getLibraryPlaylists();
        return this.cachedPlaylists;
    }

    /**
     * Retrieves an array of all the playlists that match one of the specified names.
     * 
     * @param playlistNames The names of the playlists to retrieve.
     * @returns A promise that will resolve to an array of the matching playlists by name.
     */
    async getPlaylistsByName(playlistNames: string[]): Promise<IPlaylistSummary[]> {
        const allPlaylists = await this.getAllPlaylists();
        const playlists: IPlaylistSummary[] = [];
        let errorPlaylistName: string;
        for (let i = 0; i < playlistNames.length; i++) {
            const playlistName = playlistNames[i];
            let foundPlaylist: IPlaylistSummary;
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
            throw new Error("Could not find the specified playlist: " + errorPlaylistName);
        } else {
            return playlists;
        }
    }

    /**
     * Populates each of the specified playlists with an array of all the tracks in that playlist.
     * 
     * @param playlists An array of the playlists to populate the tracks for. This will add a tracks
     * property to each playlists which will be an array of the tracks contained within it.
     * @returns A promise that will resolve when the playlists have been populated with their corresponding tracks.
     */
    async populatePlaylistTracks(playlists: IPlaylistSummary[]): Promise<IPlaylistDetail[]> {
        const ytma = await this.login();
        const playlistDetails: IPlaylistDetail[] = [];
        for (let i = 0; i < playlists.length; i++) {
            const playlist = playlists[i];
            const playlistDetail = await ytma.getPlaylist(playlist.id, 10);
            playlistDetails.push(playlistDetail);
        }
        return playlistDetails;
    }

    /**
     * Retrieves or creates the playlist with the specified name. If the playlist already exists, then any existing
     * tracks will be removed from the playlist to guarantee that an empty playlist will be returned.
     * 
     * @param playlistName The name of the playlist to get or create.
     * @param deleteTimeoutMillis The number of milliseconds to wait after removing the tracks from an existing playlist
     * before continuing on. This should allow Google enough time to propagate the track removals.
     * @returns A promise that will resolve to the empty playlist.
     */
    async getOrCreatePlaylist(playlistName: string, deleteTimeoutMillis: number = 30000): Promise<IPlaylistDetail> {
        const ytma = await this.login();
        try {
            const playlists = await this.getPlaylistsByName([playlistName]);
            const playlistDetails = await this.populatePlaylistTracks(playlists);
            if (Array.isArray(playlistDetails) && playlistDetails.length === 1) {
                const playlist = playlistDetails[0];
                if (playlist) {
                    if (playlist.tracks.length > 0) {
                        await ytma.removeTracksFromPlaylist(playlist.id, ...playlist.tracks);
                    }
                    return playlist;
                }
            }
        } catch {
            // Eat any errors in case the playlist doesn't exist
        }
        const newPlaylist = await ytma.createPlaylist(playlistName);
        const newPlaylistDetails = await this.populatePlaylistTracks([newPlaylist]);
        if (Array.isArray(newPlaylistDetails) && newPlaylistDetails.length === 1) {
            return newPlaylistDetails[0];
        }
        return undefined;
    }

    /**
     * Adds the specified array of tracks to the given playlist.
     * 
     * @param playlistId The ID of the playlist to add the tracks to.
     * @param tracks The array of tracks to add to the playlist.
     * @returns A promise that will yield whether or not the operation was successful.
     */
    async addTracksToPlaylist(playlistId: string, tracks: ITrackDetail[]): Promise<boolean> {
        const ytma = await this.login();
        return await ytma.addTracksToPlaylist(playlistId, ...tracks);
    }

    /**
     * Logs into the YouTube Music API. The playlists and associated tracks will
     * be correlated with the user that has logged in.
     * 
     * @returns A promise that will resolve when the user has logged in.
     */
    async login(): Promise<IYouTubeMusicAuthenticated> {
        if (this.ytma) {
            return this.ytma;
        }
        const ytm = new YouTubeMusic();
        const ytma = await ytm.authenticate(this.cookiesStr);
        this.ytma = ytma;
        return this.ytma;
    }
}
