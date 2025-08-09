import type { Route } from "./+types/login";

import TextField from "@/components/ui/TextField";
import { toaster } from "@/components/ui/toaster";
import { authenticationAxiosInstance } from "@/shared/api/axios";
import { Button, Card, Center, Spinner } from "@chakra-ui/react";
import { AxiosError } from "axios";
import { Link, redirect, useFetcher } from "react-router";

export async function clientAction({ request }: Route.ClientActionArgs) {
  const response = await authenticationAxiosInstance
    .postForm("/login", request.formData)
    .catch((error: AxiosError) => {
      // TODO: Should extract this logic into a response handler.
      if (error.response?.status === 401) {
        toaster.error({ description: "Invalid email or password" });
      } else if (error.response?.status === 500) {
        toaster.error({ description: "Server error, please try again later" });
      } else {
        toaster.error({ description: "An unexpected error occurred" });
      }
      console.error("Login error:", error);
      return null;
    });
  redirect("/");
  return null;
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
            <TextField label="Email" name="email" type="email" required />
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
              {fetcher.state !== "idle" ? <Spinner /> : "Login"}
            </Button>
          </Card.Footer>
        </fetcher.Form>
      </Card.Root>
    </Center>
  );
}
