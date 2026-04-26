export type BookFormatType = "EPUB" | "PDF";

export type BookFormatModel = {
    id: string;
    format: BookFormatType;
    fileName: string;
    title?: string;
    author?: string;
    genres?: string[];
    publishedYear?: number;
    coverImageFileName?: string;
    summary?: string;
    series?: string;
    seriesPosition?: number;
    isbn?: string;
    pageCount?: number;
    publisher?: string;
    language?: string;
};

export type BookFormatDefinition = {
    format: BookFormatType;
    extension: string;
    label: string;
    preferenceOrder: number;
    supportsReading: boolean;
};

const BOOK_FORMAT_DEFINITIONS: BookFormatDefinition[] = [
    {
        format: "EPUB",
        extension: ".epub",
        label: "EPUB",
        preferenceOrder: 0,
        supportsReading: true,
    },
    {
        format: "PDF",
        extension: ".pdf",
        label: "PDF",
        preferenceOrder: 1,
        supportsReading: true,
    },
];

const BOOK_FORMAT_BY_TYPE = new Map<BookFormatType, BookFormatDefinition>(
    BOOK_FORMAT_DEFINITIONS.map((definition) => [definition.format, definition]),
);

const BOOK_FORMAT_BY_EXTENSION = new Map<string, BookFormatType>(
    BOOK_FORMAT_DEFINITIONS.map((definition) => [definition.extension, definition.format]),
);

export function getBookFormatDefinition(format: BookFormatType): BookFormatDefinition {
    const definition = BOOK_FORMAT_BY_TYPE.get(format);
    if (!definition) {
        throw new Error(`Unsupported book format: ${format}`);
    }
    return definition;
}

export function detectBookFormatFromFileName(fileName: string): BookFormatType | undefined {
    const extensionStart = fileName.lastIndexOf(".");
    if (extensionStart < 0) return undefined;
    return BOOK_FORMAT_BY_EXTENSION.get(fileName.slice(extensionStart).toLowerCase());
}

export function getBookFormatExtension(format: BookFormatType): string {
    return getBookFormatDefinition(format).extension;
}

export function getBookFormatLabel(format: BookFormatType): string {
    return getBookFormatDefinition(format).label;
}

export function supportsBookFormatReading(format: BookFormatType): boolean {
    return getBookFormatDefinition(format).supportsReading;
}

export function getPreferredBookFormat(formats: BookFormatModel[]): BookFormatModel | undefined {
    return [...formats].sort(
        (left, right) =>
            getBookFormatDefinition(left.format).preferenceOrder - getBookFormatDefinition(right.format).preferenceOrder,
    )[0];
}

export function getAvailableBookFormats(book: { fileName: string; formats?: BookFormatModel[] }): BookFormatModel[] {
    if (book.formats && book.formats.length > 0) {
        return book.formats;
    }

    const detected = detectBookFormatFromFileName(book.fileName);
    if (!detected) return [];

    return [{id: `${detected.toLowerCase()}-legacy`, format: detected, fileName: book.fileName}];
}
