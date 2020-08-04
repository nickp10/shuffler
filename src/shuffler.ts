import * as Args from "./args";
import { IPlaylistDetail, ITrackDetail } from "youtube-music-ts-api";
import PlayMusicCache, * as pmc from "./playMusicCache";

export default class Shuffler {
    cache: PlayMusicCache;

    constructor() {
        this.cache = new PlayMusicCache(Args.cookie);
    }

    async run(): Promise<void> {
        try {
            const playlists = await this.cache.getPlaylistsByName(Args.input);
            const newPlaylists = await this.cache.populatePlaylistTracks(playlists);
            const tracks = this.shuffleTracks(this.getUniqueTracks(newPlaylists));
            const playlistsNeeded = Args.singlePlaylist ? 1 : Math.ceil(tracks.length / Args.maxTracksPerPlaylist);
            const playlistNames = await this.getOutputPlaylistNames(playlistsNeeded);
            const playlistPartitions = this.partitionTracks(tracks, playlistsNeeded);
            for (let i = 0; i < playlistNames.length; i++) {
                const playlistName = playlistNames[i];
                const playlistPartition = playlistPartitions[i];
                await this.shufflePlaylist(playlistName, playlistPartition);
            }
            console.log("Playlists have been shuffled.");
        } catch(error) {
            console.error(error);
        }
    }

    async getOutputPlaylistNames(playlistsNeeded: number): Promise<string[]> {
        const allPlaylists = await this.cache.getAllPlaylists();
        const needsIdentifier = playlistsNeeded > Args.output.length;
        const playlistNames: string[] = [];
        for (let i = 0; i < playlistsNeeded; i++) {
            const outputName = Args.output[i % Args.output.length];
            const identifier = Math.ceil((i + 1) / Args.output.length);
            const playlistName = needsIdentifier ? `${outputName} (${identifier})` : outputName;
            if (!Args.overwrite) {
                if (allPlaylists.filter((p) => p.name === playlistName).length > 0) {
                    throw new Error("A playlist with the name of '" + playlistName + "' already exists. Specify the --overwrite argument to overwrite the playlist.");
                }
            }
            playlistNames.push(playlistName);
        }
        return playlistNames;
    }

    /**
     * Retrieves an array of all the unique tracks from all the playlists.
     * 
     * @param playlists An array of all the playlists to retrieve all the tracks from.
     * @returns An array containing all the unique/distinct tracks from all the playlists.
     */
    getUniqueTracks(playlists: IPlaylistDetail[]): ITrackDetail[] {
        const flags = {};
        const tracks: ITrackDetail[] = [];
        playlists.forEach((playlist) => {
            playlist.tracks.forEach((track) => {
                if (!flags[track.id]) {
                    flags[track.id] = true;
                    tracks.push(track);
                }
            });
        });
        return tracks;
    }

    /**
     * Shuffles the array of tracks. The tracks will be shuffled in place meaning the array being
     * passed in will be modified.
     * 
     * @param tracks The array of tracks to shuffle.
     * @returns The shuffled array of tracks. Note: this will be the same instance as the array that is passed in.
     */
    shuffleTracks(tracks: ITrackDetail[]): ITrackDetail[] {
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

    partitionTracks(tracks: ITrackDetail[], playlistsNeeded: number): ITrackDetail[][] {
        const partitions: ITrackDetail[][] = [];
        for (let i = 0; i < playlistsNeeded; i++) {
            const startIndex = i * Args.maxTracksPerPlaylist;
            partitions[i] = tracks.slice(startIndex, startIndex + Args.maxTracksPerPlaylist);
        }
        return partitions;
    }

    async shufflePlaylist(playlistName: string, playlistPartition: ITrackDetail[]): Promise<void> {
        const playlist = await this.cache.getOrCreatePlaylist(playlistName);
        await this.cache.addTracksToPlaylist(playlist.id, playlistPartition);
    }
}
