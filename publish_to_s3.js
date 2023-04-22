const S3 = require("aws-sdk/clients/s3.js");
const path = require("path");
const fs = require("fs");

const s3 = new S3({
  endpoint: "https://622760fa7ecd2be960b140cd1e90baa9.r2.cloudflarestorage.com",
  accessKeyId: "96999ef10637dcf60b05949503ea2ccf",
  secretAccessKey:
    "9519d39266def98aa7767d7db2373e266bb2d7166d7958336b0239aa6c259cf7",
  signatureVersion: "v4",
});

const uploadDir = function (s3Path, bucketName) {
  function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
      var filePath = path.join(currentDirPath, name);
      var stat = fs.statSync(filePath);
      if (stat.isFile()) {
        callback(filePath, stat);
      } else if (stat.isDirectory()) {
        walkSync(filePath, callback);
      }
    });
  }

  walkSync(s3Path, function (filePath, stat) {
    let bucketPath = filePath.substring(s3Path.length);
    let params = {
      Bucket: bucketName,
      Key: `launcher-kit/${bucketPath}`,
      Body: fs.readFileSync(filePath),
    };
    s3.putObject(params, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log(
          "Successfully uploaded " + bucketPath + " to " + bucketName
        );
      }
    });
  });
};

const config = JSON.parse(fs.readFileSync("./src-tauri/tauri.conf.json"));

const latest_json = JSON.stringify({
  version: config.package.version,
  notes: "Latest version",
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: fs.readFileSync(
        `src-tauri\\target\\release\\bundle\\msi\\${config.package.productName}_${config.package.version}_x64_en-US.msi.zip.sig`, 'utf8'
      ),
      url: `https://launcher.golden-helmet.tk/launcher-kit/${config.package.productName}_${config.package.version}_x64_en-US.msi.zip`,
    },
  },
});

uploadDir("src-tauri\\target\\release\\bundle\\msi\\", "launcher");

let params = {
  Bucket: "launcher",
  Key: "launcher-kit/latest.json",
  Body: latest_json,
};

s3.putObject(params, function (err, data) {
  if (err) {
    console.log(err);
  } else {
  }
});
