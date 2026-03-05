const { execFileSync } = require("node:child_process");
const https = require("node:https");

function getCredential(username) {
  const input = `protocol=https\nhost=github.com\nusername=${username}\n\n`;
  const output = execFileSync("git", ["credential", "fill"], {
    input,
    encoding: "utf8"
  });

  const fields = {};
  for (const line of output.split(/\r?\n/)) {
    const index = line.indexOf("=");
    if (index === -1) {
      continue;
    }
    const key = line.slice(0, index);
    const value = line.slice(index + 1);
    fields[key] = value;
  }

  if (!fields.password) {
    throw new Error(`No GitHub credential token found for ${username}.`);
  }

  return fields.password;
}

function requestJson({ method, path, token, body }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const request = https.request(
      {
        hostname: "api.github.com",
        path,
        method,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
          "Content-Length": payload ? Buffer.byteLength(payload) : 0,
          "User-Agent": "vision-2020-reminder-codex"
        }
      },
      (response) => {
        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          const parsed = data ? JSON.parse(data) : {};
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(parsed);
            return;
          }

          const error = new Error(parsed.message || `GitHub API error ${response.statusCode}`);
          error.statusCode = response.statusCode;
          error.payload = parsed;
          reject(error);
        });
      }
    );

    request.on("error", reject);
    if (payload) {
      request.write(payload);
    }
    request.end();
  });
}

async function main() {
  const owner = process.argv[2];
  const repo = process.argv[3];
  if (!owner || !repo) {
    throw new Error("Usage: node scripts/create-github-repo.js <owner> <repo>");
  }

  const token = getCredential(owner);

  try {
    const created = await requestJson({
      method: "POST",
      path: "/user/repos",
      token,
      body: {
        name: repo,
        private: false,
        auto_init: false
      }
    });
    console.log(`CREATED ${created.full_name}`);
  } catch (error) {
    if (error.statusCode === 422) {
      console.log("ALREADY_EXISTS_OR_DUPLICATE");
      return;
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
