import {afterEach, expect, it, vi} from "vitest";
import {annotationId} from "./annotationId";
afterEach(() => vi.unstubAllGlobals());
it("generates UUIDv4 annotation IDs even when randomUUID requires a secure context", () => {
    vi.stubGlobal("crypto", {getRandomValues: (bytes: Uint8Array) => bytes.fill(0)});
    expect(annotationId()).toBe("00000000-0000-4000-8000-000000000000");
});
