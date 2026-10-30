import {index, layout, route, type RouteConfig} from "@react-router/dev/routes";

export default [
    layout("routes/dashboard/layout.tsx", [
        index("routes/dashboard/dashboard.tsx"),
        route("library", "routes/dashboard/library.tsx"),
        route("books/:bookId", "routes/dashboard/book.tsx"),
        route("/book-shelves/:bookShelfId", "routes/dashboard/book-shelf.tsx"),
        route("books/:bookId/read", "routes/dashboard/read-book.tsx"),
        route("currently-reading", "routes/dashboard/currently-reading.tsx"),
        route("favorites", "routes/dashboard/favorites.tsx"),
        route("authors", "routes/dashboard/authors.tsx"),
        route("authors/:authorName", "routes/dashboard/author.tsx"),
        route("book-clubs", "routes/dashboard/book-clubs.tsx"),
        route("friends", "routes/dashboard/friends.tsx"),
        route("notifications", "routes/dashboard/notifications.tsx"),
        route("book-clubs/:clubId", "routes/dashboard/book-club.tsx"),
        route("book-clubs/:clubId/reading-plan", "routes/dashboard/book-club-reading-plan.tsx"),
        route("book-clubs/:clubId/manage", "routes/dashboard/book-club-manage.tsx"),
        route("book-clubs/:clubId/discussions", "routes/dashboard/book-club-discussions.tsx"),
        route("settings", "routes/dashboard/settings.tsx"),
        route("library-management", "routes/dashboard/library-management.tsx"),
        route("statistics", "routes/dashboard/statistics.tsx"),
        route("users", "routes/dashboard/users.tsx")
    ]),
    route('logout', 'routes/dashboard/logout.tsx'),
    route("login", "routes/login.tsx"),
    route("sign-up", "routes/sign-up.tsx"),
    route("oidc-callback", "routes/oidc-callback.tsx"),
] satisfies RouteConfig;
