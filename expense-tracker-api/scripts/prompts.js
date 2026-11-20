import { createInterface } from "node:readline";

export async function promptText(question) {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await terminal.question(question);
  } finally {
    terminal.close();
  }
}

export function promptHidden(question) {
  const { stdin, stdout } = process;
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Run this command in an interactive terminal to enter the admin password securely.");
  }

  return new Promise((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdout.write("\n");
    };
    const onData = (chunk) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Administrator credential setup cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          if (value) {
            value = value.slice(0, -1);
            stdout.write("\b \b");
          }
          continue;
        }
        if (character >= " ") {
          value += character;
          stdout.write("*");
        }
      }
    };

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}
