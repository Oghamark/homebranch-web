export interface QuoteAnchor {
    version: 1;
    exact: string;
    prefix?: string;
    suffix?: string;
}

export interface LocationResource {
    href: string;
    start: number;
    end: number;
    anchor?: QuoteAnchor;
}

export interface LocationChapter extends LocationResource {
    id: string;
    title: string;
    fragment?: string;
    kind: "chapter" | "resource";
}

export interface LocationMap {
    version: 1;
    capabilities?: {passageAnchor: 1};
    formatId: string;
    contentHash: string;
    fingerprint: string;
    resources: LocationResource[];
    chapters: LocationChapter[];
}

export interface PortableLocation {
    version: 1;
    formatId: string;
    contentHash: string;
    mapFingerprint: string;
    href: string;
    resourceProgression: number;
    chapterId?: string;
    chapterProgression?: number;
    basis: "text" | "rendered";
    native?: {engine: "crengine"; domVersion: number};
    passage?: QuoteAnchor;
}
