import type {Route} from "./+types/book-clubs";
import {BookClubsPage} from "@/pages/bookClub/ui/BookClubsPage";

export function meta({}: Route.MetaArgs) { return [{title: "Homebranch - Book Clubs"}]; }
export default function BookClubs() { return <BookClubsPage/>; }
