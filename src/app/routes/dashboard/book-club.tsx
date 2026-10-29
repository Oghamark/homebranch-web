import type {Route} from "./+types/book-club";
import {BookClubDetailPage} from "@/pages/bookClub/ui/BookClubDetailPage";

export function meta({}: Route.MetaArgs) { return [{title: "Homebranch - Book Club"}]; }
export default function BookClub({params}: Route.ComponentProps) { return <BookClubDetailPage clubId={params.clubId}/>; }
