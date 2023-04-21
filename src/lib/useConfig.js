import { atom, selector, useRecoilState, useRecoilValue } from "recoil";

const configState = atom({
  key: "config",
  default: JSON.parse(localStorage.getItem("Zomfi") || "{}"),
});

const gameNameState = atom({
  key: "gameName",
  default: "Zomfi",
});

export default function useConfig() {
  const [gameName, setGameName] = useRecoilState(gameNameState);
  const [config, setConfig] = useRecoilState(configState);

  function mergeConfig(value) {
    const config = {
      ...JSON.parse(localStorage.getItem(gameName) || "{}"),
      ...value,
    };

    localStorage.setItem(gameName, JSON.stringify(config));

    setConfig(config);

    return config;
  }

  return {
    gameName,
    config,
    mergeConfig,
  };
}
