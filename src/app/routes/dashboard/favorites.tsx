import { Button, Heading, Stack } from "@chakra-ui/react";
import { Link } from "react-router";
import type { Route } from "./+types/favorites";
import { fetchFavoriteBooks } from "@/entities/book/api/fetchFavoriteBooks";
import { LibraryPage } from "@/pages/library";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Homebranch - Favorites" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function clientLoader({}: Route.LoaderArgs) {
  return fetchFavoriteBooks();
}

export default function Favorites({ loaderData }: Route.ComponentProps) {
  return loaderData.length === 0 ? _noBooks() : <LibraryPage books={loaderData} />;
}

function _noBooks() {
  return (
    <Stack
      height={"100%"}
      alignItems={"center"}
      justifyContent={"center"}
      gap={4}
    >
      <Heading>You don't have any favorited books!</Heading>
      <Link to={"/"}>
        <Button>Go to Library</Button>
      </Link>
    </Stack>
  );
}
