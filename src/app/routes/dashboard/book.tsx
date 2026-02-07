import type {Route} from "./+types/book";

import BookDetailsPage from "@/pages/bookDetails/ui/BookDetailsPage";
import {useGetBookByIdQuery} from "@/entities/book";
import {Loader} from "@chakra-ui/react";
import ToastFactory from "@/app/utils/toast_handler";
import {Navigate} from "react-router";
import {handleRtkError} from "@/shared/api/rtk-query";

export default function Book({ params }: Route.ComponentProps) {
  const { data, isLoading, error } = useGetBookByIdQuery(params.bookId);

  if (error) {
      handleRtkError(error);
      return <Navigate to={"/"}/>;
  }

  if (isLoading) {
      return <Loader />;
  }

  if (!data) {
      ToastFactory({message: "Something went wrong", type: "error"});
      return <Navigate to={"/"}/>
  }

  return <BookDetailsPage book={data} />;
}


