import type {ReactNode} from "react";
import {Box, Stack, Text} from "@chakra-ui/react";
import {PageHeader} from "@/shared/ui/EditorialUI";
import {useColorMode} from "@/shared/ui/color-mode";

export function AuthLayout({title, description, children}: {title: string; description: string; children: ReactNode}) {
    const {colorMode} = useColorMode();
    const logoSrc = colorMode === "dark" ? "/Logo%202-Color%20For%20Dark.svg" : "/Logo%202-Color%20For%20Light.svg";
    return <Box as="main" minH="100dvh" display="flex" alignItems="center" justifyContent="center" px={{base: 4, md: 8}} py={{base: 8, md: 12}}>
        <Stack w="full" maxW="460px" gap={6}>
            <Stack gap={3} align="center">
                <img src={logoSrc} alt="HomeBranch" style={{width: "60%", maxWidth: "100%"}}/>
                <Text color="fg.muted" fontSize="sm">Your personal library</Text>
            </Stack>
            <Stack bg="bg.panel" borderWidth="1px" borderRadius="xl" p={{base: 5, md: 8}} gap={6}>
                <PageHeader title={title} description={description}/>
                {children}
            </Stack>
        </Stack>
    </Box>;
}
