import { execFileSync } from "node:child_process";

const [versionArg] = process.argv.slice(2).filter(arg => arg !== "--");

if (!versionArg) {
	console.error("Release version or strategy is required. Example: pnpm release -- patch");
	process.exit(1);
}

const run = (command, args) => {
	execFileSync(command, args, { stdio: "inherit" });
};

try {
	run("npm", ["version", "--no-git-tag-version", versionArg]);
	run("pnpm", ["run", "version"]);

	const version = execFileSync("node", ["-p", "require('./package.json').version"], {
		encoding: "utf8",
	}).trim();

	run("git", ["add", "."]);
	run("git", ["commit", "-m", `v${version}`]);
	run("git", ["checkout", "-b", `release/${version}`]);
	run("git", ["push", "origin", `release/${version}`]);
} catch (error) {
	const message = error instanceof Error ? error.message : "Unknown error";
	console.error(`Release failed: ${message}`);
	process.exit(1);
}
