import type {Route} from "./+types/settings";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Settings"},
        {name: "description", content: "Welcome to React Router!"},
    ];
}

export default function Library() {
    return "Settings Page Placeholder";
}
