import {Button, Card, Flex, Stack, Text} from "@chakra-ui/react";
import {useEffect, useState} from "react";
import {LuSend} from "react-icons/lu";
import TextField from "@/shared/ui/TextField";
import ToastFactory from "@/shared/lib/toast/toast";
import {
    getApiErrorMessage,
    useGetKindleEmailQuery,
    useGetMailSenderQuery,
    useUpdateKindleEmailMutation,
} from "@/entities/kindle/api/api";

export function KindleSettingsCard() {
    const {data} = useGetKindleEmailQuery();
    const {data: mailSender} = useGetMailSenderQuery();
    const [updateKindleEmail, {isLoading}] = useUpdateKindleEmailMutation();
    const [email, setEmail] = useState("");

    useEffect(() => {
        setEmail(data?.kindleEmail ?? "");
    }, [data?.kindleEmail]);

    const handleSave = async () => {
        try {
            await updateKindleEmail(email.trim() || null).unwrap();
            ToastFactory({message: "Kindle email saved", type: "success"});
        } catch (error) {
            ToastFactory({message: getApiErrorMessage(error), type: "error"});
        }
    };

    return (
        <Card.Root>
            <Card.Header>
                <Flex align="center" gap={3}>
                    <LuSend/>
                    <Card.Title>Send to Kindle</Card.Title>
                </Flex>
            </Card.Header>
            <Card.Body>
                <Stack gap={4}>
                    <TextField
                        label="Kindle email address"
                        tooltip="Find this in your Amazon account under Content & Devices > Preferences > Personal Document Settings."
                        placeholder="yourname@kindle.com"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                    <Text fontSize="sm" color="fg.muted">
                        {mailSender?.sender
                            ? `Add ${mailSender.sender} to your Approved Personal Document E-mail List in Amazon, otherwise Amazon will reject the books. Only EPUB books can be sent.`
                            : "Add this server's sender address to your Approved Personal Document E-mail List in Amazon once an administrator has configured email. Only EPUB books can be sent."}
                    </Text>
                </Stack>
            </Card.Body>
            <Card.Footer justifyContent="flex-end">
                <Button onClick={handleSave} loading={isLoading}>Save</Button>
            </Card.Footer>
        </Card.Root>
    );
}
