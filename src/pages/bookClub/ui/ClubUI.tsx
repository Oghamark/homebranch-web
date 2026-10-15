import {LoadingState} from "@/shared/ui/EditorialUI";

export {BookJacket, ConfirmAction, EmptyState, ErrorState} from "@/shared/ui/EditorialUI";
export {editorialPalette as clubPalette} from "@/shared/ui/theme";

export function ClubLoading() {
    return <LoadingState label="Opening your reading space..."/>;
}
