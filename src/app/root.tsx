import {isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration} from "react-router";
import {useEffect, useState, type ReactNode} from "react";
import {Provider as ReduxProvider} from 'react-redux';

import "@/app/styles/app.css";
import type {Route} from "./+types/root";
import {Provider} from "@/shared/ui/provider";
import {Toaster} from "@/shared/ui/toaster";
import {AuthContextProvider} from "@/shared/api/context";
import {store} from "@/app/store";
import {Box, Button, HStack, Stack, Text} from "@chakra-ui/react";
import {LoadingState, PageHeader} from "@/shared/ui/EditorialUI";


export const links: Route.LinksFunction = () => [
    {rel: "icon", type: "image/svg+xml", href: "/Favicon.svg"},
    {rel: "icon", type: "image/png", sizes: "64x64", href: "/Favicon@2x.png"},
    {rel: "icon", type: "image/png", sizes: "32x32", href: "/Favicon.png"},
    {rel: "icon", type: "image/png", sizes: "16x16", href: "/Favicon@0.5x.png"},
    {rel: "apple-touch-icon", sizes: "64x64", href: "/Favicon@2x.png"},
    {rel: "manifest", href: "/manifest.webmanifest"},
    {rel: "preconnect", href: "https://fonts.googleapis.com"},
    {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
    },
    {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
    },
];

export function Layout({children}: { children: ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
        <head>
            <title>Homebranch</title>
            <meta charSet="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
            <meta name="application-name" content="Homebranch"/>
            <meta name="description" content="Manage and read your self-hosted ebook collection across devices."/>
            <meta name="mobile-web-app-capable" content="yes"/>
            <meta name="apple-mobile-web-app-capable" content="yes"/>
            <meta name="apple-mobile-web-app-status-bar-style" content="default"/>
            <meta name="apple-mobile-web-app-title" content="Homebranch"/>
            <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff"/>
            <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1a1a1a"/>
            <script src="/config.js"/>
            <Meta/>
            <Links/>
        </head>
        <body>
        <Provider>
            <ReduxProvider store={store}>
                <AuthContextProvider>
                    <Toaster/>
                    {children}
                    <ScrollRestoration/>
                    <Scripts/>
                </AuthContextProvider>
            </ReduxProvider>
        </Provider>
        </body>
        </html>
    );
}

export default function App() {
    return <Outlet/>;
}

export function HydrateFallback() {
    return <Box as="main" px={5} py={12}><LoadingState label="Opening Homebranch..."/></Box>;
}

export function ErrorBoundary({error}: Route.ErrorBoundaryProps) {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    // Unknown SPA URLs initially receive the same prerendered loading markup.
    if (!hydrated) return <HydrateFallback/>;

    let message = "We couldn't open this page";
    let details = "Something went wrong. Try reloading, or return to your library.";
    let stack: string | undefined;

    if (isRouteErrorResponse(error)) {
        message = error.status === 404 ? "This page isn't here" : "We couldn't open this page";
        details =
            error.status === 404
                ? "The link may be out of date, or the page may have moved. Your library is a good place to start."
                : error.statusText || details;
    } else if (import.meta.env.DEV && error && error instanceof Error) {
        details = error.message;
        stack = error.stack;
    }

    return (
        <Stack as="main" maxW="760px" mx="auto" px={{base: 5, md: 8}} py={{base: 12, md: 24}} gap={6}>
            <Text fontSize="sm" fontWeight="semibold" color="fg.muted">Homebranch</Text>
            <PageHeader title={message} description={details}/>
            <HStack gap={3} flexWrap="wrap">
                <Button asChild colorPalette="orange" minH="44px"><a href="/library">Back to library</a></Button>
                <Button variant="outline" minH="44px" onClick={() => window.location.reload()}>Reload page</Button>
            </HStack>
            {stack && (
                <Box as="details" bg="bg.subtle" borderWidth="1px" borderRadius="xl" p={4} minW={0}>
                    <summary>Developer details</summary>
                    <Box as="pre" overflowX="auto" mt={3} fontSize="sm"><code>{stack}</code></Box>
                </Box>
            )}
        </Stack>
    );
}
