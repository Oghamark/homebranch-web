import { fetchBookById } from "@/entities/book";
import type { Route } from "./+types/currently-reading";
import { LibraryPage } from "@/pages/library";
import { Button, Heading, Stack } from "@chakra-ui/react";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Homebranch - Currently Reading" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function clientLoader({}: Route.LoaderArgs) {
  const currentlyReading = JSON.parse(
    localStorage.getItem("currentlyReading") ?? "{}"
  );

  const ids = Object.keys(currentlyReading ?? {});

  return await Promise.all(
    ids.map((id) => {
      return fetchBookById(id);
    })
  );
}

export default function CurrentlyReading({ loaderData }: Route.ComponentProps) {
  return loaderData.length === 0 ? (
    _noBooks()
  ) : (
    <LibraryPage books={loaderData} />
  );
}

function _noBooks() {
  return (
    <Stack
      height={"100%"}
      alignItems={"center"}
      justifyContent={"center"}
      gap={4}
    >
      <Heading>You don't have any open books!</Heading>
      <Heading size={"md"}>Start reading something new!</Heading>
      <Link to={"/"}>
        <Button>Go to Library</Button>
      </Link>
    </Stack>
  );
}
