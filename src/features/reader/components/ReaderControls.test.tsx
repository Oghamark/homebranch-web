import {useEffect, type ReactNode} from "react";
import {configureStore} from "@reduxjs/toolkit";
import {Provider as ReduxProvider} from "react-redux";
import {MemoryRouter} from "react-router";
import {act, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {Locator, LocatorLocations} from "@readium/shared";
import type {EpubNavigatorListeners} from "@readium/navigator";
import {Provider} from "@/shared/ui/provider";
import type {BookModel} from "@/entities/book/model/BookModel";
import readerTheme, {setScroll} from "../store/readerThemeSlice";
import {BookReader} from "./BookReader";
import {getReaderControlColors} from "./ReaderUI";
import {getThemeColors} from "../types/ReaderTheme";

vi.hoisted(() => {
    for (const name of ["localStorage", "sessionStorage"]) {
        const values = new Map<string, string>();
        Object.defineProperty(globalThis, name, {configurable: true, value: {
            getItem: (key: string) => values.get(key) ?? null,
            setItem: (key: string, value: string) => values.set(key, value),
            removeItem: (key: string) => values.delete(key),
            clear: () => values.clear(),
        }});
    }
});

const engine = vi.hoisted(() => ({
    created: vi.fn(), destroyed: vi.fn(), preferences: vi.fn(), forward: vi.fn(), backward: vi.fn(), go: vi.fn(), goLink: vi.fn(),
    pdfMounted: vi.fn(), saved: vi.fn(), getSaved: vi.fn(),
    listeners: null as EpubNavigatorListeners | null,
    currentLocator: null as Locator | null,
}));

vi.mock("@readium/navigator", () => ({
    TextAlignment: {start: "start", left: "left", right: "right", justify: "justify"},
    EpubPreferences: class {constructor(public values: unknown) {}},
    EpubNavigator: class {
        constructor(_container: unknown, _publication: unknown, listeners: EpubNavigatorListeners, _positions: unknown, locator: Locator) {
            engine.created();
            engine.listeners = listeners;
            engine.currentLocator = locator;
        }
        get currentLocator() {return engine.currentLocator;}
        load = async () => {};
        destroy = engine.destroyed;
        submitPreferences = engine.preferences;
        goForward = engine.forward;
        goBackward = engine.backward;
        go = engine.go;
        goLink = engine.goLink;
    },
}));
vi.mock("@/shared/api/axios", () => ({
    axiosInstance: {get: async () => ({data: {
        metadata: {title: "Original reader fixture", language: "en"},
        links: [{rel: "self", href: "http://localhost/books/fixture/manifest", type: "application/webpub+json"}],
        readingOrder: [{href: "http://localhost/chapter.xhtml", type: "application/xhtml+xml", title: "First chapter"}],
        toc: [{href: "http://localhost/chapter.xhtml", title: "First chapter"}],
    }})},
}));
vi.mock("../api/savedPositionApi", () => ({getSavedPosition: engine.getSaved, savePosition: engine.saved}));
vi.mock("../hooks/useDeviceName", () => ({useDeviceName: () => "Test device"}));
vi.mock("react-pdf", () => ({
    pdfjs: {GlobalWorkerOptions: {}},
    Document: ({children, onLoadSuccess}: {children: ReactNode; onLoadSuccess?: (pdf: unknown) => void}) => {
        useEffect(() => {
            engine.pdfMounted();
            onLoadSuccess?.({numPages: 8, getOutline: async () => [{title: "Opening", dest: [0]}]});
        }, []);
        return <div data-testid="pdf-document">{children}</div>;
    },
    Page: ({pageNumber}: {pageNumber: number}) => <div data-testid="pdf-page">PDF page {pageNumber}</div>,
}));

const book: BookModel = {
    id: "fixture", title: "Original reader fixture", author: "Homebranch", fileName: "fixture.epub",
    isFavorite: false, uploadedByUserId: "test",
};

function renderReader(format: "EPUB" | "PDF") {
    const store = configureStore({reducer: {readerTheme}});
    return {store, ...render(<ReduxProvider store={store}><Provider forcedTheme="dark">
        <MemoryRouter><BookReader book={book} format={format}/></MemoryRouter>
    </Provider></ReduxProvider>)};
}

async function openSettings() {
    const trigger = screen.getByRole("button", {name: "Reader Settings"});
    trigger.focus();
    fireEvent.click(trigger);
    return screen.findByRole("dialog", {name: "Reading settings"});
}

async function closeSettings() {
    fireEvent.click(screen.getByRole("button", {name: "Close reading settings"}));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem("user_id", "test");
    engine.getSaved.mockResolvedValue(null);
    engine.saved.mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("reader control preservation", () => {
    it("consumes EPUB selection taps and never turns pages while editing an annotation", async () => {
        const view = renderReader("EPUB");
        await waitFor(() => expect(engine.created).toHaveBeenCalledOnce());
        const iframe = document.createElement("iframe");
        iframe.src = "http://localhost/books/fixture/chapter.xhtml";
        document.body.appendChild(iframe);
        const wnd = iframe.contentWindow!;
        wnd.document.open(); wnd.document.write("<html><head></head><body><p>Selected quote</p></body></html>"); wnd.document.close();
        act(() => engine.listeners!.frameLoaded(wnd));
        const range = wnd.document.createRange();
        range.selectNodeContents(wnd.document.querySelector("p")!);
        wnd.getSelection()!.addRange(range);
        act(() => wnd.document.dispatchEvent(new Event("selectionchange")));
        expect(engine.listeners!.tap({x: 1, y: 1} as Parameters<EpubNavigatorListeners["tap"]>[0])).toBe(true);
        expect(engine.listeners!.click({x: 1, y: 1} as Parameters<EpubNavigatorListeners["click"]>[0])).toBe(true);
        act(() => engine.listeners!.peripheral({key: "ArrowRight"} as Parameters<EpubNavigatorListeners["peripheral"]>[0]));
        expect(engine.forward).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", {name: /Private annotations/}));
        const note = await screen.findByRole("textbox", {name: "New annotation note"});
        fireEvent.keyDown(note, {key: "ArrowRight"});
        expect(engine.forward).not.toHaveBeenCalled();
        view.unmount();
        iframe.remove();
    });

    it("keeps the EPUB navigator, locator and save cadence through settings, themes and contents", async () => {
        renderReader("EPUB");
        await waitFor(() => expect(engine.created).toHaveBeenCalledOnce());
        await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
        const locator = new Locator({href: "http://localhost/chapter.xhtml", type: "application/xhtml+xml",
            locations: new LocatorLocations({position: 1, progression: 0.4, totalProgression: 0.4})});
        act(() => {
            engine.currentLocator = locator;
            engine.listeners!.positionChanged(locator);
        });
        const settings = await openSettings();
        await waitFor(() => expect(settings.contains(document.activeElement)).toBe(true));
        fireEvent.keyDown(document.activeElement!, {key: "ArrowRight"});
        expect(engine.forward).not.toHaveBeenCalled();
        fireEvent.click(within(settings).getByRole("button", {name: "Sepia"}));
        expect(engine.preferences).toHaveBeenCalled();
        await closeSettings();
        await waitFor(() => expect(screen.getByRole("button", {name: "Reader Settings"})).toHaveFocus());
        fireEvent.click(screen.getByRole("button", {name: "Table of contents"}));
        const contents = await screen.findByRole("dialog", {name: "Table of Contents"});
        fireEvent.keyDown(within(contents).getByRole("button", {name: "First chapter"}), {key: "ArrowLeft"});
        expect(engine.backward).not.toHaveBeenCalled();
        fireEvent.click(within(contents).getByRole("button", {name: "Close table of contents"}));
        await waitFor(() => expect(engine.saved).toHaveBeenCalledOnce(), {timeout: 2000});
        expect(engine.currentLocator).toBe(locator);
        expect(engine.created).toHaveBeenCalledOnce();
        expect(engine.destroyed).not.toHaveBeenCalled();
        expect(engine.go).not.toHaveBeenCalled();
        expect(engine.goLink).not.toHaveBeenCalled();
    });

    it("preserves EPUB TOC and jump-back navigation arguments", async () => {
        renderReader("EPUB");
        await waitFor(() => expect(engine.created).toHaveBeenCalledOnce());
        fireEvent.click(screen.getByRole("button", {name: "Table of contents"}));
        const contents = await screen.findByRole("dialog", {name: "Table of Contents"});
        fireEvent.click(within(contents).getByRole("button", {name: "First chapter"}));
        expect(engine.goLink).toHaveBeenCalledWith(expect.objectContaining({href: "http://localhost/chapter.xhtml"}), false, expect.any(Function));
        fireEvent.click(await screen.findByRole("button", {name: "Jump back to Previous position"}));
        expect(engine.go).toHaveBeenCalledWith(engine.currentLocator, false, expect.any(Function));
    });

    it("keeps the PDF document, page and zoom while overlays open and close", async () => {
        renderReader("PDF");
        await screen.findByRole("progressbar", {name: "Reading progress"});
        fireEvent.click(screen.getAllByRole("button", {name: "Next page"})[0]);
        fireEvent.click(screen.getByRole("button", {name: "Zoom in"}));
        expect(screen.getByTestId("pdf-page")).toHaveTextContent("PDF page 2");
        expect(screen.getByText("110%")).toBeVisible();
        const settings = await openSettings();
        fireEvent.keyDown(settings, {key: "ArrowRight"});
        expect(screen.getByTestId("pdf-page")).toHaveTextContent("PDF page 2");
        await closeSettings();
        fireEvent.click(screen.getByRole("button", {name: "Table of contents"}));
        const outline = await screen.findByRole("dialog", {name: "PDF Outline"});
        expect(within(outline).getByRole("button", {name: "Opening (1)"})).toBeVisible();
        fireEvent.keyDown(outline, {key: "Escape"});
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(screen.getByTestId("pdf-page")).toHaveTextContent("PDF page 2");
        expect(screen.getByText("110%")).toBeVisible();
        expect(engine.pdfMounted).toHaveBeenCalledOnce();
        await waitFor(() => expect(engine.saved).toHaveBeenCalledOnce(), {timeout: 2000});
    });

    it("leaves the publication colors unchanged in all three reader themes", () => {
        for (const mode of ["light", "dark", "sepia"] as const) {
            const control = getReaderControlColors(mode);
            const original = getThemeColors(mode);
            expect(control.bg).toBe(original.bg);
            expect(control.contentBg).toBe(original.contentBg);
            expect(control.contentText).toBe(original.contentText);
        }
    });

    it("retains the existing advanced typography and layout values and named switches", async () => {
        const {store} = renderReader("EPUB");
        await waitFor(() => expect(engine.created).toHaveBeenCalledOnce());
        const settings = await openSettings();
        fireEvent.click(within(settings).getByRole("button", {name: "Increase Font Size"}));
        fireEvent.click(within(settings).getByText("Advanced typography and layout"));
        for (const label of ["Line Height", "Letter Spacing", "Word Spacing", "Paragraph Spacing", "Padding"]) {
            fireEvent.click(within(settings).getByRole("button", {name: `Increase ${label}`}));
        }
        fireEvent.click(within(settings).getByRole("button", {name: "Serif"}));
        fireEvent.click(within(settings).getByRole("button", {name: "Justify"}));
        fireEvent.click(within(settings).getByRole("button", {name: "2"}));
        fireEvent.click(within(settings).getByRole("checkbox", {name: "Hyphens"}).closest("label")!);
        await waitFor(() => expect(store.getState().readerTheme.hyphens).toBe(true));
        fireEvent.click(within(settings).getByRole("checkbox", {name: "Scroll mode"}).closest("label")!);
        await waitFor(() => expect(store.getState().readerTheme).toMatchObject({
            fontFamily: "serif", fontSize: 110, lineHeight: 1.6, letterSpacing: 0.125, wordSpacing: 0.125,
            paragraphSpacing: 0.25, pageGutter: 24, textAlign: "justify", columnCount: 2, hyphens: true, scroll: true,
        }));
        expect(engine.created).toHaveBeenCalledOnce();
        expect(engine.saved).not.toHaveBeenCalled();
    });

    it("preserves the mobile restriction against saved scroll mode", async () => {
        const matchMedia = window.matchMedia;
        vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
            ...matchMedia(query), matches: query === "(max-width: 768px)",
        }));
        const {store} = renderReader("EPUB");
        act(() => {store.dispatch(setScroll(true));});
        await waitFor(() => expect(store.getState().readerTheme.scroll).toBe(false));
        const settings = await openSettings();
        fireEvent.click(within(settings).getByText("Advanced typography and layout"));
        expect(within(settings).queryByRole("checkbox", {name: "Scroll mode"})).not.toBeInTheDocument();
        expect(within(settings).getByRole("button", {name: "2"})).toBeVisible();
    });
});
