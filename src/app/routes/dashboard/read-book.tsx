import type { Route } from "./+types/read-book";

import { fetchBookById } from "@/entities/book";
import {
  ReactReader,
  ReactReaderStyle,
  type IReactReaderStyle,
} from "react-reader";
import { useMemo, useState } from "react";
import { Box, CloseButton } from "@chakra-ui/react";
import { redirect, useNavigate } from "react-router";
import { config } from "@/shared";
import { useMediaQuery } from "@chakra-ui/react";

export async function clientLoader({ params }: Route.LoaderArgs) {
  try {
    const { bookId } = params;
    return await fetchBookById(bookId);
  } catch (error) {
    console.error("Error fetching book:", error);
    return redirect("/");
  }
}

function getInitialLocation(bookId: string): string | number {
  const savedLocation = JSON.parse(
    localStorage.getItem("currentlyReading") ?? "{}"
  )[bookId];
  return savedLocation ?? 0;
}

export default function ReadBook({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();

  const [location, setLocation] = useState<string | number>(
    getInitialLocation(loaderData.id)
  );

  const readerTheme = useResponsiveReaderTheme();

  useMemo(() => {
    const currentlyReading = JSON.parse(
      localStorage.getItem("currentlyReading") ?? "{}"
    );
    currentlyReading[loaderData.id] = location;
    localStorage.setItem("currentlyReading", JSON.stringify(currentlyReading));
  }, [location]);

  return (
    <>
      <Box
        h={"100vh"}
        w="100%"
        position={"fixed"}
        top={0}
        left={0}
        zIndex={1000}
      >
        <ReactReader
          url={`${config.backendUrl}/uploads/books/${loaderData.fileName}`}
          title={loaderData.title}
          location={location}
          locationChanged={setLocation}
          readerStyles={readerTheme}
          swipeable={true}
        />
      </Box>
      <CloseButton
        position={"fixed"}
        top={0}
        right={0}
        variant={"plain"}
        onClick={() => navigate(-1)}
        zIndex={1001}
      />
    </>
  );
}

function useResponsiveReaderTheme(): IReactReaderStyle {
  const [isMobile, isMobileHorizontal] = useMediaQuery([
    "(max-width: 768px)",
    "(max-height: 768px)",
  ]);

  const isMobileReaderStyle = {
    width: "80%",
    height: "80%",
  };

  return useMemo(
    () => ({
      ...ReactReaderStyle,
      readerArea: {
        ...ReactReaderStyle.readerArea,
        transition: undefined,
      },
      reader: {
        ...ReactReaderStyle.reader,
        ...((isMobile || isMobileHorizontal) && isMobileReaderStyle),
      },
      container: {
        ...ReactReaderStyle.container,
      },
    }),
    [isMobile]
  );
}
