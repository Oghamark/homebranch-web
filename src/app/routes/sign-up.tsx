import type {Route} from "./+types/sign-up";

import TextField from "@/components/ui/TextField";
import {Button, Card, Center, Spinner} from "@chakra-ui/react";
import {Link, redirect, useFetcher} from "react-router";
import signUp from "@/features/authentication/api/signUp";

export async function clientAction({request}: Route.ClientActionArgs) {
    const formData = await request.formData()
    return await signUp(formData);
}

export default function SignUp() {
    const fetcher = useFetcher();

    return (
        <Center height={"100%"}>
            <Card.Root>
                <Card.Header>
                    <Card.Title textAlign={"center"}>SignUp</Card.Title>
                </Card.Header>
                <fetcher.Form method="post">
                    <Card.Body>
                        <TextField label="Name" name="name" required/>
                        <TextField label="Email" name="email" type="email" required/>
                        <TextField
                            label="Password"
                            name="password"
                            type="password"
                            required
                        />
                        <TextField
                            label="Confirm Password"
                            name="password_confirmation"
                            type="password"
                            required
                        />
                    </Card.Body>
                    <Card.Footer justifyContent={"end"}>
                        <Button variant={"outline"} asChild>
                            <Link to={"/login"}>Log In</Link>
                        </Button>
                        <Button type="submit">
                            {fetcher.state !== "idle" ? <Spinner/> : "Sign Up"}
                        </Button>
                    </Card.Footer>
                </fetcher.Form>
            </Card.Root>
        </Center>
    );
}
