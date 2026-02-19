import type {Route} from "./+types/statistics";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Statistics"},
        {name: "description", content: "Welcome to React Router!"},
    ];
}

export default function Statistics() {
    return "Statistics Page Placeholder";
}
