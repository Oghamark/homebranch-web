import type {Route} from "./+types/book-club-discussions";
import {DiscussionsPage} from "@/pages/bookClub";

export function meta({}: Route.MetaArgs) { return [{title: "Homebranch - Book Club Discussions"}]; }
export default function BookClubDiscussions({params}: Route.ComponentProps) { return <DiscussionsPage clubId={params.clubId}/>; }
