import { readFileSync } from "node:fs";

const workflowPath = ".github/workflows/publish.yml";
const allowedReleaseAssets = new Set(["main.js", "manifest.json", "styles.css"]);
const workflow = readFileSync(workflowPath, "utf8");
const lines = workflow.split(/\r?\n/);
const errors = [];

if (/\b(?:zip|tar)\b|\.zip\b|\.tar\.gz\b/.test(workflow)) {
	errors.push("Release workflow must not create or upload archive assets.");
}

for (let index = 0; index < lines.length; index++) {
	if (!lines[index].includes("gh release create")) {
		continue;
	}

	let command = lines[index].trim();
	while (command.endsWith("\\") && index + 1 < lines.length) {
		index++;
		command = `${command.slice(0, -1)} ${lines[index].trim()}`;
	}

	const assets = command.match(/\b[\w.-]+\.(?:js|json|css|zip|tar\.gz|tgz)\b/g) ?? [];
	for (const asset of assets) {
		if (!allowedReleaseAssets.has(asset)) {
			errors.push(`Unsupported release asset: ${asset}`);
		}
	}
}

if (errors.length > 0) {
	for (const error of errors) {
		console.error(error);
	}
	process.exit(1);
}
