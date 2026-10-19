<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/Logo%202-Color%20For%20Dark.svg">
  <img src="public/Logo%202-Color%20For%20Light.svg" alt="HomeBranch" width="710" height="auto">
</picture>

Homebranch is a self-hosted web application for managing and reading your E-Book collection. 
It provides a user-friendly interface to organize, search, and read your ebooks across devices.

> The project workspace, integrated development stack, and contribution process are maintained in the [Homebranch project repository](https://github.com/Oghamark/homebranch).

> [!NOTE]
> The project is split into 3 repositories allowing you to choose the components you want to use:
> - [Homebranch Web](https://github.com/Oghamark/homebranch-web): The frontend web application built with React and TypeScript
> - [Homebranch](https://github.com/Oghamark/homebranch): The backend API built with NestJS and TypeScript
> - [Authentication](https://github.com/Oghamark/Authentication): A standalone authentication service built with NestJS and TypeScript, which can be used with Homebranch or as a general-purpose auth service for other applications

---

## Preview

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="images/library_view.png">
  <img src="images/library_view_light.png" alt="Library View">
</picture>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="images/book_details_view.png">
  <img src="images/book_details_view_light.png" alt="Book Details View">
</picture>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="images/authors_view.png">
  <img src="images/authors_view_light.png" alt="Authors View">
</picture>

---

## Features

- EPUB and PDF in-browser reading plus single- and multi-track MP3 and M4B audiobook playback, with cross-device listening-position sync
- Installable PWA with an offline-ready app shell for a more native-like experience
- Library with infinite scroll and search
  - Keyword search: `isbn:<value>`, `genre:<value>`, `series:<value>`, `author:<value>` prefixes narrow results by metadata field
- Book detail page with enriched metadata and format-aware actions: genres, series, ISBN, page count, publisher, language, ratings, format selection, and linked-format management
- Automatic metadata enrichment from Open Library and Google Books on upload
- Book shelves (collections)
- Currently Reading and Favorites lists
- Dark and light mode
- User management and roles
- Book clubs with discovery, consent-based invitations, private clubs, a shared reading plan, and spoiler-safe discussions
- Private friends lists, mutual friend requests, blocking, and request privacy settings
- An in-app notification inbox for requests, friendships, discussions, replies, and reading-plan changes
- EPUB, PDF, MP3, and M4B upload; selecting a directory groups its MP3 files into naturally ordered audiobook tracks
- SSO login via OIDC (configurable in the Settings page)
- Library Management page (admin): paginated job history with status filtering, book ownership management, linked-format maintenance, and book deduplication
- Real-time library updates via SSE — new, removed, or updated books reflect automatically without a manual page refresh; job progress streams live as jobs run

---

## Finding your next read

The library, favorites, continue-reading list, authors, and shelves share the same
page structure and collection controls. Search lives with the collection you are
viewing, and its URL preserves your query when you refresh or use browser back.
The existing keyword prefixes and grid/table preferences remain available.
Library scope controls appear only where your account can use them.

Book details prioritize reading and listening. Organization and downloads remain
close at hand, while metadata, covers, linked formats, and destructive maintenance
actions have their own clearly named controls. Uploads retain directory selection
and audiobook-track grouping.

Personal settings are separate from administrator integrations and library tools.
Reader and player controls follow the same visual language without changing
reading themes, typography preferences, saved positions, or playback behavior.

Shared presentation components live in `src/shared/ui/EditorialUI.tsx`, with
theme tokens in `src/shared/ui/theme.ts`. Keep reader-document styling separate
from application surfaces. Mutation dialogs should reject or return `false` on
failure so confirmations stay open and display recovery feedback.

---

## Reading together

Open **Book Clubs** to visit **My clubs**, discover clubs open to people on your
Homebranch, or revisit archived clubs. Create a club using a book from your own
uploaded library. Owners and moderators invite existing accounts; recipients
accept or decline in **Book clubs > Invitations**. An invitation grants no
membership until accepted and expires after 30 days. Private clubs are
invitation-only, while open clubs still allow anyone to join.

Club cards and headers display real covers from matching books available to you,
including linked formats. Missing or unavailable artwork uses a simple jacket
fallback. Cover lookup stays local and respects Cloud library ownership.

Each club has a **Home**, **Reading plan**, and **Discussions**. Choosing your
reading copy is optional for conversations, but required to track club progress.
Your copy and private edition labels stay private, and progress sharing is off
unless you enable it. Club progress is separate from your private reader history.
Spoilers stay hidden until you choose to reveal an individual post or reply.

Everyone in a club can view its **Members** list on **Home**, including in archived
clubs. The list shows display names and club roles, not email addresses or library
details. Non-members cannot view the list.

Owners and moderators use **Manage** for people and moderation. Owners can also
change club details and visibility, transfer ownership, archive, or permanently
delete a club. Editing retained reading steps preserves progress; removing steps
or changing your reading copy requires confirmation before associated club
progress is cleared. Archived clubs remain read-only and cannot be reopened.

For frontend checks, run `npm run typecheck`, `npm test`, and `npm run build`.
Component tests cover shared interactions and application flows, including book
clubs, without requiring live accounts.

## Friends and notifications

**Friends** contains your private friends list, incoming/outgoing requests, and
people search. Search by display name or an exact email address; results show
names only. Friendships require acceptance and never grant access to another
person's library, reading history, or private clubs.

**Settings > Friends and invitations** controls incoming friend requests and
whether club invitations can come from anyone, friends only, or no one.
Restricting these settings cancels affected pending requests. Blocking cancels
requests in both directions and removes friendship, but leaves shared club
membership and discussions unchanged. Unblocking restores nothing automatically.

**Notifications** is a durable inbox with unread counts, mark-read, and dismissal.
Reading or dismissing a notification does not decide its request. Pending requests
remain in Friends or Book clubs. The app refreshes notifications every 30 seconds
while visible and on focus/reconnection; there is no email or browser push.

Members receive new-discussion and reading-plan notifications, and replies in
conversations they started or joined. Each club's Home page has a mute control.
Notifications never include post bodies, spoiler snippets, or private progress.
Declined or canceled requests have a 24-hour resend wait, with additional abuse
limits.

## KOReader integration

**Settings > KOReader** approves the short-lived code displayed by the maintained
Homebranch KOReader plugin. A deep link fills the code but never approves a reader
automatically. Review the pairing action before approving. This issues a revocable,
sync-only device credential, not a general account token. The same settings section
lists connected devices and their contact/expiry times and lets you revoke them.
Use the displayed API-based `/koreader` URL for the plugin and `/opds/v1/catalog` catalog
URL for ordinary OPDS downloads. Existing OPDS login is unchanged.

The EPUB reader's **Private annotations** panel creates highlights from real text
selections and supports notes, colors, deletion, and chapter/quote navigation.
Annotations belong to the current account, never a club or a shared library.
When the book has a server-provided EPUB format ID, the panel shows a selectable
copy for manual plugin linking of identical-content editions. This never replaces
server content verification or book-access checks.
Pending operations are kept in browser storage separately for each account and
book, including stable mutation IDs for retries. They retry on reconnect, focus,
and visible refresh. Failures stay visible; do not clear browser storage while
changes are pending. Latest server-accepted edits win, including an explicitly
restored draft after a remote deletion.

Anchors use an EPUB resource path plus literal quote and surrounding context.
Native-only anchors are checked against every reading-order resource before a
portable path is inferred. A unique literal quote is accepted; repeated quotes
require unique exact context. There is no fuzzy matching, whitespace rewriting,
native XPointer interpretation, or invented CFI conversion. Missing, ambiguous,
or unsupported anchors remain visible as unresolved annotations. Highlight
rendering requires the browser CSS Highlight API and does not alter book text;
unsupported browsers retain the annotation list and report the limitation.
Readium's blob-backed frames are identified using its injected original-resource
base URL, constrained to the publication root, rather than treating blob URLs as
portable EPUB paths.
Frame registration also observes the reader container's standard iframe lifecycle
because cached Readium frames can activate without another `frameLoaded` callback.
Quote jumps use a verified DOM range and the current layout's geometry.

Newer KOReader progress offers an explicitly approximate percentage jump.
Existing exact web-position prompts remain separate. Automatic startup saves
pause until the position check finishes and any offered position is accepted or
declined. A failed check stays paused with retry and an explicit stay-here action.
Server acceptance timestamps are compared conservatively with locally recorded
web-save timestamps; device clock differences can suppress an approximate offer.
Older local saves without that timestamp rely on the server's latest-source
ordering. PDF and audio readers do not use the KOReader bridge or annotations.

---

## Installation

See our [documentation](https://homebranch.app/docs/getting-started/) for installation and configuration instructions.

---

## Contributing

Contributions are welcome! See the [Homebranch contribution guidelines](https://github.com/Oghamark/homebranch/blob/dev/CONTRIBUTING.md) for the project contribution process and integrated development setup.

---

## Credits

- "HomeBranch" Logo and Iconography  © 2026 [Acro Visuals, L.L.C.](https://acrovisuals.com) is licensed under CC BY-SA 4.0. To view a copy of this license, visit https://creativecommons.org/licenses/by-sa/4.0/
