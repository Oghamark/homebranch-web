import type {Route} from "./+types/book-club-manage";
import {BookClubManagePage} from "@/pages/bookClub/ui/BookClubManagePage";

export function meta() { return [{title: "Homebranch - Manage book club"}]; }
export default function ManageClub({params}: Route.ComponentProps) { return <BookClubManagePage clubId={params.clubId}/>; }
