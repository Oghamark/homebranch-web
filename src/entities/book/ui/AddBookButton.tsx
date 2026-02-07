import {type ButtonProps, FileUpload} from "@chakra-ui/react";
import {HiPlus} from "react-icons/hi";
import SubmitButton from "@/components/ui/SubmitButton";
import {toaster} from "@/components/ui/toaster";
import {type CreateBookRequest, useCreateBookMutation} from "@/entities/book";
import {handleRtkError} from "@/shared/api/rtk-query";
import Epub from "epubjs";
import axios from "axios";
import type {FileAcceptDetails} from "@zag-js/file-upload";

export function AddBookButton(buttonProps: ButtonProps) {
    const [createBook, {isLoading}] = useCreateBookMutation();

    const _handleSubmit = async ({files}: FileAcceptDetails) => {
        if (!files || files.length === 0) {
            return;
        }

        const epub = Epub(await files[0].arrayBuffer());
        const metadata = await epub.loaded.metadata;

        const coverImageUrl = await epub.coverUrl();
        let coverImageBlob: Blob | undefined = undefined;
        if (coverImageUrl) {
            coverImageBlob = await axios.get<Blob>(coverImageUrl, {responseType: 'blob'})
                .then(response => response.data);
        }

        const createBookRequest: CreateBookRequest = {
            title: metadata.title,
            author: metadata.creator,
            isFavorite: false,
            publishedYear: new Date(metadata.pubdate).getFullYear().toString(),
            file: files[0],
            coverImage: coverImageBlob,
        }

        try {
            await createBook(createBookRequest).unwrap();
            toaster.create({title: "Book added successfully!", type: "success"});
        } catch (e) {
            handleRtkError(e);
        }
    };

    return (
        <FileUpload.Root accept={".epub"} onFileAccept={_handleSubmit}>
            <FileUpload.HiddenInput accept=".epub"/>
            <FileUpload.Trigger asChild>
                <SubmitButton
                    variant={"outline"}
                    size="sm"
                    width={"100%"}
                    loading={isLoading}
                    {...buttonProps}
                >
                    <HiPlus/> Add Book
                </SubmitButton>
            </FileUpload.Trigger>
        </FileUpload.Root>
    );
}