import { execFileSync } from "node:child_process";

const [versionArg] = process.argv.slice(2);

if (!versionArg) {
	console.error("Release version or strategy is required. Example: yarn release -- patch");
	process.exit(1);
}

const run = (command, args) => {
	execFileSync(command, args, { stdio: "inherit" });
};

try {
	run("yarn", ["version", "--immediate", versionArg]);
	run("yarn", ["run", "version"]);

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
