import { readFileSync } from "node:fs";

const workflowPath = ".github/workflows/publish.yml";
const allowedReleaseAssets = new Set(["main.js", "manifest.json", "styles.css"]);
const workflow = readFileSync(workflowPath, "utf8");
const lines = workflow.split(/\r?\n/);
const errors = [];

function indentation(line) {
	return line.match(/^\s*/)?.[0].length ?? 0;
}

function collectRunCommands() {
	const commands = [];

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index];
		const runMatch = line.match(/^(\s*)run:\s*(.*)$/);
		if (!runMatch) {
			continue;
		}

		const runIndent = runMatch[1].length;
		const inlineCommand = runMatch[2].trim();
		if (inlineCommand && inlineCommand !== "|" && inlineCommand !== ">") {
			commands.push(inlineCommand);
			continue;
		}

		const blockLines = [];
		for (index++; index < lines.length; index++) {
			const blockLine = lines[index];
			if (blockLine.trim() && indentation(blockLine) <= runIndent) {
				index--;
				break;
			}

			const strippedLine = blockLine.slice(runIndent + 2);
			if (strippedLine.trim() && !strippedLine.trimStart().startsWith("#")) {
				blockLines.push(strippedLine);
			}
		}

		commands.push(...blockLines);
	}

	return commands;
}

function joinContinuedCommands(commands) {
	const joinedCommands = [];

	for (let index = 0; index < commands.length; index++) {
		let command = commands[index].trim();
		if (!command) {
			continue;
		}

		while (command.endsWith("\\") && index + 1 < commands.length) {
			index++;
			command = `${command.slice(0, -1)} ${commands[index].trim()}`;
		}

		joinedCommands.push(command);
	}

	return joinedCommands;
}

const executableCommands = joinContinuedCommands(collectRunCommands());

for (const command of executableCommands) {
	if (/^(?:zip|tar)\b/.test(command)) {
		errors.push(`Release workflow must not create archive assets: ${command}`);
	}

	if (!command.includes("gh release create")) {
		continue;
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
