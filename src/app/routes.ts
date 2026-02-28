import {index, layout, route, type RouteConfig} from "@react-router/dev/routes";

export default [
    layout("routes/dashboard/layout.tsx", [
        route("books/:bookId", "routes/dashboard/book.tsx"),
        route("/book-shelves/:bookShelfId", "routes/dashboard/book-shelf.tsx"),
        route("books/:bookId/read", "routes/dashboard/read-book.tsx"),
        route("currently-reading", "routes/dashboard/currently-reading.tsx"),
        route("favorites", "routes/dashboard/favorites.tsx"),
        route("authors", "routes/dashboard/authors.tsx"),
        route("authors/:authorName", "routes/dashboard/author.tsx"),
        index("routes/dashboard/library.tsx"),
        route("settings", "routes/dashboard/settings.tsx"),
        route("statistics", "routes/dashboard/statistics.tsx"),
        route("users", "routes/dashboard/users.tsx")
    ]),
    route('logout', 'routes/dashboard/logout.tsx'),
    route("login", "routes/login.tsx"),
    route("sign-up", "routes/sign-up.tsx"),

] satisfies RouteConfig;
