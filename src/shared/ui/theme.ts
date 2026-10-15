import {createSystem, defaultConfig, defineConfig} from "@chakra-ui/react";

// Kept for club surfaces that still render with the default Chakra system.
export const editorialPalette = {
    "--chakra-colors-orange-solid": {base: "var(--chakra-colors-orange-700)", _dark: "var(--chakra-colors-orange-400)"},
} as const;

// No global typography, reader selectors, or button-size overrides. Compact
// reader controls retain their sizes; shared actions opt into 44px targets.
export const system = createSystem(defaultConfig, defineConfig({
    theme: {
        tokens: {
            fonts: {
                heading: {value: "Georgia, 'Times New Roman', serif"},
            },
        },
        semanticTokens: {
            colors: {
                bg: {
                    DEFAULT: {value: {_light: "#faf8f5", _dark: "#181512"}},
                    panel: {value: {_light: "#ffffff", _dark: "#211d19"}},
                    subtle: {value: {_light: "#f5f1eb", _dark: "#211d19"}},
                    muted: {value: {_light: "#efe9e1", _dark: "#2b2520"}},
                    emphasized: {value: {_light: "#e5dcd0", _dark: "#3b322a"}},
                },
                border: {
                    DEFAULT: {value: {_light: "#ded6cb", _dark: "#4a4036"}},
                },
                fg: {
                    subtle: {value: {_light: "#695c50", _dark: "#b8aa9b"}},
                },
                orange: {
                    solid: {value: {_light: "{colors.orange.700}", _dark: "{colors.orange.400}"}},
                    contrast: {value: {_light: "{colors.white}", _dark: "{colors.black}"}},
                },
            },
        },
    },
}));
