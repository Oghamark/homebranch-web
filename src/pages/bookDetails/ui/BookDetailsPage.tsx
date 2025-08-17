import { DeleteConfirmationDialog } from "@/components/ui/modals/DeleteConfirmationDialog";
import { updateBook, type BookModel } from "@/entities/book";
import { config } from "@/shared";
import {
  Box,
  HStack,
  IconButton,
  Heading,
  Separator,
  Image,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";
import { HiHeart, HiBookOpen, HiX } from "react-icons/hi";
import { Link } from "react-router";

export interface BookDetailsPageProps {
  book: BookModel;
}

function isBookOpened(bookId: string): Boolean {
  const currentlyReading = JSON.parse(
    localStorage.getItem("currentlyReading") ?? "{}"
  );
  return Boolean(currentlyReading[bookId]);
}

export default function BookDetailsPage({ book }: BookDetailsPageProps) {
  const [isFavorited, setIsFavorited] = useState(book.isFavorite);

  const favoriteHandler = async () => {
    try {
      setIsFavorited(!isFavorited);
      const updatedBook = await updateBook(book.id, {
        isFavorite: !isFavorited,
      });
      setIsFavorited(updatedBook?.isFavorite ?? !isFavorited);
    } catch (error) {
      console.error("Failed to update book:", error);
      setIsFavorited(!isFavorited); // Revert state on error
    }
  };

  const [isCurrentlyReading, setIsCurrentlyReading] = useState(
    isBookOpened(book.id)
  );

  const removeCurrentlyReading = (bookId: string) => {
    const currentlyReading = JSON.parse(
      localStorage.getItem("currentlyReading") ?? "{}"
    );
    delete currentlyReading[bookId];
    localStorage.setItem("currentlyReading", JSON.stringify(currentlyReading));
    setIsCurrentlyReading(false);
  };

  return (
    <>
      <Box p={4}>
        <HStack align={"start"}>
          <Box>
            <Image
              src={`${config.backendUrl}/uploads/cover-images/${book.coverImageFileName}`}
              alt={book.title}
              w={"200px"}
            />
            <HStack mt={2}>
              <DeleteConfirmationDialog
                title={`Delete book: ${book.title}`}
                action={`/delete-book/${book.id}`}
              />
              {/*TODO: Implement edit book functionality */}
              {/* <IconButton variant={"subtle"}>
              <HiPencil />
            </IconButton> */}
              <IconButton variant={"subtle"} onClick={favoriteHandler}>
                <HiHeart color={isFavorited ? "red" : undefined} />
              </IconButton>
              <IconButton variant={"subtle"} asChild>
                <Link to={`/books/${book.id}/read`}>
                  <HiBookOpen />
                </Link>
              </IconButton>
              {isCurrentlyReading && (
                <IconButton
                  variant={"subtle"}
                  onClick={() => removeCurrentlyReading(book.id)}
                >
                  <HiX />
                </IconButton>
              )}
            </HStack>
          </Box>
          <Box p={4} flex={1}>
            <Heading>{book.title}</Heading>
            <Text color={"GrayText"} fontSize={"sm"}>
              {book.author}
            </Text>
            <Separator my={4} />
            <Text fontSize={"md"}>Published Year: {book.publishedYear}</Text>
          </Box>
        </HStack>
      </Box>
    </>
  );
}
