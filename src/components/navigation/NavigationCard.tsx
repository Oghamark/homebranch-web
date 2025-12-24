import { AddBookButton } from "@/entities/book";
import {
    Button,
    Card, Flex,
    For,
    Heading,
    Separator, Spacer, Spinner,
    Tabs,
    Text
} from "@chakra-ui/react";
import { LuBookOpen } from "react-icons/lu";
import {Link, useFetcher, useLocation} from "react-router";
import {CiLogout} from "react-icons/ci";
import {AddBookShelfButton, BookShelfNavigationSection} from "@/entities/bookShelf";



export function NavigationCard() {
  const location = useLocation();
  const fetcher = useFetcher();
  let busy = fetcher.state !== 'idle';

  const links = [
    { to: "/", label: "Library" },
    { to: "/currently-reading", label: "Currently Reading" },
    { to: "/favorites", label: "Favorites" },
    // { to: "/statistics", label: "Statistics" }, // TODO: Implement statistics page
  ];

  return (
    <Card.Root
      borderRadius="md"
      borderWidth="1px"
      p={4}
      mr={4}
      boxShadow="md"
      position={"fixed"}
      float={"left"}
      width="250px"
      height={"calc(100vh - 2rem)"}
    >
      <Flex align={"center"} justify={"center"} gap={2}>
        <LuBookOpen size={36} />
        <Heading>HomeBranch</Heading>
      </Flex>
      <Separator my={4} />
      <Tabs.Root
        orientation="vertical"
        variant={"subtle"}
        value={location.pathname}
      >
        <Tabs.List width={"100%"}>
          <For each={links}>
            {(link) => (
              <Tabs.Trigger value={link.to} asChild>
                <Link to={link.to}>{link.label}</Link>
              </Tabs.Trigger>
            )}
          </For>
        </Tabs.List>
      </Tabs.Root>
        <AddBookButton mt={2} />
      {/* TODO: Implement settings page */}
        <Separator my={4} />
        <Text mb={2}>Book Shelves</Text>
        <BookShelfNavigationSection />
        <Separator my={4} />
      <Tabs.Root
        orientation="vertical"
        variant={"subtle"}
        value={location.pathname}
      >
        <Tabs.List width={"100%"}>
          <Tabs.Trigger value={"settings"} asChild>
            <Link to={"/settings"}>Settings</Link>
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>
        <Spacer/>
        <Button variant={"outline"} onClick={() => fetcher.submit('', {method: 'post', action: '/logout' })}>{busy ? <Spinner/> : <><CiLogout/> Log out</>}</Button>
    </Card.Root>
  );
}
