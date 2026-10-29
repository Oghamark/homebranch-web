"use client"

import {ChakraProvider} from "@chakra-ui/react"
import {ColorModeProvider, type ColorModeProviderProps,} from "@/shared/ui/color-mode"
import {system} from "@/shared/ui/theme"

export function Provider(props: ColorModeProviderProps) {
    return (
        <ChakraProvider value={system}>
            <ColorModeProvider {...props} />
        </ChakraProvider>
    )
}
