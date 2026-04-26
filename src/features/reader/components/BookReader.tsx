import type {ComponentType} from "react";
import type {BookModel, BookFormatType} from "@/entities/book";
import {supportsBookFormatReading} from "@/entities/book/model/bookFormats";
import {Reader} from "./Reader";
import {PdfReader} from "./PdfReader";

interface BookReaderProps {
    book: BookModel;
    format: BookFormatType;
}

const BOOK_READER_COMPONENTS: Partial<Record<BookFormatType, ComponentType<BookReaderProps>>> = {
    EPUB: Reader,
    PDF: PdfReader,
};

export function BookReader({book, format}: BookReaderProps) {
    if (!supportsBookFormatReading(format)) {
        return null;
    }

    const ReaderComponent = BOOK_READER_COMPONENTS[format];
    if (!ReaderComponent) {
        return null;
    }

    return <ReaderComponent book={book} format={format}/>;
}
