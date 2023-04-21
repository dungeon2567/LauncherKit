import {
  ActionIcon, CloseButton,
  createStyles, Group,
  Header, useMantineColorScheme
} from "@mantine/core";

import { MoonStars, Sun } from "tabler-icons-react";
import useUser from "./lib/useUser";

const useStyles = createStyles((theme) => ({
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: "100%",
  },
}));

export default function AppHeader() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { classes, cx } = useStyles();
  const { signIn, user, registerUser } = useUser();

  return (
    <Header height={50} className={classes.header} p="xs">
      <Group spacing={10} grow></Group>
      <Group spacing={10} position="right" grow>
        <ActionIcon
          onClick={() => toggleColorScheme()}
          size="lg"
          sx={(theme) => ({
            backgroundColor:
              theme.colorScheme === "dark"
                ? theme.colors.dark[6]
                : theme.colors.gray[0],
            color:
              theme.colorScheme === "dark"
                ? theme.colors.yellow[4]
                : theme.colors.blue[6],
          })}
        >
          {colorScheme === "dark" ? <Sun size={18} /> : <MoonStars size={18} />}
        </ActionIcon>
        <CloseButton
          onClick={() => {
            
          }}
        />
      </Group>
    </Header>
  );
}
