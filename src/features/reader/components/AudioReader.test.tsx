import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {Provider} from "@/shared/ui/provider";
import type {BookModel} from "@/entities/book/model/BookModel";
import {AudioReader} from "./AudioReader";

const api = vi.hoisted(() => ({get: vi.fn(), save: vi.fn()}));
vi.mock("../api/savedPositionApi", () => ({getSavedPosition: api.get, savePosition: api.save}));
vi.mock("../hooks/useDeviceName", () => ({useDeviceName: () => "Test device"}));

const book: BookModel = {
    id: "audio", title: "Original audio fixture", author: "Homebranch", fileName: "one.mp3",
    isFavorite: false, uploadedByUserId: "test",
    formats: [{id: "mp3", format: "MP3", fileName: "one.mp3", audioTracks: [
        {fileName: "one.mp3", title: "First track"}, {fileName: "two.mp3", title: "Second track"},
    ]}],
};

beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(null);
    api.save.mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

function setup(format: "MP3" | "M4B" = "MP3") {
    const ui = (theme: "light" | "dark") => <Provider forcedTheme={theme}><MemoryRouter><AudioReader book={book} format={format}/></MemoryRouter></Provider>;
    const result = render(ui("light"));
    const audio = result.container.querySelector("audio")!;
    let paused = true;
    Object.defineProperty(audio, "duration", {configurable: true, value: 120});
    Object.defineProperty(audio, "paused", {configurable: true, get: () => paused});
    const play = vi.spyOn(audio, "play").mockImplementation(async () => {paused = false; fireEvent.play(audio);});
    const pause = vi.spyOn(audio, "pause").mockImplementation(() => {paused = true; fireEvent.pause(audio);});
    fireEvent.loadedMetadata(audio);
    return {...result, audio, play, pause, changeTheme: () => result.rerender(ui("dark"))};
}

describe("audio controls preserve media behavior", () => {
    it("restores, seeks, skips, pauses and retains the audio element through app theme changes", async () => {
        api.get.mockResolvedValue({position: JSON.stringify({type: "audio", track: 0, time: 30})});
        const {audio, play, pause, changeTheme, container} = setup();
        await waitFor(() => expect(api.get).toHaveBeenCalledOnce());
        fireEvent.loadedMetadata(audio);
        expect(audio.currentTime).toBe(30);
        fireEvent.click(screen.getByRole("button", {name: "Play"}));
        expect(play).toHaveBeenCalledOnce();
        fireEvent.click(screen.getByRole("button", {name: "Forward 15 seconds"}));
        expect(audio.currentTime).toBe(45);
        fireEvent.click(screen.getByRole("button", {name: "Rewind 15 seconds"}));
        expect(audio.currentTime).toBe(30);
        fireEvent.change(screen.getByRole("slider", {name: "Playback position"}), {target: {value: "75"}});
        expect(audio.currentTime).toBe(75);
        const source = audio.src;
        changeTheme();
        expect(container.querySelector("audio")).toBe(audio);
        expect(audio.src).toBe(source);
        expect(audio.currentTime).toBe(75);
        expect(play).toHaveBeenCalledOnce();
        expect(api.save).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", {name: "Pause"}));
        expect(pause).toHaveBeenCalledOnce();
        expect(api.save).toHaveBeenCalledWith("audio", expect.objectContaining({
            position: JSON.stringify({type: "audio", track: 0, time: 75}), deviceName: "Test device", percentage: 0.3125,
        }));
    });

    it("preserves track switching, playback continuation, end handling and per-track sources", async () => {
        const {audio, play, container} = setup();
        await waitFor(() => expect(api.get).toHaveBeenCalledOnce());
        audio.currentTime = 20;
        fireEvent.click(screen.getByRole("button", {name: "Play"}));
        fireEvent.click(screen.getByRole("button", {name: "Next track"}));
        expect(audio.src).toContain("format=MP3&track=1&inline=true");
        expect(container.querySelector("audio")).toBe(audio);
        expect(play).toHaveBeenCalledTimes(2);
        expect(api.save).toHaveBeenCalledWith("audio", expect.objectContaining({position: JSON.stringify({type: "audio", track: 0, time: 20})}));
        fireEvent.loadedMetadata(audio);
        fireEvent.click(screen.getByRole("button", {name: "Previous track"}));
        expect(audio.src).toContain("track=0");
        fireEvent.loadedMetadata(audio);
        fireEvent.ended(audio);
        expect(audio.src).toContain("track=1");
        expect(container.querySelector("audio")).toBe(audio);
        expect(screen.getByRole("button", {name: /02 Second track/})).toHaveAttribute("aria-current", "true");
    });

    it("keeps single-file M4B sources and does not expose track controls", () => {
        const {audio} = setup("M4B");
        expect(audio.src).toContain("format=M4B&inline=true");
        expect(audio.src).not.toContain("track=");
        expect(screen.queryByRole("button", {name: "Next track"})).not.toBeInTheDocument();
    });

    it("keeps the ten-second timeupdate save cadence", async () => {
        const {audio} = setup();
        await waitFor(() => expect(api.get).toHaveBeenCalledOnce());
        const now = vi.spyOn(Date, "now").mockReturnValue(10_000);
        audio.currentTime = 5;
        fireEvent.timeUpdate(audio);
        expect(api.save).toHaveBeenCalledOnce();
        now.mockReturnValue(15_000);
        audio.currentTime = 10;
        fireEvent.timeUpdate(audio);
        expect(api.save).toHaveBeenCalledOnce();
        now.mockReturnValue(20_000);
        audio.currentTime = 15;
        fireEvent.timeUpdate(audio);
        expect(api.save).toHaveBeenCalledTimes(2);
        expect(api.save).toHaveBeenLastCalledWith("audio", expect.objectContaining({
            position: JSON.stringify({type: "audio", track: 0, time: 15}),
        }));
    });
});
