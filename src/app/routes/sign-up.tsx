import type { Route } from "./+types/sign-up";

import TextField from "@/components/ui/TextField";
import { toaster } from "@/components/ui/toaster";
import { authenticationAxiosInstance } from "@/shared/api/axios";
import { Button, Card, Center, Spinner } from "@chakra-ui/react";
import { AxiosError } from "axios";
import { Form, Link, redirect, useFetcher } from "react-router";

export async function clientAction({ request }: Route.ClientActionArgs) {
  const response = await authenticationAxiosInstance
    .postForm("/sign-up", request.formData)
    .catch((error: AxiosError) => {
      // TODO: Should extract this logic into a response handler.
      if (error.response?.status === 401) {
        toaster.error({ description: "Invalid email or password" });
      } else if (error.response?.status === 500) {
        toaster.error({ description: "Server error, please try again later" });
      } else {
        toaster.error({ description: "An unexpected error occurred" });
      }
      console.error("Sign-up error:", error);
      return null;
    });
  return redirect("/");
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
            <TextField label="Email" name="email" type="email" required />
            <TextField
              label="Password"
              name="password"
              type="password"
              required
            />
            <TextField
              label="Confirm Password"
              name="confirm-password"
              type="password"
              required
            />
          </Card.Body>
          <Card.Footer justifyContent={"end"}>
            <Button variant={"outline"} asChild>
              <Link to={"/login"}>Log In</Link>
            </Button>
            <Button type="submit">
              {fetcher.state !== "idle" ? <Spinner /> : "Sign Up"}
            </Button>
          </Card.Footer>
        </fetcher.Form>
      </Card.Root>
    </Center>
  );
}
