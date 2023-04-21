import {
  Anchor, Button, Center, Checkbox, Divider, Group, LoadingOverlay, Paper, PasswordInput, Stack, Text, TextInput
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";
import React, { useState } from "react";

import { upperFirst, useToggle } from "@mantine/hooks";

import { Error404 } from "tabler-icons-react";

import useUser from "./lib/useUser";

function GoogleIcon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid"
      viewBox="0 0 256 262"
      width={14}
      height={14}
      {...props}
    >
      <path
        fill="#4285F4"
        d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
      />
      <path
        fill="#34A853"
        d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
      />
      <path
        fill="#FBBC05"
        d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
      />
      <path
        fill="#EB4335"
        d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
      />
    </svg>
  );
}

function GoogleButton(props) {
  return (
    <Button
      leftIcon={<GoogleIcon />}
      variant="default"
      color="gray"
      {...props}
    />
  );
}

function AuthenticationForm(props) {
  const [type, toggle] = useToggle(["login", "register"]);
  const { signIn, user, registerUser } = useUser();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
      terms: true,
    },

    validationRules: {
      email: (val) => /^\S+@\S+$/.test(val),
      password: (val) => val.length >= 6,
    },
  });

  function login() {
    setLoading(true);

    signIn(form.values.email, form.values.password)
      .catch((err) => {
        switch (err.code) {
          case "auth/wrong-password":
            showNotification({
              title: "Error",
              color: "red",
              message: "The username or password is incorrect.",
              autoClose: 8000,
              icon: <Error404 />,
            });

            break;
          case "auth/too-many-requests":
            showNotification({
              title: "Error",
              color: "red",
              message:
                "Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.",
              autoClose: 8000,
              icon: <Error404 />,
            });
            break;
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function register() {
    setLoading(true);

    registerUser(form.values.email, form.values.password)
      .then(() => {
        login();
      })
      .catch((err) => {
        switch (err.code) {
          case "auth/email-already-in-use":
            showNotification({
              title: "Error",
              color: "red",
              message: "This email address is already being used",
              autoClose: 8000,
              icon: <Error404 />,
            });

            break;
        }
      })
      .finally((response) => {
        setLoading(false);
      });
  }

  return (
    <Paper shadow="xl" p="md">
      <LoadingOverlay visible={loading} />

      <Text align="center" size="lg" weight={500}>
        Welcome to LauncherKit
      </Text>

      <form
        onSubmit={form.onSubmit(() => {
          if (type == "login") {
            login();
          } else {
            register();
          }
        })}
      >
        <Stack>
          {type === "login" && (
            <>
              <Group grow mt="md">
                <GoogleButton radius="xl">Google</GoogleButton>
              </Group>

              <Divider label="Or continue with email" labelPosition="center" />
            </>
          )}
          <TextInput
            required
            label="Email"
            placeholder="hello@mantine.dev"
            value={form.values.email}
            onChange={(event) =>
              form.setFieldValue("email", event.currentTarget.value)
            }
            error={form.errors.email && "Invalid email"}
          />

          <PasswordInput
            required
            label="Password"
            placeholder="Your password"
            value={form.values.password}
            onChange={(event) =>
              form.setFieldValue("password", event.currentTarget.value)
            }
            error={
              form.errors.password &&
              "Password should include at least 6 characters"
            }
          />

          {type === "register" && (
            <Checkbox
              label="I accept terms and conditions"
              checked={form.values.terms}
              onChange={(event) =>
                form.setFieldValue("terms", event.currentTarget.checked)
              }
            />
          )}

          <Group position="apart">
            <Anchor
              component="button"
              type="button"
              onClick={() => toggle()}
              size="xs"
            >
              {type === "register"
                ? "Already have an account? Login"
                : "Don't have an account? Register"}
            </Anchor>
            <Button type="submit">{upperFirst(type)}</Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}

export default React.memo(function Login() {
  let { isLoading, user } = useUser();
  const [opened, setOpened] = useState(false);

  return (
    <Center style={{ width: "100vw", height: "100vh" }}>
      <AuthenticationForm />
    </Center>
  );
});
