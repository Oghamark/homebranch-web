import type {Route} from "./+types/book-club-reading-plan";
import {BookClubReadingPlanPage} from "@/pages/bookClub/ui/BookClubReadingPlanPage";

export function meta() { return [{title: "Homebranch - Reading plan"}]; }
export default function ReadingPlan({params}: Route.ComponentProps) { return <BookClubReadingPlanPage clubId={params.clubId}/>; }
