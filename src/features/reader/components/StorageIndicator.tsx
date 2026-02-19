import {Flex} from "@chakra-ui/react";
import {LuCloud, LuHardDrive, LuSlash} from "react-icons/lu";

export type StorageLocation = "local" | "cloud" | "both";

interface StorageIndicatorProps {
    location: StorageLocation;
}

export function StorageIndicator({location}: StorageIndicatorProps) {
    return (
        <Flex
            position="absolute"
            top={1}
            right={1}
            bg="rgba(0, 0, 0, 0.65)"
            color="white"
            borderRadius="md"
            px={1.5}
            py={1}
            align="center"
            gap={1}
            fontSize="xs"
        >
            {location === "cloud" && <LuCloud size={14}/>}
            {location === "local" && <LuHardDrive size={14}/>}
            {location === "both" && (
                <>
                    <LuCloud size={14}/>
                    <LuSlash size={10}/>
                    <LuHardDrive size={14}/>
                </>
            )}
        </Flex>
    );
}
