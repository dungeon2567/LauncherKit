import React, { useState } from "react";

import useUser from "./lib/useUser";

import { Search } from "tabler-icons-react";

import { Input, NavLink, Indicator, Avatar } from "@mantine/core";

import fuzzysearch from "fuzzysearch";

const friends = [
  {
    id: "1",
    name: "Diego Guedes",
    src: "https://avatars.githubusercontent.com/u/10353856?s=460&u=88394dfd67727327c1f7670a1764dc38a8a24831&v=4",
    favorite: true,
  },
  {
    id: "2",
    name: "Diego Guedes",
    src: "https://avatars.githubusercontent.com/u/10353856?s=460&u=88394dfd67727327c1f7670a1764dc38a8a24831&v=4",
  },
  {
    id: "3",
    name: "Diego Guedes",
    src: "https://avatars.githubusercontent.com/u/10353856?s=460&u=88394dfd67727327c1f7670a1764dc38a8a24831&v=4",
  },
];

function FriendListGroup({ friends, header }) {
  const [opened, setOpened] = useState(true);

  if (friends.length > 0) {
    return (
      <>
        <NavLink
          label={header}
          onClick={() => {
            setOpened(!opened);
          }}
        >
          {friends.map((f) => (
            <NavLink
              label={f.name}
              key={f.id}
              icon={
                <Indicator
                  inline
                  size={16}
                  offset={4}
                  position="bottom-end"
                  color="green"
                  withBorder
                >
                  <Avatar src={f.src} size={32} />
                </Indicator>
              }
            />
          ))}
        </NavLink>
      </>
    );
  } else return <></>;
}

export default React.memo(function FriendList() {
  let { user, loading } = useUser();
  const [query, setQuery] = useState("");

  const favorites = friends.filter((f) => f.favorite);

  return (
    <>
      <Input
        icon={<Search />}
        placeholder="Search"
        size="md"
        mb={20}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </>
  );
});
