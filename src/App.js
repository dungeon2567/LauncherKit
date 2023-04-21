import { ActionIcon, Loader, Center } from "@mantine/core";
import { hideNotification, showNotification } from "@mantine/notifications";
import React from "react";
import useUser from "./lib/useUser";
import Login from "./Login";
import Main from "./Main";
import { checkUpdate, installUpdate } from "@tauri-apps/api/updater";
import { relaunch } from "@tauri-apps/api/process";
import { Refresh } from "tabler-icons-react";
import { SWRConfig } from "swr";
import { fetch } from "@tauri-apps/api/http";

function checkForUpdates() {
  return checkUpdate().then((update) => {
    if (update.shouldUpdate) {
      showNotification({
        id: "update-available",
        title: "Update available",
        message: "A new version is available. Click to update.",
        autoClose: false,
        disallowClose: true,
        color: "teal",
        icon: (
          <ActionIcon
            variant="filled"
            color="primary"
            size="lg"
            onClick={() => {
              installUpdate()
                .then(() => {
                  relaunch();
                })
                .catch((err) => {
                  showNotification({
                    id: "update-available",
                    title: "Update available",
                    message: JSON.stringify(err),
                    autoClose: false,
                    disallowClose: true,
                    color: "teal",
                    icon: (
                      <ActionIcon variant="filled" color="primary" size="lg">
                        <Refresh />
                      </ActionIcon>
                    ),
                  });
                });

              hideNotification("update-available");
            }}
          >
            <Refresh />
          </ActionIcon>
        ),
      });
    }
  });
}

function disableMenuAndCheckUpdate() {
  checkForUpdates();

  document.addEventListener("focus", (e) => {
    checkForUpdates();
  });

  document.addEventListener(
    "contextmenu",
    (e) => {
      e.preventDefault();
      return false;
    },
    { capture: true }
  );

  document.addEventListener(
    "selectstart",
    (e) => {
      e.preventDefault();
      return false;
    },
    { capture: true }
  );
}

function App() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <Center style={{ width: "100vw", height: "100vh" }}>
        <Loader size="xl" />
      </Center>
    );
  } else if (!user) {
    return <Login />;
  } else {
    return (
      <SWRConfig
        value={{
          revalidateOnFocus: true,
          revalidateOnReconnect: true,
          fetcher: (resource, init) =>
            fetch(resource, init).then((res) => res.json()),
        }}
      >
        <Main />
      </SWRConfig>
    );
  }
}

disableMenuAndCheckUpdate();

export default React.memo(App);
