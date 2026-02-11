import type {Route} from "./+types/book";

import BookDetailsPage from "@/pages/bookDetails/ui/BookDetailsPage";
import {useGetBookByIdQuery} from "@/entities/book";
import {Loader} from "@chakra-ui/react";
import ToastFactory from "@/app/utils/toast_handler";
import {Navigate} from "react-router";
import {handleRtkError} from "@/shared/api/rtk-query";
import {useEffect} from "react";

export default function Book({params}: Route.ComponentProps) {
    const {data, isLoading, error} = useGetBookByIdQuery(params.bookId);

    useEffect(() => {
        if (error) {
            handleRtkError(error);
        }
    }, [error]);

    useEffect(() => {
        if (!isLoading && !error && !data) {
            ToastFactory({message: "Something went wrong", type: "error"});
        }
    }, [data, isLoading, error]);

    if (error) {
        return <Navigate to={"/"}/>;
    }

    if (isLoading) {
        return <Loader/>;
    }

    if (!data) {
        return <Navigate to={"/"}/>
    }

    return <BookDetailsPage book={data}/>;
}


