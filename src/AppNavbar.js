import { createStyles, Avatar, getStylesRef } from "@mantine/core";
import { NavLink } from "react-router-dom";


const useStyles = createStyles((theme, _params) => {
  const icon = getStylesRef("icon");

  return {
    header: {
      paddingBottom: theme.spacing.md,
      marginBottom: theme.spacing.md * 1.5,
      borderBottom: `1px solid ${theme.colorScheme === "dark"
        ? theme.colors.dark[4]
        : theme.colors.gray[2]
        }`,
    },

    footer: {
      paddingTop: theme.spacing.md,
      marginTop: theme.spacing.md,
      borderTop: `1px solid ${theme.colorScheme === "dark"
        ? theme.colors.dark[4]
        : theme.colors.gray[2]
        }`,
    },

    link: {
      ...theme.fn.focusStyles(),
      display: "flex",
      alignItems: "center",
      textDecoration: "none",
      fontSize: theme.fontSizes.sm,
      color:
        theme.colorScheme === "dark"
          ? theme.colors.dark[1]
          : theme.colors.gray[7],
      padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
      borderRadius: theme.radius.sm,
      fontWeight: 500,

      "&:hover": {
        backgroundColor:
          theme.colorScheme === "dark"
            ? theme.colors.dark[6]
            : theme.colors.gray[0],
        color: theme.colorScheme === "dark" ? theme.white : theme.black,

        [`& .${icon}`]: {
          color: theme.colorScheme === "dark" ? theme.white : theme.black,
        },
      },
    },

    linkIcon: {
      ref: icon,
      color:
        theme.colorScheme === "dark"
          ? theme.colors.dark[2]
          : theme.colors.gray[6],
      marginRight: theme.spacing.sm,
    },

    linkActive: {
      "&, &:hover": {
        backgroundColor:
          theme.colorScheme === "dark"
            ? theme.fn.rgba(theme.colors[theme.primaryColor][8], 0.25)
            : theme.colors[theme.primaryColor][0],
        color:
          theme.colorScheme === "dark"
            ? theme.white
            : theme.colors[theme.primaryColor][7],
        [`& .${icon}`]: {
          color:
            theme.colors[theme.primaryColor][
            theme.colorScheme === "dark" ? 5 : 7
            ],
        },
      },
    },
  };
});

const data = [
  {
    link: "/",
    label: "Odyssey",
    Icon: (props) => {
      return (
        <Avatar
          src="https://1fj7sy3cdkkb3e9z9d2depyl-wpengine.netdna-ssl.com/wp-content/uploads/2022/01/zomfi-logo-no-wordsPNG-e1642658876316.png"
          {...props}
        />
      );
    },
  },
];

function AppNavbar() {
  const { classes, cx } = useStyles();

  const links = data.map((item) => (
    <NavLink
      to={item.link}
      className={({ isActive }) =>
        cx(classes.link, {
          [classes.linkActive]: isActive,
        })
      }
      key={item.link}
    >
      <item.Icon className={classes.linkIcon} />
      <span>{item.label}</span>
    </NavLink>
  ));

  return <div>{links}</div>;
}

export default AppNavbar;
