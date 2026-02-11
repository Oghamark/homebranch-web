import TextField from "@/components/ui/TextField";
import {Button, Field, Flex, Heading, HStack, Image, Stack, Textarea, VStack,} from "@chakra-ui/react";
import {Form} from "react-router";

export default function CreateBookPage() {
    return (
        <Stack>
            <Heading alignSelf={"Center"}>Edit Book Metadata</Heading>
            <Form method="post" action={"/create-book"}>
                <Stack>
                    <HStack align={"start"} gap={8} mb={2}>
                        <Image
                            src={""}
                            alt="Book Cover"
                            w={280}
                            border={"2px solid"}
                            borderColor={"gray.600"}
                            borderRadius={10}
                        />
                        <VStack flex={1}>
                            <TextField
                                label={"Title"}
                                name="title"
                                variant={"subtle"}
                                // value={metadata?.title}
                            />
                            <Field.Root>
                                <Field.Label>Description</Field.Label>
                                <Textarea
                                    name="description"
                                    variant={"subtle"}
                                    //   value={metadata?.description}
                                />
                            </Field.Root>
                            <TextField
                                label={"Author"}
                                name="author"
                                variant={"subtle"}
                                // value={metadata?.creator}
                            />
                            <TextField
                                label={"Published Year"}
                                name="publishedYear"
                                variant={"subtle"}
                            />
                            <TextField label={"Tags"} name="tags" variant={"subtle"}/>
                        </VStack>
                    </HStack>
                    <VStack flex={1}>
                        <TextField label={"Series"} name="series" variant={"subtle"}/>
                        <TextField label={"Series ID"} name="seriesId" variant={"subtle"}/>
                    </VStack>
                </Stack>
                <Flex gap={2} mt={4} justifyContent={"flex-end"}>
                    <Button type="reset" variant={"outline"}>
                        Reset
                    </Button>
                    <Button type="submit" color={"primary"}>
                        Create Book
                    </Button>
                </Flex>
            </Form>
        </Stack>
    );
}
