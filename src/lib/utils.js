import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { Command } from "@tauri-apps/api/shell";
import { fetch } from "@tauri-apps/api/http";
import { appDir } from "@tauri-apps/api/path";

import { fs } from "@tauri-apps/api";

const url = "https://file-service-worker.worlds-embrace.workers.dev";

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

async function downloadWithProgress(url, filename, onProgress) {
  const uid = uuidv4();

  const unlisten = await listen(`__progress__${uid}`, (event) => {
    onProgress && onProgress(event);
  });

  try {
    await invoke("download_file", {
      uid,
      url,
      filename,
    });
  } finally {
    unlisten();
  }
}

function fileExists(path) {
  return invoke("file_exists", {
    path,
  });
}

async function cleanTemp() {
  await invoke("remove_dir", { path: `${await appDir()}temp` }).catch(
    (err) => {}
  );
}

async function diffBuild(folder, gameName, fromVersion, toVersion) {
  await invoke("create_dir", { path: `${await appDir()}temp` }).catch(
    (err) => {}
  );

  const args = [
    "-D",
    "-f",
    `${await appDir()}Games\\${gameName}`,
    `${folder}`,
    `${await appDir()}temp\\PATCH_${fromVersion
      .replace(".", "_")
      .replace(".", "_")}_TO_${toVersion
      .replace(".", "_")
      .replace(".", "_")}.bin`,
  ];

  return await new Promise((resolve, reject) => {
    const ls = Command.sidecar("hdiffz", args);

    ls.stderr.on("data", (data) => {
      console.log(`stderr: ${data.toString()}`);
    });

    ls.on("error", (error) => {
      reject(error);
    });

    ls.on("close", async (code) => {
      resolve(
        `${await appDir()}temp\\PATCH_${fromVersion
          .replace(".", "_")
          .replace(".", "_")}_TO_${toVersion
          .replace(".", "_")
          .replace(".", "_")}.bin`
      );
    });

    ls.spawn();
  });
}

async function hashBuild(folder, onProgress, removeFirstFolder = true) {
  return await new Promise((resolve, reject) => {
    const ls = Command.sidecar("s7za", [
      "h",
      "-scrcsha256",
      "-aoa",
      "-ba",
      "-bsp1",
      `${folder}\\`,
    ]);

    const hashes = {};

    onProgress && onProgress(0);

    ls.stdout.on("data", (data) => {
      data = data.toString();

      let split = data
        .split("\r")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      for (let item of split) {
        let match = item.match(
          /\b(?<!\.)(?!0+(?:\.0+)?%)(?:\d|[1-9]\d|100)(?:(?<!100)\.\d+)?%/
        );

        if (match && match.length > 0) {
          onProgress && onProgress(match[0].replace("%", ""));
        } else {
          match = item.match(/^[A-Fa-f0-9]{64}/);

          if (match) {
            function indexOfFirstDigit(input, start) {
              let i = start;
              for (; input[i] < "0" || input[i] > "9"; i++);
              return i == input.length ? -1 : i;
            }

            function indexOfFirsNontDigit(input, start) {
              let i = start;
              for (; !(input[i] < "0" || input[i] > "9"); i++);
              return i == input.length ? -1 : i;
            }

            let indexOfPath = indexOfFirsNontDigit(
              item,
              indexOfFirstDigit(item, 65)
            );

            let path = item.substring(indexOfPath).trim();

            path = path.replace(/\\/g, "/");

            if (removeFirstFolder) {
              let index = path.indexOf("/");

              if (index > 0) {
                path = path.substring(index + 1);
              }
            }

            let hash = match[0];

            hashes[path] = hash;
          }
        }
      }
    });

    ls.stderr.on("data", (data) => {
      console.log(`stderr: ${data.toString()}`);
    });

    ls.on("error", (error) => {
      reject(error);
    });

    ls.on("close", (code) => {
      resolve(hashes);
    });

    ls.spawn();
  });
}

async function hashGameBuild(gameName, onProgress) {
  return await hashBuild(
    `${await appDir()}Games\\${gameName}`,
    onProgress,
    true
  );
}

async function compressBuild(version, folder, onProgress) {
  await invoke("create_dir", { path: `${await appDir()}temp` }).catch(
    (err) => {}
  );

  let args = [
    "a",
    "-aoa",
    "-bsp1",
    "-v1024m",
    `${await appDir()}temp\\Game_${version
      .replace(".", "_")
      .replace(".", "_")}.7z`,
    `${folder}\\*`,
  ];

  const ls = Command.sidecar("s7za", args);

  return await new Promise((resolve, reject) => {
    onProgress && onProgress(0);

    ls.stdout.on("data", (data) => {
      let match = data
        .toString()
        .match(
          /\b(?<!\.)(?!0+(?:\.0+)?%)(?:\d|[1-9]\d|100)(?:(?<!100)\.\d+)?%/
        );

      if (match && match.length > 0) {
        onProgress && onProgress(match[0].replace("%", ""));
      }
    });

    ls.on("error", (error) => {
      reject(error);
    });

    ls.on("close", async (code) => {
      let result = [];

      let entries = await invoke("file_size_recursive", {
        path: `${await appDir()}temp`,
      });

      for (const entry of Object.keys(entries)) {
        if (!entry.endsWith(".bin")) result.push(entry);
      }

      resolve(result);
    });

    ls.spawn();
  });
}

async function uploadWithProgress(url, filename, onProgress, headers) {
  const uid = uuidv4();

  const unlisten = await listen(`__progress__${uid}`, (event) => {
    onProgress && onProgress(event);
  });

  try {
    await invoke("upload_file", {
      uid,
      url,
      filename: filename,
      headers: headers ?? {},
    });
  } finally {
    unlisten();
  }
}

async function uploadBuild(filename, gameName, onProgress) {
  const { data } = await fetch(
    `https://file-service-worker.worlds-embrace.workers.dev/${gameName}/${filename
      .split(/[\\/]/)
      .pop()}`,
    {
      method: "PUT",
    }
  );

  await uploadWithProgress(
    data.url,
    filename,
    (event) => {
      onProgress &&
        onProgress((event.payload.current / event.payload.total) * 100);
    },
    data.headers
  );
}

async function uploadManifest(
  files,
  gameName,
  version,
  executable,
  hashes,
  sizes,
  from,
  onProgress
) {
  const { data } = await fetch(
    `https://file-service-worker.worlds-embrace.workers.dev/${gameName}/manifest.json`,
    {
      method: "PUT",
    }
  );

  for (let key in from) {
    from[key] = from[key].split(/[\\/]/).pop();
  }

  await fs.writeTextFile(
    `${await appDir()}temp\\manifest.json`,
    JSON.stringify({
      gameName,
      files: files.map((file) => file.split(/[\\/]/).pop()),
      version,
      executable,
      hashes,
      sizes,
      from,
    })
  );

  await uploadWithProgress(
    data.url,
    `${await appDir()}temp\\manifest.json`,
    (event) => {
      onProgress &&
        onProgress((event.payload.current / event.payload.total) * 100);
    },
    data.headers
  );
}

async function downloadBuild(filename, gameName, onProgress) {
  await invoke("create_dir", { path: `${await appDir()}temp` }).catch(
    (err) => {}
  );

  await downloadWithProgress(
    `https://file-service-worker.worlds-embrace.workers.dev/${gameName}/${filename
      .split(/[\\/]/)
      .pop()}`,
    `${await appDir()}temp\\${filename}`,
    (event) => {
      onProgress &&
        onProgress((event.payload.current / event.payload.total) * 100);
    }
  );
}

async function removeBuild(gameName) {
  return await invoke("remove_dir", {
    path: `${await appDir()}Games\\${gameName}`,
  }).catch((err) => {});
}

async function installBuild(gameName, version, onProgress) {
  await removeBuild(gameName);

  await invoke("create_dir", { path: `${await appDir()}Games` }).catch(
    (err) => {}
  );

  return await new Promise(async (resolve, reject) => {
    const args = [
      "x",
      "-aoa",
      "-bsp1",
      `${await appDir()}temp\\Game_${version
        .replace(".", "_")
        .replace(".", "_")}.7z.001`,
      `-o${await appDir()}Games\\${gameName}`,
    ];

    const ls = Command.sidecar("s7za", args);

    onProgress && onProgress(0);

    ls.stdout.on("data", (data) => {
      let match = data
        .toString()
        .match(
          /\b(?<!\.)(?!0+(?:\.0+)?%)(?:\d|[1-9]\d|100)(?:(?<!100)\.\d+)?%/
        );

      if (match && match.length > 0) {
        onProgress && onProgress(match[0].replace("%", ""));
      }
    });

    ls.on("error", (error) => {
      reject(error);
    });

    ls.on("close", (code) => {
      resolve();
    });

    ls.spawn();
  });
}

async function upgradeBuild(gameName, fromVersion, toVersion) {
  await invoke("create_dir", { path: `${await appDir()}temp` }).catch(
    (err) => {}
  );

  const args = [
    "--patch",
    "-f",
    `${await appDir()}Games\\${gameName}`,
    `${await appDir()}temp\\PATCH_${fromVersion
      .replace(".", "_")
      .replace(".", "_")}_TO_${toVersion
      .replace(".", "_")
      .replace(".", "_")}.bin`,
    `.\\Games\\${gameName}`,
  ];

  return await new Promise((resolve, reject) => {
    const ls = Command.sidecar("hdiffz", args);

    ls.stderr.on("data", (data) => {
      console.log(`stderr: ${data.toString()}`);
    });

    ls.on("error", (error) => {
      reject(error);
    });

    ls.on("close", async (code) => {
      resolve();
    });

    ls.spawn();
  });
}

async function openGame(gameName, executable, accessToken, refreshToken) {
  return await invoke("open_game", {
    exe: `${await appDir()}Games\\${gameName}\\${executable}`,
    refreshToken: refreshToken,
    accessToken: accessToken,
  });
}

async function fileSizeBuild(folder) {
  const resultMap = await invoke("file_size_recursive", {
    path: folder,
  });

  folder = folder.replace(/\\/g, "/");

  const result = {};

  for (var key in resultMap) {
    result[key.replace(/\\/g, "/").substring(folder.length + 1)] =
      resultMap[key];
  }

  return result;
}

async function fileSizeGameBuild(gameName) {
  return await fileSizeBuild(`${await appDir()}Games\\${gameName}`);
}

export {
  downloadWithProgress,
  uuidv4,
  fileExists,
  cleanTemp,
  diffBuild,
  hashBuild,
  compressBuild,
  uploadBuild,
  uploadManifest,
  downloadBuild,
  removeBuild,
  installBuild,
  hashGameBuild,
  upgradeBuild,
  openGame,
  fileSizeBuild,
  fileSizeGameBuild,
};
