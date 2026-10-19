import type {Route} from "./+types/settings";
import {Badge, Box, Button, Flex, Link, Stack, Text} from "@chakra-ui/react";
import {Link as RouterLink, useSearchParams} from "react-router";
import {useGetUserByIdQuery} from "@/entities/user";
import {config} from "@/shared";
import {KindleSettingsCard, MailSettingsCard} from "@/entities/kindle";
import {ErrorState, LoadingState, PageHeader, PageSection} from "@/shared/ui/EditorialUI";
import {useColorMode} from "@/shared/ui/color-mode";
import {SettingsNavigationGuard} from "@/features/settings/SettingsNavigationGuard";
import {RegistrationSettings, SignInSettings} from "@/features/settings/SignInSettings";
import {SocialSettings} from "@/features/social/SocialSettings";
import {KoreaderSettings} from "@/features/koreader/KoreaderSettings";

export function meta({}: Route.MetaArgs) {
    return [{title: "Homebranch - Settings"}];
}

function ProfileSettings() {
    const id = sessionStorage.getItem("user_id");
    const query = useGetUserByIdQuery(id ?? "", {skip: !id});
    if (query.isLoading) return <LoadingState label="Loading your profile..."/>;
    if (!query.data || query.isError) return <ErrorState onRetry={id ? query.refetch : undefined}>Your profile could not be loaded.</ErrorState>;
    return <PageSection title="Profile" description="Your account information is read-only here.">
        <Box as="dl">
            <Text as="dt" color="fg.muted">Name</Text><Text as="dd" mb={4}>{query.data.name}</Text>
            <Text as="dt" color="fg.muted">Email</Text><Text as="dd" mb={4} overflowWrap="anywhere">{query.data.email}</Text>
            <Text as="dt" color="fg.muted">Role</Text><Box as="dd"><Badge>{sessionStorage.getItem("user_role") ?? "USER"}</Badge></Box>
        </Box>
    </PageSection>;
}

function AppearanceSettings() {
    const {colorMode, setColorMode} = useColorMode();
    return <PageSection title="Appearance" description="Choose the application's appearance. Your reading theme stays separate.">
        <Flex gap={3} wrap="wrap">
            {(["light", "dark"] as const).map(mode => <Button key={mode} minH="44px" colorPalette="orange" variant={colorMode === mode ? "solid" : "outline"}
                aria-pressed={colorMode === mode} onClick={() => setColorMode(mode)}>{mode === "light" ? "Light" : "Dark"}</Button>)}
        </Flex>
    </PageSection>;
}

function SettingsSections() {
    const isAdmin = sessionStorage.getItem("user_role") === "ADMIN";
    const [params] = useSearchParams();
    const personal = [["profile", "Profile"], ["appearance", "Appearance"], ["privacy", "Friends and invitations"], ["kindle", "Send to Kindle"], ["koreader", "KOReader"]];
    const admin = isAdmin ? [["email", "Email delivery"], ["sign-in", "Sign-in integrations"],
        ...(!config.cloudMode ? [["registration", "Registration"]] : [])] : [];
    const requested = params.get("section") ?? "profile";
    const section = [...personal, ...admin].some(([id]) => id === requested) ? requested : "profile";
    function navigation(items: string[][]) {
        return <Flex gap={2} wrap="wrap">{items.map(([id, title]) => {
            const next = new URLSearchParams(params);
            next.set("section", id);
            return <Link asChild key={id} minH="44px" px={3} py={2} borderRadius="lg"
                bg={section === id ? "bg.subtle" : undefined} fontWeight={section === id ? "semibold" : undefined}
                color={section === id ? {base: "orange.700", _dark: "orange.400"} : "fg.muted"}>
                <RouterLink to={`/settings?${next.toString()}`} aria-current={section === id ? "page" : undefined}>{title}</RouterLink>
            </Link>;
        })}</Flex>;
    }
    return <Stack gap={7} maxW="900px" w="full" minW={0}>
        <PageHeader title="Settings" description="Your account, appearance, and reading integrations."/>
        <Stack as="nav" aria-label="Settings sections" gap={3}>
            <Box><Text fontSize="sm" fontWeight="semibold" mb={2}>Personal</Text>{navigation(personal)}</Box>
            {admin.length > 0 && <Box><Text fontSize="sm" fontWeight="semibold" mb={2}>Administration</Text>{navigation(admin)}</Box>}
        </Stack>
        <Box bg="bg.panel" borderWidth="1px" borderRadius="xl" p={{base: 4, md: 6}} minW={0}>
            {section === "profile" && <ProfileSettings/>}
            {section === "appearance" && <AppearanceSettings/>}
            {section === "privacy" && <SocialSettings/>}
            {section === "kindle" && <KindleSettingsCard/>}
            {section === "koreader" && <KoreaderSettings/>}
            {isAdmin && section === "email" && <MailSettingsCard/>}
            {isAdmin && section === "sign-in" && <SignInSettings/>}
            {isAdmin && !config.cloudMode && section === "registration" && <RegistrationSettings/>}
        </Box>
    </Stack>;
}

export default function Settings() {
    return <SettingsNavigationGuard><SettingsSections/></SettingsNavigationGuard>;
}
