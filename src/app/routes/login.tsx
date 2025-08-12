import type {Route} from "./+types/login";

import TextField from "@/components/ui/TextField";
import {Button, Card, Center, Spinner} from "@chakra-ui/react";
import {Link, useFetcher} from "react-router";
import {login} from "@/features/authentication/api/login";

export async function clientAction({request}: Route.ClientActionArgs) {
    const formData = await request.formData();
    return await login(formData);
}

export default function Login() {
    const fetcher = useFetcher();

    return (
        <Center height={"100%"}>
            <Card.Root>
                <Card.Header>
                    <Card.Title textAlign={"center"}>Login</Card.Title>
                </Card.Header>
                <fetcher.Form method="post">
                    <Card.Body>
                        <TextField label="Email" name="email" type="email" required/>
                        <TextField
                            label="Password"
                            name="password"
                            type="password"
                            required
                        />
                    </Card.Body>
                    <Card.Footer justifyContent={"end"}>
                        <Button variant={"outline"} asChild>
                            <Link to="/sign-up">Sign Up</Link>
                        </Button>
                        <Button type="submit">
                            {fetcher.state !== "idle" ? <Spinner/> : "Login"}
                        </Button>
                    </Card.Footer>
                </fetcher.Form>
            </Card.Root>
        </Center>
    );
}
